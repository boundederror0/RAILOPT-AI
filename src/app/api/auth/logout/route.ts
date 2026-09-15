import { cookies } from "next/headers";
import { ok } from "@/lib/server-utils";
import { AUTH_COOKIE } from "@/lib/auth/auth-config";
import { clearSessionCookie, revokeSession } from "@/lib/auth/server-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (token) {
    revokeSession(token);
  }
  const response = ok({ ok: true });
  return clearSessionCookie(response);
}