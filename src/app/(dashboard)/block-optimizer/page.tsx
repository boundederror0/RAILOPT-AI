"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarRange,
  Loader2,
  Sparkles,
  Shield,
  Info,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ListChecks,
  ChevronDown,
  Gauge,
  MousePointerClick,
  TrainIcon,
  FlaskConical,
} from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { api } from "@/lib/api";
import type { Block, BlockPlan, MaintenanceRequest, Priority } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { WorkflowBar } from "@/components/shared/workflow-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { priorityColor, minutesToHM, cn } from "@/lib/utils";

const WEIGHT: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

interface OptimizeTrace {
  requestId: string;
  chosenStart: number;
  chosenDuration: number;
  chosenPenalty: number;
  chosenMaxDelay: number;
  chosenSeverity: string;
  candidatesEvaluated: number;
  skippedReason?: string;
}

interface OptimizeResponse {
  plan: BlockPlan;
  trace: OptimizeTrace[];
  skippedCount: number;
}

export default function BlockOptimizerPage() {
  const { toast } = useToast();
  const { data, loading, error } = useFetch<{ requests: MaintenanceRequest[] }>(() => api.getRequests());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [params, setParams] = useState({
    blockStartOffset: 1,
    blockDuration: 1,
    maintenancePriority: "auto" as "auto" | Priority,
    maxTeams: 4,
    simultaneousBlocks: 1,
  });
  const [preselect, setPreselect] = useState<{ request: string | null; asset: string | null } | null>(null);
  const [contextNote, setContextNote] = useState<string | null>(null);
  const preselectApplied = useRef(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const request = q.get("request");
    const asset = q.get("asset");
    if (request || asset) {
      setPreselect({ request, asset });
      window.history.replaceState({}, "", "/block-optimizer");
    }
  }, []);

  const requests = data?.requests ?? [];
  const available = useMemo(
    () =>
      requests
        .filter((r) => ["Open", "In Review", "Approved"].includes(r.status))
        .sort((a, b) => WEIGHT[a.priority] - WEIGHT[b.priority] || b.riskScore - a.riskScore),
    [requests]
  );

  useEffect(() => {
    if (!preselect || preselectApplied.current) return;
    if (loading) return;
    const targets = preselect.request
      ? available.filter((r) => r.id === preselect.request)
      : preselect.asset
        ? available.filter((r) => r.assetId === preselect.asset)
        : [];
    if (targets.length === 0) {
      setContextNote(
        preselect.request
          ? `Maintenance request ${preselect.request} is not in the schedulable queue (Open / In Review / Approved only).`
          : `No open maintenance requests are currently linked to this asset. Create one from Maintenance Requests.`
      );
    } else {
      setSelected(new Set(targets.map((r) => r.id)));
      setContextNote(
        `${preselect.asset ? `Asset "${targets[0].assetName}"` : `Request ${preselect.request}`} pre-selected from a previous step — review it, tune the parameters, then generate the plan.`
      );
    }
    preselectApplied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect, loading, available]);

  const pendingCount = useMemo(
    () => requests.filter((r) => ["Open", "In Review", "Approved"].includes(r.status)).length,
    [requests]
  );

  const traceByRequest = useMemo(() => {
    const map = new Map<string, OptimizeTrace>();
    result?.trace.forEach((t) => map.set(t.requestId, t));
    return map;
  }, [result]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === available.length ? new Set() : new Set(available.map((r) => r.id))));
  };

  const run = async () => {
    if (selected.size === 0) {
      toast("No requests selected", { description: "Select at least one maintenance request to schedule.", variant: "warning" });
      return;
    }
    setRunning(true);
    setRunError(null);
    try {
      const res = await api.optimizeBlock<OptimizeResponse>({ requestIds: Array.from(selected), params });
      setResult(res);
      toast("Optimized block plan generated", {
        description: `${res.plan.totalRequestsScheduled} blocks planned, ${res.plan.estimatedDelay} min expected delay. Sent for approval.`,
        variant: "success",
      });
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Optimization failed.");
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Block Optimizer"
        subtitle="Deterministic scheduling engine — groups tasks, minimizes train conflict and prioritizes critical assets"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 py-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> AI recommends · human approves
            </Badge>
            <Button variant="amber" onClick={run} disabled={running || selected.size === 0}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarRange className="h-4 w-4" />}
              {running ? "Optimizing…" : "Generate Optimized Plan"}
            </Button>
          </div>
        }
      />

      <WorkflowBar current={2} context={{ asset: preselect?.asset || undefined }} />

      {contextNote && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          <MousePointerClick className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{contextNote}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Request selection */}
        <div className="lg:col-span-4">
          <Panel title="Select maintenance requests" description={`${pendingCount} schedulable requests`} className="h-full">
            <div className="mb-3 flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleAll} disabled={loading}>
                {selected.size === available.length ? "Deselect all" : "Select all"}
              </Button>
              <span className="text-sm text-slate-500">
                {selected.size} of {available.length} selected
              </span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : available.length === 0 ? (
              <EmptyState title="No schedulable requests" description="All requests are either completed, cancelled or not yet approved." />
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {available.map((r) => (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 transition-colors",
                      selected.has(r.id) ? "border-amber-300 bg-amber-50" : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      className="h-4 w-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-slate-500">{r.id}</p>
                      <p className="truncate text-sm font-medium text-slate-800">{r.assetName}</p>
                      <p className="truncate text-[11px] text-slate-500">{r.location} · {r.assetType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColor(r.priority)}>{r.priority}</Badge>
                      <Badge variant="outline" className="text-[10px]">
                        Risk {r.riskScore}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Parameters & optimization */}
        <div className="lg:col-span-8 space-y-4">
          <Panel title="Optimizer parameters" description="Tune the planning engine">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700" htmlFor="blockStartOffset">
                  Block start offset (hours from now)
                </label>
                <select
                  id="blockStartOffset"
                  value={params.blockStartOffset}
                  onChange={(e) => setParams({ ...params, blockStartOffset: Number(e.target.value) })}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 12, 24].map((h) => (
                    <option key={h} value={h}>
                      {h} hour{h === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700" htmlFor="blockDuration">
                  Block duration (hours)
                </label>
                <select
                  id="blockDuration"
                  value={params.blockDuration}
                  onChange={(e) => setParams({ ...params, blockDuration: Number(e.target.value) })}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 12].map((h) => (
                    <option key={h} value={h}>
                      {h} hour{h === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700" htmlFor="maintenancePriority">
                  Maintenance priority
                </label>
                <select
                  id="maintenancePriority"
                  value={params.maintenancePriority}
                  onChange={(e) => setParams({ ...params, maintenancePriority: e.target.value as "auto" | Priority })}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="auto">Auto (by risk score)</option>
                  <option value="Critical">Critical first</option>
                  <option value="High">High first</option>
                  <option value="Medium">Medium first</option>
                  <option value="Low">Low first</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700" htmlFor="maxTeams">
                  Max teams
                </label>
                <select
                  id="maxTeams"
                  value={params.maxTeams}
                  onChange={(e) => setParams({ ...params, maxTeams: Number(e.target.value) })}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-slate-700" htmlFor="simultaneousBlocks">
                  Max simultaneous blocks per location
                </label>
                <select
                  id="simultaneousBlocks"
                  value={params.simultaneousBlocks}
                  onChange={(e) => setParams({ ...params, simultaneousBlocks: Number(e.target.value) })}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {[1, 2, 3].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Panel>

          {runError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {runError}
            </div>
          )}

          {result && (
            <>
              <Panel title="Optimization result" description={`Trace ID: ${result.plan.id}`}>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-lg font-semibold text-slate-900">{result.plan.totalRequestsScheduled}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Blocks scheduled</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-lg font-semibold text-slate-900">{result.plan.totalBlockDuration} h</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Total block duration</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-lg font-semibold text-slate-900">{result.plan.trainsAffected}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Trains affected</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-lg font-semibold text-slate-900">{result.plan.estimatedDelay} min</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Expected delay</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="green" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Score: {result.plan.optimizationScore}/100
                  </Badge>
                  <Badge variant="blue" className="gap-1">
                    <ArrowRight className="h-3 w-3" />
                    Delay reduction: {result.plan.delayReduction} min
                  </Badge>
                  <Badge variant="amber" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Risk reduction: {result.plan.riskReduction} pts
                  </Badge>
                </div>
              </Panel>

              <Panel title="Explanation" description="Why these blocks were chosen and how the score was derived" className="prose prose-sm max-w-none">
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                  {result.plan.explanationFactors.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </Panel>

              <Panel title="Trace details" contentClassName="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-2">Request</th>
                        <th className="px-3 py-2">Start</th>
                        <th className="px-3 py-2">Duration</th>
                        <th className="px-3 py-2">Penalty</th>
                        <th className="px-3 py-2">Max delay</th>
                        <th className="px-3 py-2">Severity</th>
                        <th className="px-3 py-2">Candidates</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trace.map((t) => (
                        <tr key={t.requestId} className={cn("border-b border-slate-100", t.skippedReason && "bg-red-50/30")}>
                          <td className="px-3 py-2 font-mono text-xs text-slate-500">{t.requestId}</td>
                          <td className="px-3 py-2">
                            {new Date(Date.now() + t.chosenStart * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-3 py-2">{t.chosenDuration} min</td>
                          <td className="px-3 py-2 font-mono">{t.chosenPenalty}</td>
                          <td className="px-3 py-2">{t.chosenMaxDelay} min</td>
                          <td className="px-3 py-2">{t.chosenSeverity}</td>
                          <td className="px-3 py-2">{t.candidatesEvaluated}</td>
                          <td className="px-3 py-2">
                            {t.skippedReason ? (
                              <Badge variant="red" className="text-[10px]">
                                Skipped: {t.skippedReason}
                              </Badge>
                            ) : (
                              <Badge variant="green" className="text-[10px]">Scheduled</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/train-impact?block={result.plan.blocks[0]?.id}">View train impact</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/what-if?block={result.plan.blocks[0]?.id}">Run what-if</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setResult(null)}>New plan</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}