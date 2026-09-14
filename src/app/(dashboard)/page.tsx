"use client";

import Link from "next/link";
import {
  Wrench,
  Boxes,
  Train,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { api } from "@/lib/api";
import type { Approval, DashboardData } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { StationBoard } from "@/components/operations/station-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, priorityColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

const HEALTH_COLORS: Record<string, string> = {
  Excellent: "#0e2a47",
  Good: "#15803d",
  Fair: "#b45309",
  Poor: "#b91c1c",
  Critical: "#7f1d1d",
};

export default function DashboardPage() {
  const { data, loading, error } = useFetch<
    DashboardData & { blockStatusBreakdown: { active: number; approved: number; proposed: number } }
  >(() => api.getDashboard());
  const { data: approvalData } = useFetch<{ approvals: Approval[] }>(() => api.getApprovals());

  if (loading) return <DashboardSkeleton />;

  const activeBlocks = data?.blockStatusBreakdown
    ? data.blockStatusBreakdown.active + data.blockStatusBreakdown.approved
    : null;
  const pendingApprovals = (approvalData?.approvals ?? []).filter(
    (a) => a.status === "Pending"
  );

  return (
    <div>
      <PageHeader
        title="Operational Dashboard"
        subtitle="Railway Maintenance & Block Planning · Southern Railway, Madurai Division"
        actions={
          <Button variant="amber" asChild className="gap-1.5">
            <Link href="/block-optimizer">
              Open Optimizer <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Failed to load dashboard data: {error}. Showing empty state — please try again.
        </div>
      )}

      {data && (
        <>
          {/* Operational KPI strip */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              label="Open Maintenance Requests"
              value={data.activeMaintenanceRequests}
              icon={Wrench}
              sub="open across the division"
            />
            <KpiCard
              label="Active Blocks"
              value={activeBlocks ?? "—"}
              icon={Boxes}
              sub="approved & in-service possessions"
            />
            <KpiCard
              label="Trains Affected"
              value={data.trainsAffected}
              icon={Train}
              sub="across current block plans"
            />
            <KpiCard
              label="Pending Approvals"
              value={pendingApprovals.length}
              icon={CheckCircle2}
              sub="awaiting decision"
            />
          </div>

          {/* Block pipeline strip */}
          {data.blockStatusBreakdown && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <Boxes className="h-4 w-4 text-slate-400" />
              <span className="font-medium">Block pipeline:</span>
              <Badge variant="blue">{data.blockStatusBreakdown.active} active in field</Badge>
              <Badge variant="green">{data.blockStatusBreakdown.approved} approved</Badge>
              <Badge variant="amber">{data.blockStatusBreakdown.proposed} awaiting approval</Badge>
              <span className="ml-auto text-slate-400">
                Reminder: all AI-generated plans require human approval.
              </span>
            </div>
          )}

          {/* Station operations board */}
          <div className="mt-4">
            <StationBoard />
          </div>

          {/* Asset health + planned blocks */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Panel
              title="Asset Health Overview"
              description="Fleet condition across 36 registered assets"
              className="lg:col-span-5"
            >
              <div className="space-y-2.5">
                {data.assetHealthOverview.map((row) => (
                  <div key={row.name} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs font-medium text-slate-600">
                      {row.name}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700")}
                        style={{
                          width: `${(row.count / 36) * 100}%`,
                          background: HEALTH_COLORS[row.name] ?? row.color,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-semibold text-slate-700">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-500">
                <p className="font-medium text-slate-700">Interpretation</p>
                <p className="mt-1">
                  {(() => {
                    const degraded = data.assetHealthOverview
                      .filter((a) => a.name === "Critical" || a.name === "Poor")
                      .reduce((s, a) => s + a.count, 0);
                    return `${degraded} assets are in degraded condition and contribute heavily to the current average risk of ${data.averageDelayRisk}/100. ${data.assetAvailability}% of the fleet is currently available.`;
                  })()}
                </p>
              </div>
            </Panel>

            <Panel
              title="Today's Planned Blocks"
              description="Approved & proposed possessions"
              className="lg:col-span-7"
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/block-optimizer">
                    View optimizer <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              }
            >
              <BlockList />
            </Panel>
          </div>

          {/* Recent activity + approvals/alerts */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Panel
              title="Recent Maintenance Requests"
              description="Latest raised requests across the division"
              className="lg:col-span-7"
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/maintenance-requests">
                    All requests <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-2">Request</th>
                      <th className="px-3 py-2">Asset</th>
                      <th className="px-3 py-2">Location</th>
                      <th className="px-3 py-2">Priority</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentRequests.slice(0, 5).map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-3 py-2 font-mono text-xs text-slate-500">{r.id}</td>
                        <td className="px-3 py-2 text-slate-800">{r.assetName}</td>
                        <td className="px-3 py-2 text-slate-600">{r.location}</td>
                        <td className="px-3 py-2">
                          <Badge className={priorityColor(r.priority)}>{r.priority}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="grid grid-cols-1 gap-4 lg:col-span-5">
              <Panel
                title="Pending Approvals"
                description="Awaiting stakeholder decision"
                action={
                  pendingApprovals.length > 0 ? (
                    <Badge variant="amber" className="h-5 px-1.5 text-[11px]">
                      {pendingApprovals.length}
                    </Badge>
                  ) : undefined
                }
              >
                <div className="space-y-2.5">
                  {pendingApprovals.slice(0, 4).map((a) => (
                    <div key={a.id} className="rounded-md border border-slate-100 p-2.5">
                      <p className="text-xs font-medium text-slate-800">{a.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {a.type} · {a.benefit}
                      </p>
                    </div>
                  ))}
                  {pendingApprovals.length === 0 && (
                    <div className="rounded-md border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                      No pending approvals.
                    </div>
                  )}
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href="/approvals">Go to Approvals</Link>
                  </Button>
                </div>
              </Panel>

              <Panel title="Critical Alerts" description="Requires operator attention">
                <div className="space-y-2.5">
                  {data.criticalAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-2.5 rounded-md border border-slate-100 p-2.5"
                    >
                      <AlertTriangle
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          alert.severity === "Critical"
                            ? "text-red-500"
                            : alert.severity === "High"
                              ? "text-amber-500"
                              : "text-amber-500"
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-700">{alert.message}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {alert.severity} · {alert.time}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href="/emergency">Go to Emergency Replanning</Link>
                  </Button>
                </div>
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BlockList() {
  const { data, loading } = useFetch<{
    blocks: { id: string; location: string; startTime: string; endTime: string; priority: string; status: string }[];
  }>(() => api.getBlocks());

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const blocks = (data?.blocks ?? []).filter((b) => {
    const d = new Date(b.startTime);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  });

  if (blocks.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
        No blocks planned for today yet. Open the optimizer to create a plan.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {blocks.map((b) => (
        <div key={b.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-600">
              {b.startTime.slice(11, 16)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-800">{b.location}</p>
              <p className="text-[11px] text-slate-400">
                {b.startTime.slice(11, 16)}–{b.endTime.slice(11, 16)} · {b.priority} priority
              </p>
            </div>
          </div>
          <StatusBadge status={b.status} />
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-64" />
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="mt-4">
        <Skeleton className="h-[320px] w-full" />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Skeleton className="h-[240px] lg:col-span-5" />
        <Skeleton className="h-[240px] lg:col-span-7" />
      </div>
    </div>
  );
}