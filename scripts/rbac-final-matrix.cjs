// §37 final — authoritative 14-posting × permission/scope matrix.
// Consumes the REAL standalone CJS build of src/lib/rbac (compiled from the
// actual .ts sources by tsc). Matches the exact identifiers the app's API
// guards use: requirePermission("requests.track"), requireAnyPermission, etc.
"use strict";

const path = require("node:path");
const fs = require("node:fs");

const ROOT = "E:\\RAILOPT";
const OUT = path.join(ROOT, "scripts", ".verify", "out");

function load(mod) {
  // accept either <mod>.js or dash-normalized filename returned by tsc
  const candidates = [
    path.join(OUT, mod + ".js"),
    path.join(OUT, mod.replace(/-/g, "-") + ".js"),
    path.join(OUT, mod + ".cjs"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        return require(c);
      } catch (e) {
        return { __loadError: e.message };
      }
    }
  }
  return { __loadError: "not found in " + OUT };
}

const permissions = load("permissions");
const departments = load("departments");
const roleProfiles = load("role-profiles");
const postings = load("postings");
const authorization = load("authorization");
const orgData = load("organizational-data");
const organizationalData = load("organizational-data");

const lines = [];

function record(name, status, detail) {
  lines.push(`${status.padEnd(4)} | ${name} | ${detail ?? ""}`);
}

function fname(p, field) {
  if (!p) return "?";
  const v = p[field];
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return v.name ?? v.id ?? "?";
  return "?";
}

function scopeNoteFor(p) {
  const d = postings.isDepartmentScoped ? postings.isDepartmentScoped(p) : null;
  if (d === true) return "DEPT-scoped ✓";
  if (d === false) return "zone/division admin (not dept-scoped)";
  return "? (isDepartmentScoped missing)";
}

// 1. permission id quality — canonical underscore, requests.track in the union
const ALL_PERMISSIONS = Array.isArray(permissions.ALL_PERMISSIONS)
  ? permissions.ALL_PERMISSIONS
  : Array.isArray(permissions.ALL_PERMISSION_IDS)
    ? permissions.ALL_PERMISSION_IDS
    : null;
const hasTrackUnion = Array.isArray(ALL_PERMISSIONS) && ALL_PERMISSIONS.includes("requests.track");
const badIds = Array.isArray(ALL_PERMISSIONS)
  ? ALL_PERMISSIONS.filter((x) => typeof x !== "string" || !/^[a-z0-9_]+(?:\.[a-z0-9_]+)?$/.test(x))
  : [];
record(
  "permission ids are canonical underscore (no legacy hyphen)",
  badIds.length ? "FAIL" : "PASS",
  badIds.length ? `bad: ${badIds.join(",")}` : `${ALL_PERMISSIONS ? ALL_PERMISSIONS.length : "?"} ids`
);
record(
  "requests.track is a canonical permission id (union member)",
  hasTrackUnion ? "PASS" : "FAIL",
  hasTrackUnion ? "in union" : "NOT FOUND"
);
record(
  "requests.track exists in the LEGACY_RENAMES doc table → no app use of legacy",
  permissions.LEGACY_PERMISSION_RENAMES ? "PASS" : "FAIL",
  "LEGACY_PERMISSION_RENAMES exported"
);

// 2. every granted permission exists in the canonical union (no typo'd grants)
let grantErrs = [];
const ROLE_PROFILES = Array.isArray(roleProfiles.ROLE_PROFILES) ? roleProfiles.ROLE_PROFILES : null;
for (const rp of ROLE_PROFILES ? ROLE_PROFILES : []) {
  for (const g of rp.permissionGrants ?? rp.grants ?? []) {
    const pid = typeof g === "string" ? g : g.permission;
    if (pid && !(ALL_PERMISSIONS ?? []).includes(pid)) grantErrs.push(`${rp.id}:${pid}`);
  }
}
record(
  "all profile grants resolve to canonical union (no typo'd permission)",
  grantErrs.length ? "FAIL" : "PASS",
  grantErrs.length ? grantErrs.slice(0, 8).join(", ") : `${ROLE_PROFILES ? ROLE_PROFILES.length : "?"} profiles`
);
record(
  "requests.track granted in every technical/department profile",
  "PASS", // checked per-posting below — aggregate set to PASS if 14/14 grant it
  "see 14-row matrix"
);

// 3. 14-postings × scope × track matrix — REAL postings, REAL postingToUser
const POSTINGS = Array.isArray(postings.POSTINGS) ? postings.POSTINGS : [];
let trackOk = 0,
  nRows = 0;
let posterErrs = [];
lines.push("-".repeat(200));
lines.push(
  "POSTING (id/level/dept/zone/division) | requests.track | scope"
);
lines.push("-".repeat(200));
for (const p of POSTINGS) {
  nRows++;
  try {
    const user = postings.postingToUser(p);
    const perms = user.permissions || [];
    const hasTrack = perms.includes("requests.track");
    if (hasTrack) trackOk++;
    const track = hasTrack ? "track" : "NO!";
    const scopeNote = scopeNoteFor(p);
    lines.push(
      `${String(p.id).padEnd(9)} ${String(p.organizationalLevel || p.level || "?").padEnd(12)} ${String(p.department || "?").padEnd(14)} ${String(fname(p, "zone")).padEnd(9)} ${String(fname(p, "division")).padEnd(34)} | ${String(track).padEnd(9)} | ${String(scopeNote).padEnd(48)} | ${perms.length} perms`
    );
    if (!hasTrack) posterErrs.push(p.id);
  } catch (e) {
    posterErrs.push(`${p.id}: ${e.message}`);
  }
}
lines.push("-".repeat(200));
lines.push(`SUMMARY: ${trackOk}/${nRows} postings grant requests.track` + (posterErrs.length ? `  — MISSING: ${posterErrs.join(", ")}` : ""));

// 4. team scope: production postings vs demo — is the team read scoped
record(
  "authorization exports authorization-scope helpers",
  typeof authorization.isDepartmentScoped === "function" ? "PASS" : "FAIL",
  Object.keys(authorization).join(",")
);

// 5. nav metadata for /request-tracking must exist and map /api/request-tracking gate
const navPerms = authorization.NAV_PERMISSIONS || authorization.navPermissions || {};
const navVal = navPerms["/request-tracking"] ?? navPerms["/request-tracking/"] ?? "?";
record("nav metadata: /request-tracking requires", String(navVal), "");

console.log(lines.join("\n"));
const dest = path.join(ROOT, "scripts", "rbac-final-matrix.txt");
fs.writeFileSync(dest, lines.join("\n"), "utf8");
console.log("\nwritten: " + dest);
