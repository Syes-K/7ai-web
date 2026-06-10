import { NextResponse } from "next/server";
import { getDataSource } from "@/server/db/data-source";
import { CaptchaChallenge } from "@/server/db/entities/CaptchaChallenge";
import {
  buildCaptchaSvgDataUri,
  generateCaptchaText,
} from "@/server/auth/captcha-image";
import { hashCaptchaAnswer, randomCaptchaId } from "@/server/auth/captcha-crypto";
import {
  allowRate,
  clientIp,
} from "@/common/utils";
import { CAPTCHA_TTL_MS } from "@/common/constants";
import { jsonError } from "@/server/http/json-response";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";

export const runtime = "nodejs";

/**
 * GET /api/auth/captcha — 签发图形验证码（JSON + Base64 SVG）
 */
export const GET = withApiWrapper(async (req: Request) => {
  const locale = resolveRequestLocale(req);

  if (!allowRate(`captcha:${clientIp(req)}`, 60, 60_000)) {
    return jsonError(
      ErrorCode.RATE_LIMITED,
      tApiMessage(locale, "rateLimited"),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  const text = generateCaptchaText(5);
  const imageBase64 = buildCaptchaSvgDataUri(text);

  const captchaId = randomCaptchaId();
  const answerHash = hashCaptchaAnswer(text);
  const expiresAt = new Date(Date.now() + CAPTCHA_TTL_MS);

  const ds = await getDataSource();
  await ds.getRepository(CaptchaChallenge).save(
    ds.getRepository(CaptchaChallenge).create({
      id: captchaId,
      answerHash,
      expiresAt,
      consumedAt: null,
    }),
  );

  return NextResponse.json(
    { captchaId, imageBase64 },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
