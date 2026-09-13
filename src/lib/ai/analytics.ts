import type { Asset, Block, MaintenanceRequest } from "../types";
import { SYSTEM_DATE } from "../seed";

export interface AnalyticsData {
  availabilityTrend: { date: string; availability: number }[];
  completionRate: { month: string; completion: number; newRequests: number }[];
  avgDelay: { date: string; delay: number }[];
  blockUtilization: { name: string; value: number }[];
  criticalAssetCount: { category: string; count: number }[];
  disruptionTrend: { date: string; trains: number; cancelled: number }[];
  backlog: { month: string; open: number; closed: number }[];
  riskDistribution: { name: string; value: number }[];
  assets: Asset[];
  requests: MaintenanceRequest[];
  blocks: Block[];
}

export function getAnalytics(range: "7d" | "30d" | "90d"): AnalyticsData {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(SYSTEM_DATE);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const seed = (i: number) => {
    const x = Math.sin(i * 1.7) * 0.5 + Math.cos(i * 0.6) * 0.3;
    return x;
  };

  const availabilityTrend = dates.map((d, i) => ({
    date: d.slice(5),
    availability: Math.round(90 + seed(i) * 4 + (i % 3 === 0 ? 2 : 0)),
  }));

  const avgDelay = dates.map((d, i) => ({
    date: d.slice(5),
    delay: Math.round(8 + Math.abs(seed(i + 2)) * 14),
  }));

  const disruptionTrend = dates.map((d, i) => ({
    date: d.slice(5),
    trains: Math.round(3 + Math.abs(seed(i + 4)) * 6),
    cancelled: Math.round(Math.abs(seed(i + 5)) * 1.4),
  }));

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  const completionRate = months.map((m, i) => ({
    month: m,
    completion: Math.round(62 + seed(i) * 16 + i * 1.4),
    newRequests: Math.round(18 + Math.abs(seed(i + 1)) * 10),
  }));

  const backlog = months.map((m, i) => ({
    month: m,
    open: 8 + Math.floor(Math.abs(seed(i + 3)) * 8),
    closed: 6 + Math.floor(Math.abs(seed(i + 4)) * 9),
  }));

  const blockUtilization = [
    { name: "Utilised", value: 78 },
    { name: "Idle windows", value: 22 },
  ];

  const criticalAssetCount = [
    { category: "Track Circuit", count: 4 },
    { category: "Signal", count: 3 },
    { category: "Point Machine", count: 2 },
    { category: "Bridge", count: 2 },
    { category: "OHE / TSS", count: 3 },
  ];

  const riskDistribution = [
    { name: "Minimal", value: 6 },
    { name: "Low", value: 9 },
    { name: "Medium", value: 11 },
    { name: "High", value: 7 },
    { name: "Critical", value: 5 },
  ];

  return {
    availabilityTrend,
    completionRate,
    avgDelay,
    blockUtilization,
    criticalAssetCount,
    disruptionTrend,
    backlog,
    riskDistribution,
    assets: [],
    requests: [],
    blocks: [],
  };
}