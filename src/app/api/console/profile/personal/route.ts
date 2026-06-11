import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { isValidTelNo, validateNickName } from "@/common/utils/validation";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";
import { withApiWrapper } from "@/server/http/with-api-wrapper";

export const runtime = "nodejs";

type PatchBody = {
  email?: unknown;
  nickName?: unknown;
  telNo?: unknown;
};

/**
 * PATCH：更新昵称、手机号；禁止修改邮箱；校验错误经 tApiMessage 双语。
 */
export const PATCH = withApiWrapper(async (request: Request) => {
  const locale = resolveRequestLocale(request);
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(
      ErrorCode.UNAUTHORIZED,
      tApiMessage(locale, "unauthorized"),
      HttpStatus.UNAUTHORIZED,
    );
  }
  const { user } = reqCtx;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidJson"),
      HttpStatus.BAD_REQUEST,
    );
  }

  if (body.email !== undefined) {
    const emailMsg = tApiMessage(locale, "validation.emailImmutable");
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      emailMsg,
      HttpStatus.BAD_REQUEST,
      [{ field: "email", message: emailMsg }],
    );
  }

  const hasNick = Object.prototype.hasOwnProperty.call(body, "nickName");
  const hasTel = Object.prototype.hasOwnProperty.call(body, "telNo");
  if (!hasNick && !hasTel) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.profileFieldRequired"),
      HttpStatus.BAD_REQUEST,
    );
  }

  const details: JsonErrorDetail[] = [];

  const ds = await getDataSource();
  const userRepo = ds.getRepository(User);
  const row = await userRepo.findOne({ where: { id: user.id } });
  if (!row) {
    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      tApiMessage(locale, "userNotFound"),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  if (hasNick) {
    if (typeof body.nickName !== "string") {
      details.push({
        field: "nickName",
        message: tApiMessage(locale, "validation.stringRequired"),
      });
    } else {
      const nickErr = validateNickName(body.nickName);
      if (nickErr) {
        details.push({
          field: "nickName",
          message: tApiMessage(locale, "validation.nickNameLength"),
        });
      } else {
        row.nickName = body.nickName.trim();
      }
    }
  }

  if (hasTel) {
    const v = body.telNo;
    if (v === null) {
      row.telNo = null;
    } else if (typeof v !== "string") {
      details.push({
        field: "telNo",
        message: tApiMessage(locale, "validation.stringOrNull"),
      });
    } else {
      const t = v.trim();
      if (t === "") {
        row.telNo = null;
      } else if (!isValidTelNo(t)) {
        details.push({
          field: "telNo",
          message: tApiMessage(locale, "validation.telNoInvalid"),
        });
      } else {
        const taken = await userRepo.findOne({ where: { telNo: t } });
        if (taken && taken.id !== user.id) {
          return jsonError(
            ErrorCode.AUTH_TEL_TAKEN,
            tApiMessage(locale, "authTelTaken"),
            HttpStatus.BAD_REQUEST,
          );
        }
        row.telNo = t;
      }
    }
  }

  if (details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidParams"),
      HttpStatus.UNPROCESSABLE_ENTITY,
      details,
    );
  }

  await userRepo.save(row);

  return NextResponse.json(
    {
      profile: {
        email: row.email,
        nickName: row.nickName,
        telNo: row.telNo,
      },
    },
    { headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
});
