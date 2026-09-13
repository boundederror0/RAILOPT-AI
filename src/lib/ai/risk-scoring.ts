import type { Asset } from "../types";
import { riskCategory } from "../utils";
import { daysBetween, toDate } from "../time";

export interface RiskFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface RiskAnalysisResult {
  assetId: string;
  assetName: string;
  assetType: string;
  section: string;
  location: string;
  riskScore: number;
  riskCategory: string;
  confidence: number;
  factors: RiskFactor[];
  recommendedAction: string;
  model: string;
  inputs: Record<string, number | string>;
  estimatedMaintenanceHours: number;
  requiredResources: string[];
  affectedTrains: string[];
  createdAt: string;
}

export interface RiskService {
  analyzeAsset(asset: Asset): RiskAnalysisResult;
  score(asset: Asset): { score: number; category: string; confidence: number; factors: RiskFactor[] };
}

const WEIGHTS = {
  condition: 0.26,
  age: 0.16,
  failureFrequency: 0.22,
  maintenanceGap: 0.16,
  usageIntensity: 0.1,
  incidents: 0.06,
  backlog: 0.04,
};

const CONDITION_SCORE: Record<string, number> = {
  Critical: 100,
  Poor: 80,
  Fair: 55,
  Good: 25,
  Excellent: 10,
};

export class DeterministicRiskService implements RiskService {
  analyzeAsset(asset: Asset): RiskAnalysisResult {
    const { score, category, confidence, factors } = this.score(asset);
    const now = new Date();
    const lastMaint = toDate(asset.lastMaintenanceDate);
    const daysSince = Math.max(0, daysBetween(lastMaint, now));

    const recommendedAction =
      score >= 80
        ? "Schedule immediate maintenance within 24h and place asset under close watch."
        : score >= 60
          ? "Schedule priority maintenance within 7 days and assign monitoring."
          : score >= 40
            ? "Schedule preventive maintenance in the next planning cycle."
            : "Continue routine inspection; no immediate action required.";

    const resources = this.resourcesFor(asset);
    return {
      assetId: asset.id,
      assetName: asset.name,
      assetType: asset.type,
      section: asset.section,
      location: asset.location,
      riskScore: score,
      riskCategory: category,
      confidence,
      factors,
      recommendedAction,
      model: "DeterministicRiskScoring v1",
      inputs: {
        "Asset age (years)": asset.ageYears,
        "Failure frequency (annual)": asset.failureFrequency,
        "Days since last maintenance": daysSince,
        "Current condition": asset.condition,
        "Usage intensity": `${asset.usageIntensity}%`,
        "Historical incidents": asset.incidents,
        "Maintenance backlog": asset.maintenanceBacklog,
      },
      estimatedMaintenanceHours: 4 + Math.round((score / 100) * 14),
      requiredResources: resources,
      affectedTrains: [],
      createdAt: now.toISOString(),
    };
  }

  score(asset: Asset): { score: number; category: string; confidence: number; factors: RiskFactor[] } {
    const now = new Date();
    const lastMaint = toDate(asset.lastMaintenanceDate);
    const daysSince = Math.max(0, daysBetween(lastMaint, now));

    const norm = (v: number, min: number, max: number) =>
      Math.min(1, Math.max(0, (v - min) / (max - min)));

    const components: { label: string; raw: number; weight: number }[] = [
      { label: "Current condition", raw: CONDITION_SCORE[asset.condition] ?? 50, weight: WEIGHTS.condition },
      { label: "Asset age", raw: norm(asset.ageYears, 5, 30) * 100, weight: WEIGHTS.age },
      { label: "Failure frequency", raw: norm(asset.failureFrequency, 0, 8) * 100, weight: WEIGHTS.failureFrequency },
      { label: "Time since last maintenance", raw: norm(daysSince, 30, 1095) * 100, weight: WEIGHTS.maintenanceGap },
      { label: "Usage intensity", raw: norm(asset.usageIntensity, 20, 100) * 100, weight: WEIGHTS.usageIntensity },
      { label: "Historical incidents", raw: norm(asset.incidents, 0, 6) * 100, weight: WEIGHTS.incidents },
      { label: "Maintenance backlog", raw: norm(asset.maintenanceBacklog, 0, 3) * 100, weight: WEIGHTS.backlog },
    ];

    const score = Math.round(
      components.reduce((acc, c) => acc + c.raw * c.weight, 0) + (asset.condition === "Critical" ? 4 : 0)
    );
    const clamped = Math.min(100, Math.max(0, score));

    const factors: RiskFactor[] = components
      .map((c) => {
        const contribution = c.raw * c.weight;
        return {
          factor: c.label,
          impact: Math.round(contribution * 10) / 10,
          description: this.describe(c.label, c.raw, asset),
        };
      })
      .sort((a, b) => b.impact - a.impact);

    const completeness = [
      asset.ageYears > 0,
      asset.lastMaintenanceDate !== "",
      asset.failureFrequency >= 0,
      asset.condition !== null,
      asset.incidents >= 0,
    ].filter(Boolean).length;
    const confidence = Math.round(((completeness / 5) * 0.85 + 0.08) * 100);

    return { score: clamped, category: riskCategory(clamped), confidence, factors };
  }

  private describe(label: string, raw: number, asset: Asset): string {
    switch (label) {
      case "Current condition":
        return `${asset.condition} condition rating across last 3 inspections.`;
      case "Asset age":
        return `${asset.ageYears} years in service, beyond nominal life for this class.`;
      case "Failure frequency":
        return `${asset.failureFrequency} failures recorded in the past 12 months.`;
      case "Time since last maintenance":
        return `Last maintained ${toDate(asset.lastMaintenanceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`;
      case "Usage intensity":
        return `Asset sees ${asset.usageIntensity}% of available operating usage — heavy load profile.`;
      case "Historical incidents":
        return `${asset.incidents} related incidents logged in asset history.`;
      case "Maintenance backlog":
        return `${asset.maintenanceBacklog} pending job cards against this asset.`;
      default:
        return label;
    }
  }

  private resourcesFor(asset: Asset): string[] {
    switch (asset.type) {
      case "Traction Substation":
        return ["Traction crew (4)", "Isolating transformer", "HV test kit"];
      case "Bridge":
        return ["Bridge unit (8)", "Crane access", "NDT equipment"];
      case "Track Circuit":
        return ["S&T gang (4)", "Track bonding kit", "DMM"];
      case "Signal":
      case "Point Machine":
        return ["S&T technician (2)", "Spare contact unit"];
      case "OHE Mast":
        return ["Traction crew (3)", "Insulated platform", "Stag-away kit"];
      default:
        return ["Maintenance gang (4)", "Work vehicle"];
    }
  }
}

export const riskService: RiskService = new DeterministicRiskService();