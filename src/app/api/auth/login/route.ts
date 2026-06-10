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
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/auth/login
 */
export const POST = withApiWrapper(async (req: Request) => {
  const locale = resolveRequestLocale(req);
  const ip = clientIp(req);

  if (!allowRate(`login:${ip}`, 30, 60_000)) {
    return jsonError(
      ErrorCode.RATE_LIMITED,
      tApiMessage(locale, "rateLimited"),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  let body: LoginRequestBody;
  try {
    body = (await req.json()) as LoginRequestBody;
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidJson"),
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
      tApiMessage(locale, "captchaRequired"),
      HttpStatus.BAD_REQUEST,
    );
  }
  if (captchaResult === "invalid") {
    return jsonError(
      ErrorCode.CAPTCHA_INVALID,
      tApiMessage(locale, "captchaInvalid"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!isValidEmail(email)) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidEmail"),
      HttpStatus.BAD_REQUEST,
    );
  }
  const lockRemainMs = getLoginLockRemainingMs(email, ip);
  if (lockRemainMs > 0) {
    const remainMinutes = Math.ceil(lockRemainMs / 60_000);
    return jsonError(
      ErrorCode.RATE_LIMITED,
      tApiMessage(locale, "authLoginLocked", { minutes: remainMinutes }),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  if (!password) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.passwordRequired"),
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
      tApiMessage(locale, "authInvalidCredentials"),
      HttpStatus.BAD_REQUEST,
    );
  }

  if (user.status !== "active") {
    return jsonError(
      ErrorCode.AUTH_ACCOUNT_DISABLED,
      tApiMessage(locale, "authAccountDisabled"),
      HttpStatus.FORBIDDEN,
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    recordLoginFailure(email, ip);
    return jsonError(
      ErrorCode.AUTH_INVALID_CREDENTIALS,
      tApiMessage(locale, "authInvalidCredentials"),
      HttpStatus.BAD_REQUEST,
    );
  }
  clearLoginFailures(email, ip);

  const setCookie = await createUserSession(user.id, req);
  const redirectUrl = safeRedirectUrl(body.redirect ?? undefined, req);

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
});
