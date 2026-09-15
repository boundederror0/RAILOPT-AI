import { getStore } from "@/lib/store";
import { ok } from "@/lib/server-utils";
import { requireAnyPermission } from "@/lib/auth/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = requireAnyPermission(["emergency.view", "live_operations.view"]);
  if ("error" in guard) return guard.error;
  const store = getStore();
  return ok({ incidents: store.getIncidents() });
}