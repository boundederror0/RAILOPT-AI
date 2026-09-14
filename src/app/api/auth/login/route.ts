import { DEMO_USERS } from "@/lib/rbac";
import { ok, fail, parseJson } from "@/lib/server-utils";
import { setSessionCookie } from "@/lib/auth/server-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await parseJson<{ userId?: unknown }>(req);
  if (!body || typeof body.userId !== "string" || body.userId.trim() === "") {
    return fail("userId is required.", 400);
  }

  const user = DEMO_USERS.find((u) => u.id === body.userId);
  if (!user) {
    return fail("Unknown demo user.", 401);
  }

  const response = ok({ user });
  return setSessionCookie(response, user.id);
}