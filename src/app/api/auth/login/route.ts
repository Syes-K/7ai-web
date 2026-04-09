import type { LoginRequestBody } from "@/common/types";
import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";
import { verifyPassword } from "@/server/auth/password";
import { safeRedirectUrl, isValidEmail, allowRate, clientIp } from "@/common/utils";
import { createUserSession } from "@/server/auth/session-lifecycle";
import { verifyCaptchaChallenge } from "@/server/auth/verify-captcha";
import {
  clearLoginFailures,
  getLoginLockRemainingMs,
  recordLoginFailure,
} from "@/server/auth/login-fail-lock";
import { toPublicUser } from "@/server/auth/user-dto";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GENERIC_LOGIN_FAIL = "邮箱或密码错误，请检查后重试";

/**
 * POST /api/auth/login
 */
export async function POST(req: Request) {
  const ip = clientIp(req);

  if (!allowRate(`login:${ip}`, 30, 60_000)) {
    return jsonError(
      ErrorCode.RATE_LIMITED,
      "请求过于频繁，请稍后再试",
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  let body: LoginRequestBody;
  try {
    body = (await req.json()) as LoginRequestBody;
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "请求体须为 JSON",
      HttpStatus.BAD_REQUEST,
    );
  }

  const captchaResult = await verifyCaptchaChallenge(
    body.captchaId,
    body.captcha,
  );
  if (captchaResult === "missing") {
    return jsonError(
      ErrorCode.CAPTCHA_REQUIRED,
      "请完成图形验证码",
      HttpStatus.BAD_REQUEST,
    );
  }
  if (captchaResult === "invalid") {
    return jsonError(
      ErrorCode.CAPTCHA_INVALID,
      "验证码错误或已过期，请刷新后重试",
      HttpStatus.BAD_REQUEST,
    );
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!isValidEmail(email)) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "请输入有效邮箱",
      HttpStatus.BAD_REQUEST,
    );
  }
  const lockRemainMs = getLoginLockRemainingMs(email, ip);
  if (lockRemainMs > 0) {
    const remainMinutes = Math.ceil(lockRemainMs / 60_000);
    return jsonError(
      ErrorCode.RATE_LIMITED,
      `登录失败次数过多，请 ${remainMinutes} 分钟后再试`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  if (!password) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "请输入密码",
      HttpStatus.BAD_REQUEST,
    );
  }

  const ds = await getDataSource();
  const userRepo = ds.getRepository(User);
  const user = await userRepo.findOne({ where: { email } });

  if (!user) {
    recordLoginFailure(email, ip);
    return jsonError(
      ErrorCode.AUTH_INVALID_CREDENTIALS,
      GENERIC_LOGIN_FAIL,
      HttpStatus.BAD_REQUEST,
    );
  }

  if (user.status !== "active") {
    return jsonError(
      ErrorCode.AUTH_ACCOUNT_DISABLED,
      "账号不可用，请联系管理员",
      HttpStatus.FORBIDDEN,
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    recordLoginFailure(email, ip);
    return jsonError(
      ErrorCode.AUTH_INVALID_CREDENTIALS,
      GENERIC_LOGIN_FAIL,
      HttpStatus.BAD_REQUEST,
    );
  }
  clearLoginFailures(email, ip);

  const setCookie = await createUserSession(user.id);
  const redirectUrl = safeRedirectUrl(body.redirect ?? undefined, req.url);

  return NextResponse.json(
    {
      ok: true,
      user: toPublicUser(user),
      redirectUrl,
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": setCookie,
      },
    },
  );
}
