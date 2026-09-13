import { getStore } from "@/lib/store";
import { ok } from "@/lib/server-utils";
import { aggregateDashboard } from "@/lib/ai";
import type { DashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
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

  const trainDelayTrend = [
    { date: "06 Sep", delay: 14, onTime: 9 },
    { date: "07 Sep", delay: 18, onTime: 8 },
    { date: "08 Sep", delay: 12, onTime: 10 },
    { date: "09 Sep", delay: 21, onTime: 7 },
    { date: "10 Sep", delay: 16, onTime: 9 },
    { date: "11 Sep", delay: 11, onTime: 11 },
    { date: "Today", delay: 22, onTime: 8 },
  ];

  const criticalAlerts = [
    {
      id: "1",
      message: "Track circuit TC-01/12.4 km failing intermittently — Madurai–Melur",
      severity: "Critical",
      time: "05:12",
    },
    {
      id: "2",
      message: "Point machine PM-33/34B detection failure — Tiruchirappalli",
      severity: "High",
      time: "06:45",
    },
    {
      id: "3",
      message: "LC-72 warning gong intermittent — Mandapam",
      severity: "Moderate",
      time: "07:30",
    },
  ];

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