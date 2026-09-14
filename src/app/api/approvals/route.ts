import { getStore } from "@/lib/store";
import { ok } from "@/lib/server-utils";
import { requirePermission } from "@/lib/auth/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = requirePermission("approval.view");
  if ("error" in guard) return guard.error;
  const store = getStore();
  return ok({ approvals: store.getApprovals() });
}