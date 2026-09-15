import type { Permission } from "./permissions";
import type { DepartmentId, OrganizationalLevel } from "./departments";
import type { RoleProfileId } from "./role-profiles";
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
export declare function postingScope(posting: Pick<Posting, "organizationalLevel">): string;
export declare function postingToUser(posting: Posting): User;
export declare const POSTINGS: Posting[];
export declare function getPosting(id: string): Posting | null;
export declare function getUserPermissions(user: User): Permission[];
