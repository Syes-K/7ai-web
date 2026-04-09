import { NextResponse } from "next/server";
import { ErrorCode, HttpStatus } from "@/common/enums";

export function jsonError(
  code: ErrorCode,
  message: string,
  status: HttpStatus,
): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    },
  );
}
