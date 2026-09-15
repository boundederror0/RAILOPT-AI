import type { Permission } from "./permissions";
import type { DepartmentId, OrganizationalLevel } from "./departments";
import { DEPARTMENT_DISPLAY, DIVISION_NAME, ZONE_NAME } from "./departments";
import type { RoleProfileId } from "./role-profiles";
import { ROLE_PROFILES } from "./role-profiles";

export interface Posting {
  /** Stable id used for login and the session token. */
  id: string;
  /** Short human key, e.g. "SENIOR_DOM". */
  key: string;
  /** Short label shown in the login dropdown, e.g. "Sr. DOM". */
  shortName: string;
  /** Full official title, e.g. "Senior Divisional Operations Manager". */
  title: string;
  organizationalLevel: OrganizationalLevel;
  department: DepartmentId;
  zone: string;
  division: string | null;
  scope: string;
  roleProfileId: RoleProfileId;
  /** Explicit permission override. When absent the role profile's permissions apply. */
  permissions?: Permission[];
}

export interface User {
  id: string;
  /** Full non-personal identity, e.g. "Senior Divisional Operations Manager (Sr. DOM)". */
  name: string;
  /** Human department label. */
  designation: string;
  /** Role profile id. */
  role: RoleProfileId;
  postingId: string;
  postingKey: string;
  shortName: string;
  title: string;
  organizationalLevel: OrganizationalLevel;
  department: DepartmentId;
  zone: string;
  division: string | null;
  scope: string;
  roleProfileId: RoleProfileId;
  permissions: Permission[];
}

export function postingScope(posting: Pick<Posting, "organizationalLevel">): string {
  return posting.organizationalLevel === "ZONAL" ? ZONE_NAME : `${ZONE_NAME} / ${DIVISION_NAME}`;
}

export function postingToUser(posting: Posting): User {
  const profile = ROLE_PROFILES[posting.roleProfileId];
  return {
    id: posting.id,
    name: `${posting.title} (${posting.shortName})`,
    designation: DEPARTMENT_DISPLAY[posting.department],
    role: posting.roleProfileId,
    postingId: posting.id,
    postingKey: posting.key,
    shortName: posting.shortName,
    title: posting.title,
    organizationalLevel: posting.organizationalLevel,
    department: posting.department,
    zone: posting.zone,
    division: posting.division,
    scope: posting.scope,
    roleProfileId: posting.roleProfileId,
    permissions: posting.permissions ?? profile.permissions,
  };
}

// --- Posting catalog -------------------------------------------------------

