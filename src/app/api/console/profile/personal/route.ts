import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";
import { isValidTelNo, validateNickName } from "@/common/utils/validation";
import { jsonError, type JsonErrorDetail } from "@/server/http/json-response";
import { getRequestUserContext } from "@/server/auth/request-user-context";
import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";

export const runtime = "nodejs";

type PatchBody = {
  email?: unknown;
  nickName?: unknown;
  telNo?: unknown;
};

/**
 * PATCH：更新昵称、手机号；禁止修改邮箱。
 */
export async function PATCH(request: Request) {
  const reqCtx = await getRequestUserContext();
  if (!reqCtx) {
    return jsonError(ErrorCode.UNAUTHORIZED, "未登录", HttpStatus.UNAUTHORIZED);
  }
  const { user } = reqCtx;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonError(ErrorCode.VALIDATION_ERROR, "请求体须为 JSON", HttpStatus.BAD_REQUEST);
  }

  if (body.email !== undefined) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "不允许通过本接口修改邮箱",
      HttpStatus.BAD_REQUEST,
      [{ field: "email", message: "邮箱不可修改" }],
    );
  }

  const hasNick = Object.prototype.hasOwnProperty.call(body, "nickName");
  const hasTel = Object.prototype.hasOwnProperty.call(body, "telNo");
  if (!hasNick && !hasTel) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "请至少提供 nickName 或 telNo 之一",
      HttpStatus.BAD_REQUEST,
    );
  }

  const details: JsonErrorDetail[] = [];

  const ds = await getDataSource();
  const userRepo = ds.getRepository(User);
  const row = await userRepo.findOne({ where: { id: user.id } });
  if (!row) {
    return jsonError(ErrorCode.INTERNAL_ERROR, "用户不存在", HttpStatus.INTERNAL_SERVER_ERROR);
  }

  if (hasNick) {
    if (typeof body.nickName !== "string") {
      details.push({ field: "nickName", message: "须为字符串" });
    } else {
      const nickErr = validateNickName(body.nickName);
      if (nickErr) {
        details.push({ field: "nickName", message: nickErr });
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
      details.push({ field: "telNo", message: "须为字符串或 null" });
    } else {
      const t = v.trim();
      if (t === "") {
        row.telNo = null;
      } else if (!isValidTelNo(t)) {
        details.push({ field: "telNo", message: "手机号须为 11 位数字" });
      } else {
        const taken = await userRepo.findOne({ where: { telNo: t } });
        if (taken && taken.id !== user.id) {
          return jsonError(ErrorCode.AUTH_TEL_TAKEN, "该手机号已被占用", HttpStatus.BAD_REQUEST);
        }
        row.telNo = t;
      }
    }
  }

  if (details.length > 0) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      "请求参数不合法",
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
}
