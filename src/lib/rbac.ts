export type Permission =
  | "dashboard.view"
  | "maintenance.view"
  | "maintenance.create"
  | "maintenance.edit"
  | "ai-analysis.view"
  | "ai-analysis.run"
  | "optimizer.view"
  | "optimizer.run"
  | "train-impact.view"
  | "simulation.view"
  | "simulation.run"
  | "live-operations.view"
  | "emergency.view"
  | "emergency.replan"
  | "approval.view"
  | "approval.decide"
  | "analytics.view"
  | "historical.view"
  | "profile.view"
  | "profile.edit"
  | "users.manage"
  | "roles.manage"
  | "system.manage";

export type RoleId =
  | "DIVISIONAL_OPERATIONS_CONTROLLER"
  | "MAINTENANCE_ENGINEER"
  | "SECTION_CONTROLLER"
  | "OPERATIONS_ANALYST"
  | "SYSTEM_ADMINISTRATOR";

export interface Role {
  id: RoleId;
  displayName: string;
  description: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  name: string;
  designation: string;
  role: RoleId;
  permissions?: Permission[];
}

export const ROLES: Record<RoleId, Role> = {
  DIVISIONAL_OPERATIONS_CONTROLLER: {
    id: "DIVISIONAL_OPERATIONS_CONTROLLER",
    displayName: "Divisional Operations Controller",
    description: "Broad operational access across train operations, maintenance coordination, block planning and operational decisions",
    permissions: [
      "dashboard.view",
      "maintenance.view",
      "maintenance.create",
      "maintenance.edit",
      "ai-analysis.view",
      "ai-analysis.run",
      "optimizer.view",
      "optimizer.run",
      "train-impact.view",
      "simulation.view",
      "simulation.run",
      "live-operations.view",
      "emergency.view",
      "emergency.replan",
      "approval.view",
      "approval.decide",
      "analytics.view",
      "historical.view",
      "profile.view",
      "profile.edit",
    ],
  },
  MAINTENANCE_ENGINEER: {
    id: "MAINTENANCE_ENGINEER",
    displayName: "Senior Divisional Engineer / Maintenance Engineer",
    description: "Maintenance-focused role with analysis and proposal capabilities",
    permissions: [
      "dashboard.view",
      "maintenance.view",
      "maintenance.create",
      "maintenance.edit",
      "ai-analysis.view",
      "ai-analysis.run",
      "optimizer.view",
      "optimizer.run",
      "train-impact.view",
      "simulation.view",
      "simulation.run",
      "live-operations.view",
      "analytics.view",
      "historical.view",
      "profile.view",
      "profile.edit",
    ],
  },
  SECTION_CONTROLLER: {
    id: "SECTION_CONTROLLER",
    displayName: "Section Controller",
    description: "Operational monitoring and coordination role",
    permissions: [
      "dashboard.view",
      "maintenance.view",
      "train-impact.view",
      "live-operations.view",
      "simulation.view",
      "simulation.run",
      "analytics.view",
      "profile.view",
      "profile.edit",
    ],
  },
  OPERATIONS_ANALYST: {
    id: "OPERATIONS_ANALYST",
    displayName: "Operations Analyst",
    description: "Analysis and review role with limited write permissions",
    permissions: [
      "dashboard.view",
      "ai-analysis.view",
      "train-impact.view",
      "analytics.view",
      "historical.view",
      "live-operations.view",
      "optimizer.view",
      "simulation.view",
      "simulation.run",
      "profile.view",
      "profile.edit",
    ],
  },
  SYSTEM_ADMINISTRATOR: {
    id: "SYSTEM_ADMINISTRATOR",
    displayName: "System Administrator",
    description: "Technical administration role for user and system management",
    permissions: [
      "dashboard.view",
      "users.manage",
      "roles.manage",
      "system.manage",
      "profile.view",
      "profile.edit",
    ],
  },
};

export const DEMO_USERS: User[] = [
  {
    id: "user-1",
    name: "S. Rajan",
    designation: "Divisional Operations Controller",
    role: "DIVISIONAL_OPERATIONS_CONTROLLER",
  },
  {
    id: "user-2",
    name: "A. Krishnan",
    designation: "Senior Divisional Engineer",
    role: "MAINTENANCE_ENGINEER",
  },
  {
    id: "user-3",
    name: "R. Venkatesh",
    designation: "Section Controller",
    role: "SECTION_CONTROLLER",
  },
  {
    id: "user-4",
    name: "P. Lakshmi",
    designation: "Operations Analyst",
    role: "OPERATIONS_ANALYST",
  },
  {
    id: "user-5",
    name: "K. Admin",
    designation: "System Administrator",
    role: "SYSTEM_ADMINISTRATOR",
  },
];

export function getRole(roleId: RoleId): Role {
  return ROLES[roleId];
}

export function getUserPermissions(user: User): Permission[] {
  const role = getRole(user.role);
  return user.permissions?.length ? [...new Set([...role.permissions, ...user.permissions])] : role.permissions;
}

export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  const permissions = getUserPermissions(user);
  return permissions.includes(permission);
}

export function hasAnyPermission(user: User | null | undefined, permissions: Permission[]): boolean {
  if (!user) return false;
  const userPerms = getUserPermissions(user);
  return permissions.some((p) => userPerms.includes(p));
}

export function hasAllPermissions(user: User | null | undefined, permissions: Permission[]): boolean {
  if (!user) return false;
  const userPerms = getUserPermissions(user);
  return permissions.every((p) => userPerms.includes(p));
}

export const NAV_PERMISSIONS: Record<string, Permission> = {
  "/": "dashboard.view",
  "/maintenance-requests": "maintenance.view",
  "/live-operations": "live-operations.view",
  "/emergency": "emergency.view",
  "/ai-analysis": "ai-analysis.view",
  "/block-optimizer": "optimizer.view",
  "/train-impact": "train-impact.view",
  "/what-if": "simulation.view",
  "/approvals": "approval.view",
  "/historical-intelligence": "historical.view",
  "/analytics": "analytics.view",
  "/settings": "profile.view",
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