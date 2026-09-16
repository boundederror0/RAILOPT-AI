import type { Permission } from "./permissions";

export type RoleProfileId =
  | "ZONE_ADMIN_OVERSIGHT"
  | "ZONE_OPERATIONS"
  | "ZONE_ENGINEERING"
  | "ZONE_MECHANICAL"
  | "ZONE_ELECTRICAL"
  | "ZONE_ST"
  | "DIVISION_ADMINISTRATION"
  | "DIVISION_OPERATIONS"
  | "DIVISION_ENGINEERING"
  | "DIVISION_MECHANICAL"
  | "DIVISION_ELECTRICAL"
  | "DIVISION_ST";

export interface RoleProfile {
  id: RoleProfileId;
  displayName: string;
  description: string;
  permissions: Permission[];
}

export const ROLE_PROFILES: Record<RoleProfileId, RoleProfile> = {
  ZONE_ADMIN_OVERSIGHT: {
    id: "ZONE_ADMIN_OVERSIGHT",
    displayName: "Zone Administrator (Oversight)",
    description:
      "General Manager — view-only oversight across the zone with final approval authority on recommendations. No execution or technical editing rights.",
    permissions: [
      "dashboard.view",
      "requests.track",
      "maintenance.view",
      "ai_analysis.view",
      "optimizer.view",
      "train_impact.view",
      "simulation.view",
      "simulation.run",
      "live_operations.view",
      "emergency.view",
      "approvals.view",
      "approvals.approve",
      "analytics.view",
      "historical.view",
      "settings.view",
      "requests.track",
    ],
  },
  ZONE_OPERATIONS: {
    id: "ZONE_OPERATIONS",
    displayName: "Zonal Operations",
    description:
      "Principal Chief Operations Manager — broad operational command including running the optimizer, recommending emergency replans and approval decisions, and coordinating live operations. No technical editing.",
    permissions: [
      "dashboard.view",
      "requests.track",
      "maintenance.view",
      "ai_analysis.view",
      "ai_analysis.run",
      "optimizer.view",
      "optimizer.run",
      "optimizer.recommend",
      "train_impact.view",
      "simulation.view",
      "simulation.run",
      "live_operations.view",
      "live_operations.monitor",
      "live_operations.coordinate",
      "emergency.view",
      "emergency.create",
      "emergency.recommend",
      "approvals.view",
      "approvals.recommend",
      "analytics.view",
      "historical.view",
      "settings.view",
      "requests.track",
    ],
  },
  ZONE_ENGINEERING: {
    id: "ZONE_ENGINEERING",
    displayName: "Zonal Engineering Oversight",
    description:
      "Principal Chief Engineer — view-only oversight of the zonal engineering footprint. No editing, running or approval rights.",
    permissions: [
      "dashboard.view",
      "requests.track",
      "maintenance.view",
      "ai_analysis.view",
      "optimizer.view",
      "train_impact.view",
      "simulation.view",
      "live_operations.view",
      "emergency.view",
      "approvals.view",
      "analytics.view",
      "historical.view",
      "settings.view",
      "requests.track",
    ],
  },
  ZONE_MECHANICAL: {
    id: "ZONE_MECHANICAL",
    displayName: "Zonal Mechanical Oversight",
    description:
      "Principal Chief Mechanical Engineer — view-only oversight of the zonal mechanical footprint. No editing, running or approval rights.",
    permissions: [
      "dashboard.view",
      "requests.track",
      "maintenance.view",
      "ai_analysis.view",
      "optimizer.view",
      "train_impact.view",
      "simulation.view",
      "live_operations.view",
      "emergency.view",
      "approvals.view",
      "analytics.view",
      "historical.view",
      "settings.view",
      "requests.track",
    ],
  },
  ZONE_ELECTRICAL: {
    id: "ZONE_ELECTRICAL",
    displayName: "Zonal Electrical Oversight",
    description:
      "Principal Chief Electrical Engineer — view-only oversight of the zonal electrical footprint. No editing, running or approval rights.",
    permissions: [
      "dashboard.view",
      "requests.track",
      "maintenance.view",
      "ai_analysis.view",
      "optimizer.view",
      "train_impact.view",
      "simulation.view",
      "live_operations.view",
      "emergency.view",
      "approvals.view",
      "analytics.view",
      "historical.view",
      "settings.view",
      "requests.track",
    ],
  },
  ZONE_ST: {
    id: "ZONE_ST",
    displayName: "Zonal Signal & Telecom Oversight",
    description:
      "Principal Chief Signal & Telecom Engineer — view-only oversight of the zonal S&T footprint. No editing, running or approval rights.",
    permissions: [
      "dashboard.view",
      "requests.track",
      "maintenance.view",
      "ai_analysis.view",
      "optimizer.view",
      "train_impact.view",
      "simulation.view",
      "live_operations.view",
      "emergency.view",
      "approvals.view",
      "analytics.view",
      "historical.view",
      "settings.view",
      "requests.track",
    ],
  },
  DIVISION_ADMINISTRATION: {
    id: "DIVISION_ADMINISTRATION",
    displayName: "Divisional Administration",
    description:
      "Divisional Railway Manager — cross-department visibility of the division with approval authority. No technical editing or execution rights.",
    permissions: [
      "dashboard.view",
      "requests.track",
      "maintenance.view",
      "optimizer.view",
      "train_impact.view",
      "simulation.view",
      "live_operations.view",
      "emergency.view",
      "approvals.view",
      "approvals.approve",
      "analytics.view",
      "historical.view",
      "settings.view",
      "requests.track",
    ],
  },
  DIVISION_OPERATIONS: {
    id: "DIVISION_OPERATIONS",
    displayName: "Divisional Operations",
    description:
      "Senior Divisional Operations Manager — operational command of the division including eliminating emergency replans, running the optimizer and coordinating live operations.",
    permissions: [
      "dashboard.view",
      "requests.track",
      "maintenance.view",
      "maintenance.create",
      "ai_analysis.view",
      "ai_analysis.run",
      "optimizer.view",
      "optimizer.run",
      "optimizer.recommend",
      "train_impact.view",
      "simulation.view",
      "simulation.run",
      "live_operations.view",
      "live_operations.monitor",
      "live_operations.coordinate",
      "emergency.view",
      "emergency.create",
      "emergency.recommend",
      "approvals.view",
      "approvals.recommend",
      "analytics.view",
      "historical.view",
      "settings.view",
      "requests.track",
    ],
  },
  DIVISION_ENGINEERING: {
    id: "DIVISION_ENGINEERING",
    displayName: "Divisional Engineering",
    description:
      "Senior Divisional Engineer / Divisional Engineer (Track) — raises, submits and edits Track (Civil) maintenance requests within the division and views the supporting AI modules.",
    permissions: [
      "dashboard.view",
      "requests.track",
      "maintenance.view",
      "maintenance.create",
      "maintenance.edit",
      "maintenance.submit",
      "ai_analysis.view",
      "optimizer.view",
      "train_impact.view",
      "simulation.view",
      "live_operations.view",
      "emergency.view",
      "approvals.view",
      "analytics.view",
      "historical.view",
      "settings.view",
      "requests.track",
    ],
  },
  DIVISION_MECHANICAL: {
    id: "DIVISION_MECHANICAL",
    displayName: "Divisional Mechanical",
    description:
      "Senior Divisional Mechanical Engineer — raises, submits and edits Mechanical maintenance requests within the division and views the supporting AI modules.",
    permissions: [
      "dashboard.view",
      "requests.track",
      "maintenance.view",
      "maintenance.create",
      "maintenance.edit",
      "maintenance.submit",
      "ai_analysis.view",
      "optimizer.view",
      "train_impact.view",
      "simulation.view",
      "live_operations.view",
      "emergency.view",
      "approvals.view",
      "analytics.view",
      "historical.view",
      "settings.view",
      "requests.track",
    ],
  },
  DIVISION_ELECTRICAL: {
    id: "DIVISION_ELECTRICAL",
    displayName: "Divisional Electrical",
    description:
      "Senior Divisional Electrical Engineer — raises, submits and edits Electrical maintenance requests within the division and views the supporting AI modules.",
    permissions: [
      "dashboard.view",
      "requests.track",
      "maintenance.view",
      "maintenance.create",
      "maintenance.edit",
      "maintenance.submit",
      "ai_analysis.view",
      "optimizer.view",
      "train_impact.view",
      "simulation.view",
      "live_operations.view",
      "emergency.view",
      "approvals.view",
      "analytics.view",
      "historical.view",
      "settings.view",
      "requests.track",
    ],
  },
  DIVISION_ST: {
    id: "DIVISION_ST",
    displayName: "Divisional Signal & Telecom",
    description:
      "Senior Divisional Signal & Telecom Engineer — raises, submits and edits Signalling (S&T) maintenance requests within the division and views the supporting AI modules.",
    permissions: [
      "dashboard.view",
      "requests.track",
      "maintenance.view",
      "maintenance.create",
      "maintenance.edit",
      "maintenance.submit",
      "ai_analysis.view",
      "optimizer.view",
      "train_impact.view",
      "simulation.view",
      "live_operations.view",
      "emergency.view",
      "approvals.view",
      "analytics.view",
      "historical.view",
      "settings.view",
      "requests.track",
    ],
  },
};

export function getRoleProfile(profileId: RoleProfileId): RoleProfile {
  return ROLE_PROFILES[profileId];
}