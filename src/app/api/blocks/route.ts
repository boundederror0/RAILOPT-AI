import { getStore } from "@/lib/store";
import { ok } from "@/lib/server-utils";
import { requireAnyPermission } from "@/lib/auth/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = requireAnyPermission([
    "dashboard.view",
    "train-impact.view",
    "optimizer.view",
    "live-operations.view",
    "simulation.view",
  ]);
  if ("error" in guard) return guard.error;
  const store = getStore();
  return ok({ blocks: store.getBlocks(), plans: store.getPlans() });
}