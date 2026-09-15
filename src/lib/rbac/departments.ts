// Departments mapped to the 14 demonstration postings.
// Request rows carry a human-facing department label; canonicalDepartment()
// maps those labels back to a DepartmentId for scope isolation checks.

export type DepartmentId =
  | "ADMINISTRATION"
  | "OPERATING"
  | "ENGINEERING"
  | "MECHANICAL"
  | "ELECTRICAL"
  | "SIGNAL_AND_TELECOMMUNICATION"
  | "DIVISIONAL_ADMINISTRATION";

export type OrganizationalLevel = "ZONAL" | "DIVISIONAL";

export const ZONE_NAME = "Southern Railway";
export const DIVISION_NAME = "Madurai Division";

export const DEPARTMENT_DISPLAY: Record<DepartmentId, string> = {
  ADMINISTRATION: "Administration",
  OPERATING: "Operating Department",
  ENGINEERING: "Engineering Department",
  MECHANICAL: "Mechanical Department",
  ELECTRICAL: "Electrical Department",
  SIGNAL_AND_TELECOMMUNICATION: "Signal & Telecommunication Department",
  DIVISIONAL_ADMINISTRATION: "Divisional Administration",
};

// Human-facing labels used on request rows for each technical department.
export const DEPARTMENT_REQUEST_LABEL: Record<DepartmentId, string> = {
  ADMINISTRATION: "Administration",
  OPERATING: "Operating",
  ENGINEERING: "Track",
  MECHANICAL: "Mechanical",
  ELECTRICAL: "Electrical",
  SIGNAL_AND_TELECOMMUNICATION: "Signalling",
  DIVISIONAL_ADMINISTRATION: "Administration",
};

export function requestLabelToDepartmentId(label: string): DepartmentId | null {
  const normalized = String(label ?? "").trim().toLowerCase();
  for (const dept of Object.keys(DEPARTMENT_REQUEST_LABEL) as DepartmentId[]) {
    if (DEPARTMENT_REQUEST_LABEL[dept].toLowerCase() === normalized) return dept;
  }
  if (normalized === "civil" || normalized === "bridge") return "ENGINEERING";
  if (normalized === "s&t" || normalized === "signal") return "SIGNAL_AND_TELECOMMUNICATION";
  return null;
}

export function canonicalRequestDepartment(value: string): DepartmentId | null {
  if (!value) return null;
  const upper = String(value).trim().toUpperCase();
  if (upper in DEPARTMENT_REQUEST_LABEL) return upper as DepartmentId;
  return requestLabelToDepartmentId(value);
}

export const TECHNICAL_DEPARTMENTS: ReadonlySet<DepartmentId> = new Set<DepartmentId>([
  "ENGINEERING",
  "MECHANICAL",
  "ELECTRICAL",
  "SIGNAL_AND_TELECOMMUNICATION",
]);