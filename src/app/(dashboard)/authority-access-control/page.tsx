"use client";

import React, { useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Globe2,
  KeyRound,
  Minus,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { Badge } from "@/components/ui/badge";
import { AccessGuard } from "@/components/shared/access-guard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  POSTINGS,
  ROLE_PROFILES,
  DIVISION_NAME,
  DEPARTMENT_DISPLAY,
  type Posting,
} from "@/lib/rbac";
import {
  ALL_PERMISSIONS,
  type Permission,
} from "@/lib/rbac/permissions";
import {
  ZONES,
  ACTIVE_ZONE_ID,
  ACTIVE_DIVISION_ID,
  ZONAL_AUTHORITY_DIVISION_NAME,
  isScopeProvisioned,
} from "@/lib/rbac/organizational-data";

const PERMISSION_MODULE_ORDER = [
  "dashboard",
  "maintenance",
  "ai_analysis",
  "optimizer",
  "train_impact",
  "simulation",
  "emergency",
  "approvals",
  "live_operations",
  "requests",
  "analytics",
  "historical",
  "settings",
  "users",
  "roles",
  "system",
];

function permissionModule(p: string): string {
  return p.split(".")[0];
}

function postingPermissions(p: Posting): Permission[] {
  return p.permissions ?? ROLE_PROFILES[p.roleProfileId].permissions;
}

function hasPerm(p: Posting, perm: Permission): boolean {
  return postingPermissions(p).includes(perm);
}

const groupedPermissions = buildGroupedPermissions();

function buildGroupedPermissions(): Permission[][] {
  const groups = new Map<string, Permission[]>();
  for (const p of ALL_PERMISSIONS) {
    const mod = permissionModule(p);
    if (!groups.has(mod)) groups.set(mod, []);
    groups.get(mod)!.push(p as Permission);
  }
  return PERMISSION_MODULE_ORDER.filter((m) => groups.has(m)).map((m) => groups.get(m)!);
}

