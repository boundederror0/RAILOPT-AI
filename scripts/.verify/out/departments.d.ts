export type DepartmentId = "ADMINISTRATION" | "OPERATING" | "ENGINEERING" | "MECHANICAL" | "ELECTRICAL" | "SIGNAL_AND_TELECOMMUNICATION" | "DIVISIONAL_ADMINISTRATION";
export type OrganizationalLevel = "ZONAL" | "DIVISIONAL";
export declare const ZONE_NAME = "Southern Railway";
export declare const DIVISION_NAME = "Madurai Division";
export declare const DEPARTMENT_DISPLAY: Record<DepartmentId, string>;
export declare const DEPARTMENT_REQUEST_LABEL: Record<DepartmentId, string>;
export declare function requestLabelToDepartmentId(label: string): DepartmentId | null;
export declare function canonicalRequestDepartment(value: string): DepartmentId | null;
export declare const TECHNICAL_DEPARTMENTS: ReadonlySet<DepartmentId>;