export const POSTINGS: Posting[] = [
  {
    id: "GM",
    key: "GENERAL_MANAGER",
    shortName: "GM",
    title: "General Manager",
    organizationalLevel: "ZONAL",
    department: "ADMINISTRATION",
    zone: ZONE_NAME,
    division: null,
    scope: postingScope({ organizationalLevel: "ZONAL" }),
    roleProfileId: "ZONE_ADMIN_OVERSIGHT",
  },
  {
    id: "PCOM",
    key: "PRINCIPAL_CHIEF_OPERATIONS_MANAGER",
    shortName: "PCOM",
    title: "Principal Chief Operations Manager",
    organizationalLevel: "ZONAL",
    department: "OPERATING",
    zone: ZONE_NAME,
    division: null,
    scope: postingScope({ organizationalLevel: "ZONAL" }),
    roleProfileId: "ZONE_OPERATIONS",
  },
  {
    id: "PCE",
    key: "PRINCIPAL_CHIEF_ENGINEER",
    shortName: "PCE",
    title: "Principal Chief Engineer",
    organizationalLevel: "ZONAL",
    department: "ENGINEERING",
    zone: ZONE_NAME,
    division: null,
    scope: postingScope({ organizationalLevel: "ZONAL" }),
    roleProfileId: "ZONE_ENGINEERING",
  },
  {
    id: "PCME",
    key: "PRINCIPAL_CHIEF_MECHANICAL_ENGINEER",
    shortName: "PCME",
    title: "Principal Chief Mechanical Engineer",
    organizationalLevel: "ZONAL",
    department: "MECHANICAL",
    zone: ZONE_NAME,
    division: null,
    scope: postingScope({ organizationalLevel: "ZONAL" }),
    roleProfileId: "ZONE_MECHANICAL",
  },
  {
    id: "PCEE",
    key: "PRINCIPAL_CHIEF_ELECTRICAL_ENGINEER",
    shortName: "PCEE",
    title: "Principal Chief Electrical Engineer",
    organizationalLevel: "ZONAL",
    department: "ELECTRICAL",
    zone: ZONE_NAME,
    division: null,
    scope: postingScope({ organizationalLevel: "ZONAL" }),
    roleProfileId: "ZONE_ELECTRICAL",
  },
  {
    id: "PCSTE",
    key: "PRINCIPAL_CHIEF_ST_ENGINEER",
    shortName: "PCSTE",
    title: "Principal Chief Signal & Telecom Engineer",
    organizationalLevel: "ZONAL",
    department: "SIGNAL_AND_TELECOMMUNICATION",
    zone: ZONE_NAME,
    division: null,
    scope: postingScope({ organizationalLevel: "ZONAL" }),
    roleProfileId: "ZONE_ST",
  },
  {
    id: "DRM",
    key: "DIVISIONAL_RAILWAY_MANAGER",
    shortName: "DRM",
    title: "Divisional Railway Manager",
    organizationalLevel: "DIVISIONAL",
    department: "DIVISIONAL_ADMINISTRATION",
    zone: ZONE_NAME,
    division: DIVISION_NAME,
    scope: postingScope({ organizationalLevel: "DIVISIONAL" }),
    roleProfileId: "DIVISION_ADMINISTRATION",
  },
  {
    id: "SR_DOM",
    key: "SENIOR_DIVISIONAL_OPERATIONS_MANAGER",
    shortName: "Sr. DOM",
    title: "Senior Divisional Operations Manager",
    organizationalLevel: "DIVISIONAL",
    department: "OPERATING",
    zone: ZONE_NAME,
    division: DIVISION_NAME,
    scope: postingScope({ organizationalLevel: "DIVISIONAL" }),
    roleProfileId: "DIVISION_OPERATIONS",
  },
  {
    id: "DOM",
    key: "DIVISIONAL_OPERATIONS_MANAGER",
    shortName: "DOM",
    title: "Divisional Operations Manager",
    organizationalLevel: "DIVISIONAL",
    department: "OPERATING",
    zone: ZONE_NAME,
    division: DIVISION_NAME,
    scope: postingScope({ organizationalLevel: "DIVISIONAL" }),
    roleProfileId: "DIVISION_OPERATIONS",
    permissions: [
      "dashboard.view",
      "maintenance.view",
      "maintenance.create",
      "ai_analysis.view",
      "optimizer.view",
      "optimizer.recommend",
      "train_impact.view",
      "simulation.view",
      "live_operations.view",
      "live_operations.monitor",
      "emergency.view",
      "emergency.create",
      "approvals.view",
      "requests.track",
      "analytics.view",
      "historical.view",
      "settings.view",
    ],
  },
  {
    id: "SR_DEN",
    key: "SENIOR_DIVISIONAL_ENGINEER",
    shortName: "Sr. DEN",
    title: "Senior Divisional Engineer",
    organizationalLevel: "DIVISIONAL",
    department: "ENGINEERING",
    zone: ZONE_NAME,
    division: DIVISION_NAME,
    scope: postingScope({ organizationalLevel: "DIVISIONAL" }),
    roleProfileId: "DIVISION_ENGINEERING",
  },
  {
    id: "DEN",
    key: "DIVISIONAL_ENGINEER",
    shortName: "DEN",
    title: "Divisional Engineer",
    organizationalLevel: "DIVISIONAL",
    department: "ENGINEERING",
    zone: ZONE_NAME,
    division: DIVISION_NAME,
    scope: postingScope({ organizationalLevel: "DIVISIONAL" }),
    roleProfileId: "DIVISION_ENGINEERING",
  },
  {
    id: "SR_DME",
    key: "SENIOR_DIVISIONAL_MECHANICAL_ENGINEER",
    shortName: "Sr. DME",
    title: "Senior Divisional Mechanical Engineer",
    organizationalLevel: "DIVISIONAL",
    department: "MECHANICAL",
    zone: ZONE_NAME,
    division: DIVISION_NAME,
    scope: postingScope({ organizationalLevel: "DIVISIONAL" }),
    roleProfileId: "DIVISION_MECHANICAL",
  },
  {
    id: "SR_DEE",
    key: "SENIOR_DIVISIONAL_ELECTRICAL_ENGINEER",
    shortName: "Sr. DEE",
    title: "Senior Divisional Electrical Engineer",
    organizationalLevel: "DIVISIONAL",
    department: "ELECTRICAL",
    zone: ZONE_NAME,
    division: DIVISION_NAME,
    scope: postingScope({ organizationalLevel: "DIVISIONAL" }),
    roleProfileId: "DIVISION_ELECTRICAL",
  },
  {
    id: "SR_DSTE",
    key: "SENIOR_DIVISIONAL_ST_ENGINEER",
    shortName: "Sr. DSTE",
    title: "Senior Divisional Signal & Telecom Engineer",
    organizationalLevel: "DIVISIONAL",
    department: "SIGNAL_AND_TELECOMMUNICATION",
    zone: ZONE_NAME,
    division: DIVISION_NAME,
    scope: postingScope({ organizationalLevel: "DIVISIONAL" }),
    roleProfileId: "DIVISION_ST",
  },
];

export function getPosting(id: string): Posting | null {
  return POSTINGS.find((p) => p.id === id) ?? null;
}

export function getUserPermissions(user: User): Permission[] {
  return user.permissions;
}