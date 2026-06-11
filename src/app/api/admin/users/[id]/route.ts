import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus, UserStatus } from "@/common/enums";
import { jsonError } from "@/server/http/json-response";
import { withAdminApi } from "@/server/auth/with-admin-api";
import { withApiWrapper } from "@/server/http/with-api-wrapper";
import { getDataSource } from "@/server/db/data-source";
import { User } from "@/server/db/entities/User";
import { userToAdminRow } from "@/server/user-admin/map-to-dto";
import { resolveRequestLocale } from "@/server/i18n/resolve-request-locale";
import { tApiMessage } from "@/server/i18n/t-api-message";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set<string>([
  UserStatus.Active,
  UserStatus.Disabled,
]);

type PatchBody = {
  status?: unknown;
  readOnly?: unknown;
};

/**
 * PATCH：变更用户 status（启用/停用）或 readOnly；错误 message 随 locale 双语。
 */
export const PATCH = withApiWrapper([withAdminApi], async (admin, request, ctx) => {
  const locale = resolveRequestLocale(request);
  const { id } = await ctx.params;
  const userId = Array.isArray(id) ? id[0] : id;
  if (!userId || typeof userId !== "string") {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidId"),
      HttpStatus.BAD_REQUEST,
    );
  }

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

  const status = body.status;
  const readOnly = body.readOnly;
  const hasStatus = status !== undefined;
  const hasReadOnly = readOnly !== undefined;

  if (!hasStatus && !hasReadOnly) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.atLeastOneUpdateField"),
      HttpStatus.BAD_REQUEST,
    );
  }

  if (hasStatus && (typeof status !== "string" || !ALLOWED_STATUS.has(status))) {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.invalidUserStatus"),
      HttpStatus.BAD_REQUEST,
    );
  }
  if (hasReadOnly && typeof readOnly !== "boolean") {
    return jsonError(
      ErrorCode.VALIDATION_ERROR,
      tApiMessage(locale, "validation.readOnlyMustBeBoolean"),
      HttpStatus.BAD_REQUEST,
    );
  }

  if (admin.id === userId) {
    return jsonError(
      ErrorCode.FORBIDDEN,
      tApiMessage(locale, "admin.cannotChangeOwnStatus"),
      HttpStatus.FORBIDDEN,
    );
  }

  const ds = await getDataSource();
  const repo = ds.getRepository(User);
  const target = await repo.findOne({ where: { id: userId } });
  if (!target) {
    return jsonError(
      ErrorCode.USER_NOT_FOUND,
      tApiMessage(locale, "userNotFound"),
      HttpStatus.NOT_FOUND,
    );
  }

  const operatorEmail = admin.email.trim().toLowerCase();
  if (hasStatus) {
    target.status = status as string;
  }
  if (hasReadOnly) {
    target.readOnly = readOnly as boolean;
  }
  await repo.save(target);

  console.info(
    JSON.stringify({
      module: "admin.users",
      action: "patch_status",
      operator: operatorEmail,
      targetUserId: userId,
      newStatus: hasStatus ? status : undefined,
      newReadOnly: hasReadOnly ? readOnly : undefined,
    }),
  );

  return NextResponse.json(userToAdminRow(target), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
});
