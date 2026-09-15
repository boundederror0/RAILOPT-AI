export interface OrganizationDivision {
    id: string;
    name: string;
    /** When false the division exists but is not yet provisioned for logins. */
    available: boolean;
}
export interface OrganizationZone {
    id: string;
    name: string;
    shortCode: string;
    /** Zonal headquarters location. */
    hq: string;
    /** When false the whole zone renders disabled ("Coming soon"). */
    available: boolean;
    divisions: OrganizationDivision[];
}
export declare const ZONAL_AUTHORITY_DIVISION_ID = "ZONE";
export declare const ZONAL_AUTHORITY_DIVISION_NAME = "All Divisions \u2014 Zonal Authority";
export declare const KRCL_DIVISION_ID = "KRCL_NA";
export declare const KRCL_DIVISION_NAME = "Not Applicable \u2014 KRCL";
export declare const ACTIVE_ZONE_ID = "SR";
export declare const ACTIVE_DIVISION_ID = "MDU";
export declare const ZONES: OrganizationZone[];
export declare function getZone(zoneId: string): OrganizationZone | null;
export declare function getDivision(zoneId: string, divisionId: string): OrganizationDivision | null;
export declare function isDivisionCode(zoneId: string, divisionId: string): boolean;
/** True only for provisioned scopes (Southern Railway → Madurai Division). */
export declare function isScopeProvisioned(zoneId: string, divisionId: string): boolean;
export declare function zoneDisplayName(zoneId: string): string;
export declare function divisionDisplayName(zoneId: string, divisionId: string): string;
