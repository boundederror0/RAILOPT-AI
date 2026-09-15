"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Box,
  Clock,
  Search,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { RiskGauge } from "@/components/shared/risk-gauge";
import { RequestDetailDrawer } from "@/components/maintenance/request-detail-drawer";
import { api } from "@/lib/api";
import type { MaintenanceRequest } from "@/lib/types";

type SortKey = "priority" | "riskScore" | "requestedDate";
type SortDir = "asc" | "desc";

/**
 * Read-only lifecycle stage derived from the server-provided status value.
 * Presentation only — never persisted, never used for scope/authorization.
 */
function stageLabel(status: MaintenanceRequest["status"]): string {
  switch (status) {
    case "Open":
      return "Raised";
    case "In Review":
      return "Department Review";
    case "Approved":
      return "Engineering Approval";
    case "Scheduled":
      return "Block Scheduled";
    case "In Progress":
      return "Execution";
    case "Completed":
      return "Completed";
    default:
      return status;
  }
}

const PRIORITY_WEIGHT: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const PRIORITY_CLASS: Record<string, string> = {
  Critical: "border-red-200 bg-red-50 text-red-700",
  High: "border-amber-200 bg-amber-50 text-amber-700",
  Medium: "border-sky-200 bg-sky-50 text-sky-700",
  Low: "border-slate-200 bg-slate-50 text-slate-600",
};

export default function RequestTrackingPage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("All");
  const [priority, setPriority] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("riskScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<MaintenanceRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRequestTracking<{ requests: MaintenanceRequest[] }>();
      setRequests(res.requests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load request tracking.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stages = useMemo(() => {
    const set = new Set<string>(["All"]);
    for (const r of requests) set.add(stageLabel(r.status));
    return Array.from(set);
  }, [requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = requests.filter((r) => {
      if (stage !== "All" && stageLabel(r.status) !== stage) return false;
      if (priority !== "All" && r.priority !== priority) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.assetName.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "priority":
          cmp = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
          break;
        case "riskScore":
          cmp = a.riskScore - b.riskScore;
          break;
        case "requestedDate":
          cmp = a.requestedDate.localeCompare(b.requestedDate);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [requests, search, stage, priority, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const openRequest = (r: MaintenanceRequest) => {
    setSelected(r);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Request Tracking"
        subtitle="Read-only, live status of maintenance requests across your operational scope. Scope is enforced server-side from your posting; this view never broadens it."
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {/* Filters — pure client-side presentation; never alter server scope. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, asset, location, department or section…"
            aria-label="Search tracked requests"
            className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          aria-label="Filter by lifecycle stage"
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
        >
          {stages.map((s) => (
            <option key={s} value={s}>{s === "All" ? "All stages" : s}</option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          aria-label="Filter by priority"
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
        >
          <option value="All">All priorities</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Request</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>
                <button
                  className="inline-flex items-center gap-1 text-left hover:text-slate-900"
                  onClick={() => toggleSort("requestedDate")}
                >
                  Submitted
                  {sortKey === "requestedDate" ? (sortDir === "asc" ? <ArrowUpWideNarrow className="h-3.5 w-3.5" /> : <ArrowDownWideNarrow className="h-3.5 w-3.5" />) : null}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <p className="text-sm text-slate-400">
                    No requests within the current tracking scope match these filters.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => openRequest(r)}>
                  <TableCell className="font-mono text-xs font-semibold text-slate-800">{r.id}</TableCell>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2">
                      <Box className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{r.assetName}</p>
                        <p className="text-[11px] text-slate-400">{r.section}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{r.department}</TableCell>
                  <TableCell className="text-sm text-slate-600">{r.location}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={PRIORITY_CLASS[r.priority] ?? ""}>{r.priority}</Badge>
                  </TableCell>
                  <TableCell><RiskGauge score={r.riskScore} size={64} /></TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="border-slate-200 bg-slate-100 text-slate-700">
                      {stageLabel(r.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(r.requestedDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* User requested columns map 1:1 onto server fields:
          id / assetName(+section) / department / location / priority / riskScore / status→stage / requestedDate.
          "Division" is a server-side scope decision — never rendered or derived client-side (per §16 scope rule). */}

      <RequestDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        request={selected}
      />
    </div>
  );
}
