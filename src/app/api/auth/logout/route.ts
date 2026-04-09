import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/common/constants";
import {
  clearSessionCookieHeader,
  destroySession,
} from "@/server/auth/session-lifecycle";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/auth/logout
 */
export async function POST() {
  const cookieStore = await cookies();
  const sid = cookieStore.get(SESSION_COOKIE)?.value;
  await destroySession(sid);

  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": clearSessionCookieHeader(),
      },
    },
  );
}
