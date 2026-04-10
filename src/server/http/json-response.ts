import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";

/** 可选字段级校验信息，供管理端表单高亮（如 PUT 提示词配置）。 */
export type JsonErrorDetail = { field: string; message: string };

export function jsonError(
  code: ErrorCode,
  message: string,
  status: HttpStatus,
  details?: JsonErrorDetail[],
): NextResponse {
  const error: { code: ErrorCode; message: string; details?: JsonErrorDetail[] } = {
    code,
    message,
  };
  if (details?.length) {
    error.details = details;
  }
  return NextResponse.json(
    { error },
    {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
}
