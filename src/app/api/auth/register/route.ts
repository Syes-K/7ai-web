import type { RegisterRequestBody } from "@/common/types";
import { randomUUID } from "crypto";
import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";
import { hashPassword } from "@/server/auth/password";
import {
  safeRedirectUrl,
  isValidEmail,
  isValidTelNo,
  validateNickName,
  validatePasswordPolicy,
  allowRate,
  clientIp,
} from "@/common/utils";
import { createUserSession } from "@/server/auth/session-lifecycle";
import { verifyCaptchaChallenge } from "@/server/auth/verify-captcha";
import { toPublicUser } from "@/server/auth/user-dto";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/auth/register
 */
export const POST = withApiWrapper(async (req: Request) => {
  if (!allowRate(`register:${clientIp(req)}`, 20, 60_000)) {
    return jsonError(
      ErrorCode.RATE_LIMITED,
      "请求过于频繁，请稍后再试",
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  let body: RegisterRequestBody;
  try {
    body = (await req.json()) as RegisterRequestBody;
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
  const passwordConfirm = body.passwordConfirm ?? "";
  const nickName = body.nickName ?? "";

  if (!isValidEmail(email)) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "请输入有效邮箱",
      HttpStatus.BAD_REQUEST,
    );
  }

  const nickErr = validateNickName(nickName);
  if (nickErr) {
    return jsonError(ErrorCode.VALIDATION_ERROR, nickErr, HttpStatus.BAD_REQUEST);
  }

  const pwdErr = validatePasswordPolicy(password, email);
  if (pwdErr) {
    return jsonError(ErrorCode.VALIDATION_ERROR, pwdErr, HttpStatus.BAD_REQUEST);
  }

  if (password !== passwordConfirm) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "两次密码不一致",
      HttpStatus.BAD_REQUEST,
    );
  }

  let telNo: string | null = null;
  const rawTel = body.telNo;
  if (rawTel != null && String(rawTel).trim() !== "") {
    const t = String(rawTel).trim();
    if (!isValidTelNo(t)) {
      return jsonError(
        ErrorCode.VALIDATION_ERROR,
        "手机号须为 11 位数字",
        HttpStatus.BAD_REQUEST,
      );
    }
    telNo = t;
  }

  const ds = await getDataSource();
  const userRepo = ds.getRepository(User);

  const emailTaken = await userRepo.findOne({ where: { email } });
  if (emailTaken) {
    return jsonError(
      ErrorCode.AUTH_EMAIL_TAKEN,
      "该邮箱已注册，请直接登录",
      HttpStatus.BAD_REQUEST,
    );
  }

  if (telNo) {
    const telTaken = await userRepo.findOne({ where: { telNo } });
    if (telTaken) {
      return jsonError(
        ErrorCode.AUTH_TEL_TAKEN,
        "该手机号已被占用",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  const passwordHash = await hashPassword(password);
  const user = userRepo.create({
    id: randomUUID(),
    email,
    telNo,
    passwordHash,
    nickName: nickName.trim(),
    status: "active",
  });
  await userRepo.save(user);

  const setCookie = await createUserSession(user.id);
  const redirectUrl = safeRedirectUrl(body.redirect ?? undefined, req.url);

  return NextResponse.json(
    {
      ok: true,
      user: toPublicUser(user),
      redirectUrl,
    },
    {
      status: 201,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": setCookie,
      },
    },
  );
});
