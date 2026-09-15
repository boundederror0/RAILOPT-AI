import type { Permission } from "./permissions";
import type { DepartmentId } from "./departments";
import type { RoleProfileId } from "./role-profiles";
import type { User } from "./postings";
export declare function hasPermission(user: User | null | undefined, permission: Permission): boolean;
export declare function hasAnyPermission(user: User | null | undefined, permissions: Permission[]): boolean;
export declare function hasAllPermissions(user: User | null | undefined, permissions: Permission[]): boolean;
/**
 * Department-scoped maintenance users (divisional technical engineers) may only
 * view/edit requests belonging to their own department. Operators, zonal
 * oversight and divisional administration are not department-scoped.
 */
export declare function isDepartmentScoped(user: User | null | undefined): boolean;
/** True when the request row belongs to the given user's department scope. */
export declare function canAccessRequestDepartment(user: User | null | undefined, requestDepartment: string | undefined | null): boolean;
/** Human-readable scope label used in the top bar identity display. */
export declare function scopeDisplay(user: User): string;
export declare const NAV_PERMISSIONS: Record<string, Permission>;
export declare function getNavPermission(path: string): Permission | undefined;
export declare function canAccessRoute(user: User | null | undefined, path: string): boolean;
export declare function getAccessibleNavGroups(user: User | null | undefined): {
    items: {
        label: string;
        href: string;
        iconName: string;
    }[];
    label: string;
}[];
export type { DepartmentId, RoleProfileId };
