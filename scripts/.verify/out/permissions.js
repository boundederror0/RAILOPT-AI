"use strict";
// RAILOPT AI — canonical RBAC identifiers (FINAL SPEC §15 / §20).
//
// identifier_format: resource.action, underscore-separated. Single-word
// resources keep their word (dashboard, maintenance, optimizer, simulation,
// emergency, analytics, historical, settings) while compound module names use
// underscores (ai_analysis, train_impact, live_operations, approvals).
//
// The underscore union below is the single source of truth. The §20 matrix
// grants each posting a subset of this union. Permissions present in the union
// but granted to NO posting (reserved for admin/provisioning surfaces, never
// auto-granted — §36/§42): users.manage, roles.manage, system.manage.
//
// NOTE (retained identifiers): ai_analysis.run is kept even though the §15
// list names only ai_analysis.view — the AI risk-analysis action (both the
// request dialog's asset scoring and the AI Analysis page "Run analysis")
// depends on it, and the spec's "existing permissions may be retained where
// useful" clause permits retaining it alongside the renamed family.
// requests.track is the new Request Tracking capability (i_requestTracking).
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_PERMISSION_RENAMES = exports.ALL_PERMISSIONS = void 0;
exports.ALL_PERMISSIONS = [
    "dashboard.view",
    "maintenance.view",
    "maintenance.create",
    "maintenance.edit",
    "maintenance.submit",
    "ai_analysis.view",
    "ai_analysis.run",
    "optimizer.view",
    "optimizer.run",
    "optimizer.recommend",
    "train_impact.view",
    "simulation.view",
    "simulation.run",
    "emergency.view",
    "emergency.create",
    "emergency.recommend",
    "approvals.view",
    "approvals.recommend",
    "approvals.approve",
    "live_operations.view",
    "live_operations.monitor",
    "live_operations.coordinate",
    "requests.track",
    "analytics.view",
    "historical.view",
    "settings.view",
    "users.manage",
    "roles.manage",
    "system.manage",
];
// Legacy hyphenated identifiers migrated to the underscore union above.
// Used only for the automated rename verification (the §37 "no hyphen legacy
// strings in source" assertion) — do NOT reference these in application code.
exports.LEGACY_PERMISSION_RENAMES = {
    "dashboard.view": "dashboard.view",
    "maintenance.view": "maintenance.view",
    "maintenance.create": "maintenance.create",
    "maintenance.edit": "maintenance.edit",
    "maintenance.submit": "maintenance.submit",
    "ai_analysis.view": "ai_analysis.view",
    "ai_analysis.run": "ai_analysis.run",
    "optimizer.view": "optimizer.view",
    "optimizer.run": "optimizer.run",
    "optimizer.recommend": "optimizer.recommend",
    "train_impact.view": "train_impact.view",
    "simulation.view": "simulation.view",
    "simulation.run": "simulation.run",
    "emergency.view": "emergency.view",
    "emergency.create": "emergency.create",
    "emergency.recommend": "emergency.recommend",
    "approvals.view": "approvals.view",
    "approvals.recommend": "approvals.recommend",
    "approvals.approve": "approvals.approve",
    "live_operations.view": "live_operations.view",
    "live_operations.monitor": "live_operations.monitor",
    "live_operations.coordinate": "live_operations.coordinate",
    "analytics.view": "analytics.view",
    "historical.view": "historical.view",
    "settings.view": "settings.view",
    "users.manage": "users.manage",
    "roles.manage": "roles.manage",
    "system.manage": "system.manage",
};
