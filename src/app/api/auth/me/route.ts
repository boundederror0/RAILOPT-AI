import { ok } from "@/lib/server-utils";
import { requireAuth } from "@/lib/auth/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = requireAuth();
  if ("error" in auth) return auth.error;
  return ok({ user: auth.user });
}