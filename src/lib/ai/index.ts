import type { BlockPlan } from "../types";

export { riskService, type RiskService, type RiskAnalysisResult } from "./risk-scoring";
export {
  blockOptimizer,
  DeterministicBlockOptimizer,
  type OptimizerParams,
  type OptimizationResult,
} from "./block-optimizer";
export {
  analyzeBlockImpact,
  severityOf,
  type BlockImpactAnalysis,
  type TrainImpact,
  type DelaySeverity,
} from "./train-impact";
export {
  emergencyReplanService,
  incidentTypeFor,
  type EmergencyRecommendation,
} from "./emergency-replan";
export { getAnalytics, type AnalyticsData } from "./analytics";

export interface DashboardAggregates {
  activeMaintenanceRequests: number;
  assetsUnderMaintenance: number;
  blocksPlannedToday: number;
  trainsAffected: number;
  averageDelayRisk: number;
  assetAvailability: number;
  scheduledPlan?: BlockPlan;
}

export async function aggregateDashboard(): Promise<DashboardAggregates> {
  const { getStore } = await import("../store");
  const store = getStore();
  const requests = store.getRequests();
  const assets = store.getAssets();
  const blocks = store.getBlocks();
  const plans = store.getPlans();

  const activeMaintenanceRequests = requests.filter(
    (r) => r.status !== "Completed" && r.status !== "Cancelled" && r.status !== "Rejected"
  ).length;
  const assetsUnderMaintenance = blocks.filter(
    (b) => b.status === "Approved" || b.status === "Active"
  ).length;
  const now = new Date();
  const blocksPlannedToday = blocks.filter((b) => {
    const d = new Date(b.startTime);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }).length;
  const trainsAffected = new Set(blocks.flatMap((b) => b.affectedTrainIds)).size;
  const avgRisk = requests.length
    ? Math.round(requests.reduce((s, r) => s + r.riskScore, 0) / requests.length)
    : 0;
  const degraded = assets.filter(
    (a) => a.condition === "Critical" || a.condition === "Poor"
  ).length;
  const assetAvailability = Math.round(100 - (degraded / assets.length) * 100);

  return {
    activeMaintenanceRequests,
    assetsUnderMaintenance,
    blocksPlannedToday,
    trainsAffected,
    averageDelayRisk: avgRisk,
    assetAvailability,
    scheduledPlan: plans[0],
  };
}