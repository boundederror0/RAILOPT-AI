import type { Permission } from "./permissions";
import type { DepartmentId } from "./departments";
import { TECHNICAL_DEPARTMENTS, canonicalRequestDepartment } from "./departments";
import type { RoleProfileId } from "./role-profiles";
import type { User } from "./postings";
import { getUserPermissions } from "./postings";

export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return getUserPermissions(user).includes(permission);
}

export function hasAnyPermission(
  user: User | null | undefined,
  permissions: Permission[]
): boolean {
  if (!user) return false;
  const perms = getUserPermissions(user);
  return permissions.some((p) => perms.includes(p));
}

export function hasAllPermissions(
  user: User | null | undefined,
  permissions: Permission[]
): boolean {
  if (!user) return false;
  const perms = getUserPermissions(user);
  return permissions.every((p) => perms.includes(p));
}

/**
 * Department-scoped maintenance users (divisional technical engineers) may only
 * view/edit requests belonging to their own department. Operators, zonal
 * oversight and divisional administration are not department-scoped.
 */
export function isDepartmentScoped(user: User | null | undefined): boolean {
  if (!user) return false;
  if (!TECHNICAL_DEPARTMENTS.has(user.department)) return false;
  return hasPermission(user, "maintenance.edit");
}

/** True when the request row belongs to the given user's department scope. */
export function canAccessRequestDepartment(
  user: User | null | undefined,
  requestDepartment: string | undefined | null
): boolean {
  if (!user) return true;
  const canonical = canonicalRequestDepartment(String(requestDepartment ?? ""));
  if (!canonical) return true;
  return user.department === canonical;
}

/** Human-readable scope label used in the top bar identity display. */
export function scopeDisplay(user: User): string {
  return user.organizationalLevel === "ZONAL" ? user.zone : `${user.zone} / ${user.division ?? ""}`;
}

// --- Route permission map (used for client-side navigation filtering) ------

export const NAV_PERMISSIONS: Record<string, Permission> = {
  "/": "dashboard.view",
  "/maintenance-requests": "maintenance.view",
  "/request-tracking": "requests.track",
  "/live-operations": "live_operations.view",
  "/emergency": "emergency.view",
  "/ai-analysis": "ai_analysis.view",
  "/block-optimizer": "optimizer.view",
  "/train-impact": "train_impact.view",
  "/what-if": "simulation.view",
  "/approvals": "approvals.view",
  "/historical-intelligence": "historical.view",
  "/analytics": "analytics.view",
  "/settings": "settings.view",
};

export function getNavPermission(path: string): Permission | undefined {
  return NAV_PERMISSIONS[path];
}

export function canAccessRoute(user: User | null | undefined, path: string): boolean {
  const permission = getNavPermission(path);
  if (!permission) return true;
  return hasPermission(user, permission);
}

export function getAccessibleNavGroups(user: User | null | undefined) {
  const NAV_GROUPS_RAW = [
    {
      label: "Operations",
      items: [
        { label: "Dashboard", href: "/", iconName: "LayoutDashboard" },
        { label: "Maintenance Requests", href: "/maintenance-requests", iconName: "Wrench" },
        { label: "Request Tracking", href: "/request-tracking", iconName: "ListOrdered" },
        { label: "Live Operations", href: "/live-operations", iconName: "Radio" },
        { label: "Emergency Replanning", href: "/emergency", iconName: "AlertTriangle" },
      ],
    },
    {
      label: "Decision Support",
      items: [
        { label: "AI Analysis", href: "/ai-analysis", iconName: "BrainCircuit" },
        { label: "Block Optimizer", href: "/block-optimizer", iconName: "CalendarRange" },
        { label: "Train Impact", href: "/train-impact", iconName: "Train" },
        { label: "What-If Simulation", href: "/what-if", iconName: "FlaskConical" },
        { label: "Approvals", href: "/approvals", iconName: "CheckCircle2" },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { label: "Historical Intelligence", href: "/historical-intelligence", iconName: "History" },
        { label: "Analytics", href: "/analytics", iconName: "BarChart3" },
      ],
    },
    {
      label: "System",
      items: [{ label: "Settings", href: "/settings", iconName: "Settings" }],
    },
  ];

  return NAV_GROUPS_RAW.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessRoute(user, item.href)),
  })).filter((group) => group.items.length > 0);
}

export type { DepartmentId, RoleProfileId };