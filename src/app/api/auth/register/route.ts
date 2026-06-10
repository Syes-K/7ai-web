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
  allowRate,
  clientIp,
} from "@/common/utils";
import { createUserSession } from "@/server/auth/session-lifecycle";
import { verifyCaptchaChallenge } from "@/server/auth/verify-captcha";
import { toPublicUser } from "@/server/auth/user-dto";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session-user";
import { isAdminEmail } from "@/server/auth/admin";

export const runtime = "nodejs";

/**
 * POST /api/auth/register
 */
export const POST = withApiWrapper(async (req: Request) => {
  const locale = resolveRequestLocale(req);

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(locale, "authAdminLoginRequired"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  if (!isAdminEmail(currentUser.email)) {
    return jsonError(
      ErrorCode.FORBIDDEN,
      tApiMessage(locale, "authAdminOnly"),
      HttpStatus.FORBIDDEN,
    );
  }

  if (!allowRate(`register:${clientIp(req)}`, 20, 60_000)) {
    return jsonError(
      ErrorCode.RATE_LIMITED,
      tApiMessage(locale, "rateLimited"),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  let body: RegisterRequestBody;
  try {
    body = (await req.json()) as RegisterRequestBody;
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
  const passwordConfirm = body.passwordConfirm ?? "";
  const nickName = body.nickName ?? "";

  if (!isValidEmail(email)) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidEmail"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const nickErr = validateNickName(nickName);
  if (nickErr) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.nickNameLength"),
      HttpStatus.BAD_REQUEST,
    );
  }

  // 内联密码策略校验，返回 i18n key 对应译文（validatePasswordPolicy 仍供控制台 API 使用）
  if (password.length < 8) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.passwordMinLength"),
      HttpStatus.BAD_REQUEST,
    );
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.passwordNeedsLetterAndNumber"),
      HttpStatus.BAD_REQUEST,
    );
  }
  if (password.toLowerCase() === email) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.passwordSameAsEmail"),
      HttpStatus.BAD_REQUEST,
    );
  }

  if (password !== passwordConfirm) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.passwordMismatch"),
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
        tApiMessage(locale, "validation.telNoInvalid"),
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
      tApiMessage(locale, "authEmailTaken"),
      HttpStatus.BAD_REQUEST,
    );
  }

  if (telNo) {
    const telTaken = await userRepo.findOne({ where: { telNo } });
    if (telTaken) {
      return jsonError(
        ErrorCode.AUTH_TEL_TAKEN,
        tApiMessage(locale, "authTelTaken"),
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

  const setCookie = await createUserSession(user.id, req);
  const redirectUrl = safeRedirectUrl(body.redirect ?? undefined, req);

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
