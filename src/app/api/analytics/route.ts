import { getStore } from "@/lib/store";
import { ok } from "@/lib/server-utils";
import { getAnalytics } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range");
  const normalized = range === "30d" || range === "90d" ? range : "7d";

  const data = getAnalytics(normalized);
  const store = getStore();
  data.assets = store.getAssets();
  data.requests = store.getRequests();
  data.blocks = store.getBlocks();

  const openCount = store.getRequests().filter((r) => r.status === "Open").length;
  data.backlog = [
    { month: "Jul", open: 12, closed: 7 },
    { month: "Aug", open: 11, closed: 9 },
    { month: "Sep", open: openCount, closed: 4 },
  ];

  return ok(data);
}