import { getStore } from "@/lib/store";
import { ok } from "@/lib/server-utils";
import { requirePermission } from "@/lib/auth/server-auth";
import { getAnalytics } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = requirePermission("analytics.view");
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range");
  const normalized = range === "30d" || range === "90d" ? range : "7d";

  const data = getAnalytics(normalized);
  const store = getStore();
  data.assets = store.getAssets();
  data.requests = store.getRequests();
  data.blocks = store.getBlocks();

  const allRequests = store.getRequests();
  const months = ["Jul", "Aug", "Sep"];
  const monthIndex: Record<string, number> = { Jul: 6, Aug: 7, Sep: 8 };
  data.backlog = months.map((m) => {
    const mi = monthIndex[m];
    const inMonth = allRequests.filter((r) => {
      const d = new Date(r.requestedDate);
      return d.getMonth() === mi;
    });
    const open = inMonth.filter((r) => r.status !== "Completed" && r.status !== "Cancelled").length;
    const closed = inMonth.filter((r) => r.status === "Completed" || r.status === "Cancelled").length;
    return { month: m, open, closed };
  });

  return ok(data);
}