export default function AuthorityAccessControlPage() {
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [expandedPosting, setExpandedPosting] = useState<string | null>(null);
  const [zoneChainOpen, setZoneChainOpen] = useState(false);

  const zoneCodes = useMemo(() => ["all", ...ZONES.map((z) => z.id)], []);
  const levels = useMemo(() => ["all", "ZONAL", "DIVISIONAL"], []);

  const filteredPostings = useMemo(() => {
    return POSTINGS.filter((p) => {
      if (zoneFilter !== "all" && p.zone !== zoneFilter) return false;
      if (levelFilter !== "all" && p.organizationalLevel !== levelFilter) return false;
      return true;
    });
  }, [zoneFilter, levelFilter]);

  const zonalCount = POSTINGS.filter((p) => p.organizationalLevel === "ZONAL").length;
  const divisionalCount = POSTINGS.filter((p) => p.organizationalLevel === "DIVISIONAL").length;
  const approvalPostings = POSTINGS.filter((p) => hasPerm(p, "approvals.approve")).map((p) => p.key);
  const provisionedScopes = ZONES.filter((z) => z.available).length;

  const activeZone = ZONES.find((z) => z.id === ACTIVE_ZONE_ID);

  const scopeChain = useMemo(() => {
    const zonalPostings = POSTINGS.filter((p) => p.organizationalLevel === "ZONAL");
    const divisionalPostings = POSTINGS.filter((p) => p.organizationalLevel === "DIVISIONAL");
    return { zonalPostings, divisionalPostings };
  }, []);

  return (
    <AccessGuard requiredPermission="settings.view">
      <div className="space-y-6">
        <PageHeader
          title="Railway Authority & Access Control"
          subtitle="Complete RBAC matrix across the railway — postings, departments, scope chains, zone/division structure and the permission-to-posting access matrix. Read-only reference."
          actions={
            <Badge variant="outline" className="gap-1.5 py-1">
              <KeyRound className="h-3.5 w-3.5 text-slate-500" /> Read-only RBAC reference
            </Badge>
          }
        />

        {/* Overview stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Postings", value: POSTINGS.length, sub: `${zonalCount} zonal · ${divisionalCount} divisional` },
            { label: "Role profiles", value: Object.keys(ROLE_PROFILES).length, sub: "Single source of truth" },
            { label: "Permissions", value: ALL_PERMISSIONS.length, sub: "resource.action union" },
            { label: "Provisioned scopes", value: provisionedScopes, sub: `${ACTIVE_ZONE_ID} → ${ACTIVE_DIVISION_ID}` },
          ].map((s) => (
            <Panel key={s.label} title={s.label} contentClassName="pt-1">
              <p className="text-2xl font-semibold text-slate-900">{s.value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.sub}</p>
            </Panel>
          ))}
        </div>

        {/* Posting matrix */}
        <Panel
          title="Posting matrix"
          description="Every posting in the railway with department, level, org scope, role profile and approval authority."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  aria-label="Filter by zone"
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-amber-500"
                >
                  {zoneCodes.map((z) => (
                    <option key={z} value={z}>{z === "all" ? "All zones" : z}</option>
                  ))}
                </select>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  aria-label="Filter by level"
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-amber-500"
                >
                  {levels.map((l) => (
                    <option key={l} value={l}>{l === "all" ? "All levels" : l === "ZONAL" ? "Zonal" : "Divisional"}</option>
                  ))}
                </select>
              </div>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Posting</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Org scope</TableHead>
                  <TableHead>Role profile</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Approves</TableHead>
                  <TableHead>Permissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPostings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center text-slate-400">
                      No postings match the selected filters.
                    </TableCell>
                  </TableRow>
                )}
                {filteredPostings.map((p) => {
                  const perms = postingPermissions(p);
                  const expanded = expandedPosting === p.id;
                  return (
                    <React.Fragment key={p.id}>
                      <TableRow className="cursor-pointer" onClick={() => setExpandedPosting(expanded ? null : p.id)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{p.shortName}</p>
                              <p className="text-[11px] text-slate-400">{p.title}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="border-slate-200 bg-slate-100 text-slate-700">{DEPARTMENT_DISPLAY[p.department]}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={p.organizationalLevel === "ZONAL" ? "amber" : "outline"}>
                            {p.organizationalLevel === "ZONAL" ? "Zonal" : "Divisional"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{p.zone}</TableCell>
                        <TableCell className="text-xs text-slate-600">{p.division ?? ZONAL_AUTHORITY_DIVISION_NAME}</TableCell>
                        <TableCell className="text-xs text-slate-600">{p.scope}</TableCell>
                        <TableCell className="text-xs text-slate-600">{ROLE_PROFILES[p.roleProfileId].displayName}</TableCell>
                        <TableCell>
                          {hasPerm(p, "requests.track") ? (
                            <Badge variant="green" className="gap-1"><Check className="h-3 w-3" /> Track</Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasPerm(p, "approvals.approve") ? (
                            <Badge variant="green" className="gap-1"><ShieldCheck className="h-3 w-3" /> Approve</Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-slate-600">{perms.length}</span>
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow>
                          <TableCell colSpan={10} className="bg-slate-50/60">
                            <div className="flex flex-wrap gap-1.5">
                              {perms.map((perm) => (
                                <Badge key={perm} variant="outline" className="bg-white font-mono text-[11px]">{perm}</Badge>
                              ))}
                            </div>
                            {approvalPostings.includes(p.key) && (
                              <p className="mt-2 text-[11px] text-slate-500">
                                Final approval authority on recommendations within {p.organizationalLevel === "ZONAL" ? "zonal" : "divisional"} scope.
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Panel>

        {/* Access matrix */}
        <Panel
          title="Permission-to-posting access matrix"
          description="Each row is a permission from the resource.action union; columns mark every posting granted it. Read-only equality of POSTINGS catalog and role profile permissions (the §20 matrix)."
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[220px]">Permission</TableHead>
                  {POSTINGS.map((p) => (
                    <TableHead key={p.id} className="px-2 text-center text-[10px]">{p.shortName}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedPermissions.map((group) => (
                  <React.Fragment key={group[0].split(".")[0]}>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableCell className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {group[0].split(".")[0]}
                      </TableCell>
                      <TableCell colSpan={POSTINGS.length} />
                    </TableRow>
                    {group.map((perm) => (
                      <TableRow key={perm}>
                        <TableCell className="font-mono text-xs text-slate-700">{perm}</TableCell>
                        {POSTINGS.map((p) => (
                          <TableCell key={p.id} className="px-2 py-2 text-center">
                            {hasPerm(p, perm) ? (
                              <Check className="mx-auto h-4 w-4 text-emerald-600" />
                            ) : (
                              <Minus className="mx-auto h-3.5 w-3.5 text-slate-300" />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>

        {/* Zone / division structure */}
        <Panel
          title="Zone & division structure"
          description="All zones and their divisions. Only provisioned scopes accept logins; everything else renders as Coming soon."
        >
          <div className="space-y-4">
            {ZONES.map((z) => (
              <div key={z.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Globe2 className="h-4 w-4 shrink-0 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-800">{z.name}</p>
                    <Badge variant="outline" className="font-mono text-[10px]">{z.shortCode}</Badge>
                    <span className="text-[11px] text-slate-400">HQ {z.hq}</span>
                  </div>
                  {z.available ? (
                    <Badge variant="green">Active scope</Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400">Coming soon</Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {z.divisions.map((d) => (
                    <span
                      key={d.id}
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[11px]",
                        d.available
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-400"
                      )}
                    >
                      {d.name}
                      {isScopeProvisioned(z.id, d.id) && <span className="ml-1 text-emerald-600">●</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Scope chain */}
        <Panel
          title="Zone authority scope chain"
          description="Zone → Division → Divisional Authority → Perm (posting) hierarchy. Divisional postings inherit zone identity but are scoped to their division."
          action={
            <button
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none hover:bg-slate-50"
              onClick={() => setZoneChainOpen((o) => !o)}
              aria-expanded={zoneChainOpen}
            >
              {zoneChainOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {zoneChainOpen ? "Collapse chain" : "Expand Zone → Division → Authority → Posting"}
            </button>
          }
        >
          {!zoneChainOpen ? (
            <p className="text-sm text-slate-500">Expand to walk the hierarchy.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900">{activeZone?.name}</p>
                  <p className="text-xs text-amber-700">Zone code {ACTIVE_ZONE_ID} · HQ {activeZone?.hq}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {scopeChain.zonalPostings.map((p) => (
                      <Badge key={p.id} variant="outline" className="bg-white font-mono text-[11px]">{p.shortName}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="ml-5 border-l-2 border-slate-200 pl-4">
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-900">Division · {DIVISION_NAME}</p>
                    <p className="text-xs text-emerald-700">Division code {ACTIVE_DIVISION_ID} · provisioned</p>
                  </div>
                </div>
                <div className="ml-5 border-l-2 border-slate-200 pl-4 pt-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Divisional Authority</p>
                    <p className="mt-1 text-xs text-slate-500">Divisional Railway Manager carries cross-department approval authority for the division.</p>
                  </div>
                  <div className="ml-5 border-l-2 border-slate-200 pl-4 pt-3">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Perm (postings)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {scopeChain.divisionalPostings.map((p) => (
                        <Badge key={p.id} variant="outline" className="font-mono text-[11px]">{p.shortName}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Panel>

        {/* Approval authority summary */}
        <Panel
          title="Postings with final approval authority"
          description="Approval authority follows the approvals.approve permission — only authorized postings may make approval decisions."
        >
          <div className="flex flex-wrap items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            {approvalPostings.length === 0 ? (
              <span className="text-sm text-slate-400">No postings currently grant approval authority.</span>
            ) : (
              approvalPostings.map((key) => {
                const p = POSTINGS.find((x) => x.key === key);
                return p ? <Badge key={key} variant="green" className="gap-1"><ShieldCheck className="h-3 w-3" /> {p.shortName}</Badge> : null;
              })
            )}
          </div>
        </Panel>
      </div>
    </AccessGuard>
  );
}