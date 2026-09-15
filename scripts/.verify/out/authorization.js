"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NAV_PERMISSIONS = void 0;
exports.hasPermission = hasPermission;
exports.hasAnyPermission = hasAnyPermission;
exports.hasAllPermissions = hasAllPermissions;
exports.isDepartmentScoped = isDepartmentScoped;
exports.canAccessRequestDepartment = canAccessRequestDepartment;
exports.scopeDisplay = scopeDisplay;
exports.getNavPermission = getNavPermission;
exports.canAccessRoute = canAccessRoute;
exports.getAccessibleNavGroups = getAccessibleNavGroups;
const departments_1 = require("./departments");
const postings_1 = require("./postings");
function hasPermission(user, permission) {
    if (!user)
        return false;
    return (0, postings_1.getUserPermissions)(user).includes(permission);
}
function hasAnyPermission(user, permissions) {
    if (!user)
        return false;
    const perms = (0, postings_1.getUserPermissions)(user);
    return permissions.some((p) => perms.includes(p));
}
function hasAllPermissions(user, permissions) {
    if (!user)
        return false;
    const perms = (0, postings_1.getUserPermissions)(user);
    return permissions.every((p) => perms.includes(p));
}
/**
 * Department-scoped maintenance users (divisional technical engineers) may only
 * view/edit requests belonging to their own department. Operators, zonal
 * oversight and divisional administration are not department-scoped.
 */
function isDepartmentScoped(user) {
    if (!user)
        return false;
    if (!departments_1.TECHNICAL_DEPARTMENTS.has(user.department))
        return false;
    return hasPermission(user, "maintenance.edit");
}
/** True when the request row belongs to the given user's department scope. */
function canAccessRequestDepartment(user, requestDepartment) {
    if (!user)
        return true;
    const canonical = (0, departments_1.canonicalRequestDepartment)(String(requestDepartment ?? ""));
    if (!canonical)
        return true;
    return user.department === canonical;
}
/** Human-readable scope label used in the top bar identity display. */
function scopeDisplay(user) {
    return user.organizationalLevel === "ZONAL" ? user.zone : `${user.zone} / ${user.division ?? ""}`;
}
// --- Route permission map (used for client-side navigation filtering) ------
exports.NAV_PERMISSIONS = {
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
function getNavPermission(path) {
    return exports.NAV_PERMISSIONS[path];
}
function canAccessRoute(user, path) {
    const permission = getNavPermission(path);
    if (!permission)
        return true;
    return hasPermission(user, permission);
}
function getAccessibleNavGroups(user) {
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
