import type { Permission } from "./permissions";
export type RoleProfileId = "ZONE_ADMIN_OVERSIGHT" | "ZONE_OPERATIONS" | "ZONE_ENGINEERING" | "ZONE_MECHANICAL" | "ZONE_ELECTRICAL" | "ZONE_ST" | "DIVISION_ADMINISTRATION" | "DIVISION_OPERATIONS" | "DIVISION_ENGINEERING" | "DIVISION_MECHANICAL" | "DIVISION_ELECTRICAL" | "DIVISION_ST";
export interface RoleProfile {
    id: RoleProfileId;
    displayName: string;
    description: string;
    permissions: Permission[];
}
export declare const ROLE_PROFILES: Record<RoleProfileId, RoleProfile>;
export declare function getRoleProfile(profileId: RoleProfileId): RoleProfile;
