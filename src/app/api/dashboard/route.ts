import { getStore } from "@/lib/store";
import { ok } from "@/lib/server-utils";
import { requirePermission } from "@/lib/auth/server-auth";
import { aggregateDashboard } from "@/lib/ai";
import type { DashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = requirePermission("dashboard.view");
  if ("error" in guard) return guard.error;
  const store = getStore();
  const agg = await aggregateDashboard();
  const assets = store.getAssets();
  const requests = store.getRequests();
  const blocks = store.getBlocks();

  const recentRequests = [...requests]
    .sort((a, b) => b.requestedDate.localeCompare(a.requestedDate))
    .slice(0, 6);

  const assetHealthOverview = ["Excellent", "Good", "Fair", "Poor", "Critical"].map((c) => ({
    name: c,
    count: assets.filter((a) => a.condition === c).length,
    color:
      c === "Critical"
        ? "#ef4444"
        : c === "Poor"
          ? "#f97316"
          : c === "Fair"
            ? "#f59e0b"
            : c === "Good"
              ? "#22c55e"
              : "#3b82f6",
  }));

  const priorityCounts = ["Critical", "High", "Medium", "Low"].map((p) => ({
    name: p,
    value: requests.filter((r) => r.priority === p).length,
    color:
      p === "Critical"
        ? "#ef4444"
        : p === "High"
          ? "#f97316"
          : p === "Medium"
            ? "#f59e0b"
            : "#3b82f6",
  }));

  const trainDelayTrend = (() => {
    const byDate = new Map<string, { delay: number; onTime: number; sortKey: string }>();
    for (const b of blocks) {
      const d = new Date(b.startTime);
      const key = `${d.getDate()} ${d.toLocaleString("en-US", { month: "short" })}`;
      const entry = byDate.get(key) ?? { delay: 0, onTime: 0, sortKey: d.toISOString().slice(0, 10) };
      entry.delay += b.expectedDelay;
      if (b.expectedDelay === 0) entry.onTime += 1;
      byDate.set(key, entry);
    }
    const sorted = Array.from(byDate.entries())
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
      .map(([date, { delay, onTime }]) => ({ date, delay, onTime }));
    if (sorted.length === 0) {
      return [
        { date: "Today", delay: 0, onTime: 0 },
      ];
    }
    return sorted.slice(-7);
  })();

  const incidents = store.getIncidents();
  const criticalAlerts = incidents
    .filter((inc) => inc.status !== "Resolved")
    .sort((a, b) => {
      const order: Record<string, number> = { Critical: 0, High: 1, Moderate: 2, Low: 3 };
      return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
    })
    .slice(0, 5)
    .map((inc) => ({
      id: inc.id,
      message: `${inc.type} — ${inc.location} (${inc.section})`,
      severity: inc.severity,
      time: new Date(inc.detectedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }));

  const activeCount = blocks.filter((b) => b.status === "Active").length;
  const approvedCount = blocks.filter((b) => b.status === "Approved").length;
  const proposedCount = blocks.filter((b) => b.status === "Proposed").length;

  const systemHealth = [
    { component: "Risk Scoring Engine", status: "Healthy", uptime: "99.98%" },
    { component: "Block Optimizer", status: "Healthy", uptime: "99.95%" },
    { component: "Train Impact Model", status: "Healthy", uptime: "99.91%" },
    { component: "Emergency Replanner", status: "Healthy", uptime: "99.88%" },
    { component: "Simulation Engine", status: "Healthy", uptime: "99.93%" },
  ];

  const data: DashboardData = {
    activeMaintenanceRequests: agg.activeMaintenanceRequests,
    assetsUnderMaintenance: agg.assetsUnderMaintenance,
    blocksPlannedToday: agg.blocksPlannedToday,
    trainsAffected: agg.trainsAffected,
    averageDelayRisk: agg.averageDelayRisk,
    assetAvailability: agg.assetAvailability,
    assetHealthOverview,
    priorityDistribution: priorityCounts,
    trainDelayTrend,
    recentRequests,
    criticalAlerts,
    systemHealth,
  };

  return ok({
    ...data,
    blockStatusBreakdown: { active: activeCount, approved: approvedCount, proposed: proposedCount },
  });
}