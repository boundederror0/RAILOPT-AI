"use client";

import React, { useMemo, useState } from "react";
import { Plus, Search, ChevronUp, ChevronDown, ChevronsUpDown, ArrowUpDown, RefreshCw } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { api } from "@/lib/api";
import type { MaintenanceRequest, RequestStatus } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestFormDialog } from "@/components/maintenance/request-form-dialog";
import { RequestDetailDrawer } from "@/components/maintenance/request-detail-drawer";
import { WorkflowBar } from "@/components/shared/workflow-bar";
import { priorityColor } from "@/lib/utils";
import { AccessGuard, WithPermission } from "@/components/shared/access-guard";

type SortKey = "id" | "assetName" | "location" | "priority" | "riskScore" | "requestedDate" | "status";

const STATUS_FILTERS: Array<RequestStatus | "All"> = ["All", "Open", "In Review", "Approved", "Scheduled", "In Progress", "Completed", "Cancelled", "Rejected"];
const PAGE_SIZE = 10;

export default function MaintenanceRequestsPage() {
  const { data, loading, error, reload } = useFetch<{ requests: MaintenanceRequest[] }>(() => api.getRequests());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RequestStatus | "All">("All");
  const [priority, setPriority] = useState<string>("All");
  const [department, setDepartment] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("riskScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<MaintenanceRequest | null>(null);
  const [detailRequest, setDetailRequest] = useState<MaintenanceRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prefillAsset, setPrefillAsset] = useState<string | null>(null);

  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const asset = q.get("asset");
    if (asset) {
      setPrefillAsset(asset);
      setCreateOpen(true);
      window.history.replaceState({}, "", "/maintenance-requests");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requests = data?.requests ?? [];

  const departments = useMemo(() => Array.from(new Set(requests.map((r) => r.department))).sort(), [requests]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = requests.filter((r) => {
      if (status !== "All" && r.status !== status) return false;
      if (priority !== "All" && r.priority !== priority) return false;
      if (department !== "All" && r.department !== department) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.assetName.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.issue.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q)
      );
    });

    const weight: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "priority":
          cmp = weight[a.priority] - weight[b.priority];
          break;
        case "riskScore":
          cmp = a.riskScore - b.riskScore;
          break;
        case "requestedDate":
          cmp = a.requestedDate.localeCompare(b.requestedDate);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        default:
          cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [requests, search, status, priority, department, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "requestedDate" || key === "riskScore" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) =>
    sortKey !== column ? (
      <ChevronsUpDown className="h-3 w-3 text-slate-300" />
    ) : sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 text-slate-600" />
    ) : (
      <ChevronDown className="h-3 w-3 text-slate-600" />
    );

  const Th = ({ column, children }: { column: SortKey; children: React.ReactNode }) => (
    <button
      onClick={() => toggleSort(column)}
      className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
    >
      {children} <SortIcon column={column} />
    </button>
  );

  React.useEffect(() => {
    setPage(1);
  }, [search, status, priority, department]);

  return (
    <AccessGuard requiredPermission="maintenance.view">
      <div>
        <PageHeader
          title="Maintenance Requests"
          subtitle="All open and historical maintenance requests across the division"
          actions={
            <WithPermission permission="maintenance.create">
              <Button onClick={() => { setEditRequest(null); setPrefillAsset(null); setCreateOpen(true); }}>
                <Plus className="h-4 w-4" /> New Request
              </Button>
            </WithPermission>
          }
        />

      <WorkflowBar current={0} />

      <Panel className="p-0" title="Requests ledger" contentClassName="p-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, asset, location, issue…"
              className="pl-8"
              aria-label="Search maintenance requests"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as RequestStatus | "All")}>
            <SelectTrigger className="w-[150px]" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-[130px]" aria-label="Filter by priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All priorities</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-[140px]" aria-label="Filter by department">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={reload} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-center text-sm text-red-600">
            {error}
            <Button variant="outline" size="sm" onClick={reload} className="ml-2">Retry</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No maintenance requests match"
              description="Adjust filters or create a new request."
              action={<Button onClick={() => { setEditRequest(null); setCreateOpen(true); }}>Create request</Button>}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left"><Th column="id">ID</Th></th>
                  <th className="px-4 py-2.5 text-left"><Th column="assetName">Asset</Th></th>
                  <th className="px-4 py-2.5 text-left"><Th column="location">Location</Th></th>
                  <th className="px-4 py-2.5 text-left"><Th column="priority">Priority</Th></th>
                  <th className="px-4 py-2.5 text-left"><Th column="riskScore">Risk</Th></th>
                  <th className="px-4 py-2.5 text-left"><Th column="requestedDate">Requested</Th></th>
                  <th className="px-4 py-2.5 text-left"><Th column="status">Status</Th></th>
                  <th className="px-4 py-2.5 text-left"><span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-500"><ArrowUpDown className="h-3 w-3" />Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.id}</td>
                    <td className="max-w-[220px] px-4 py-2.5">
                      <button
                        onClick={() => { setDetailRequest(r); setDrawerOpen(true); }}
                        className="line-clamp-1 text-left font-medium text-slate-800 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        title={`View ${r.id}`}
                      >
                        {r.assetName}
                      </button>
                      <p className="line-clamp-1 text-[11px] text-slate-400">{r.issue}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{r.location}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={priorityColor(r.priority)}>{r.priority}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${r.riskScore >= 80 ? "bg-red-100 text-red-700" : r.riskScore >= 60 ? "bg-amber-100 text-amber-700" : r.riskScore >= 40 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                        {r.riskScore}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{r.requestedDate}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setDetailRequest(r); setDrawerOpen(true); }}>Details</Button>
                        <WithPermission permission="maintenance.edit">
                          <Button variant="ghost" size="sm" onClick={() => { setEditRequest(r); setCreateOpen(true); }}>Edit</Button>
                        </WithPermission>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="font-medium text-slate-700">Page {page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Panel>

      <RequestFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        assetId={prefillAsset}
        request={editRequest}
        onSaved={reload}
      />

      <RequestDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        request={detailRequest}
        onEdit={() => { if (detailRequest) { setEditRequest(detailRequest); setCreateOpen(true); } }}
      />
    </div>
    </AccessGuard>
  );
}
