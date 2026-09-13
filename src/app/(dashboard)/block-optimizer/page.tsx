"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarRange,
  Loader2,
  Sparkles,
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

interface Alternative {
  start: string;
  end: string;
  penalty: number;
  delayMinutes: number;
  trainConflicts: number;
  maxDelay: number;
  severity: string;
}

interface OptimizeTrace {
  requestId: string;
  chosenStart: string;
  chosenEnd: string;
  teamId: string;
  trainConflicts: number;
  delayMinutes: number;
  skippedReason?: string;
  candidatesEvaluated: number;
  skippedForEarliestStart: number;
  skippedForSection: number;
  chosenPenalty: number;
  chosenMaxDelay: number;
  chosenSeverity: string;
  alternatives: Alternative[];
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
        `${preselect.asset ? `Asset “${targets[0].assetName}”` : `Request ${preselect.request}`} pre-selected from a previous step — review it, tune the parameters, then generate the plan.`
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
          <Panel
            title="Maintenance requests"
            description={`${available.length} schedulable requests in queue`}
            contentClassName="p-0"
            className="h-full"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
              <span className="text-xs text-slate-500">
                {selected.size} selected
              </span>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selected.size === available.length && available.length > 0 ? "Clear all" : "Select all"}
              </Button>
            </div>
            {loading ? (
              <div className="space-y-1 p-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-red-600">{error}</div>
            ) : available.length === 0 ? (
              <div className="p-4">
                <EmptyState title="No schedulable requests" description="Create requests first or check for duplicates." />
              </div>
            ) : (
              <div className="scrollbar-thin max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
                {available.map((r) => {
                  const checked = selected.has(r.id);
                  return (
                    <label
                      key={r.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-slate-50",
                        checked && "bg-amber-50/60"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(r.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-amber-500"
                        aria-label={`Select ${r.id}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-medium text-slate-800">{r.assetName}</p>
                          <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", r.riskScore >= 80 ? "bg-red-100 text-red-700" : r.riskScore >= 60 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
                            {r.riskScore}
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-slate-400">{r.section} · {minutesToHM(r.estimatedDuration)}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Badge className={priorityColor(r.priority)}>{r.priority}</Badge>
                          <span className="font-mono text-[10px] text-slate-400">{r.id}</span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                          checked ? "border-amber-500 bg-amber-500 text-white" : "border-slate-300"
                        )}
                        aria-hidden
                      >
                        {checked && <CheckCircle2 className="h-3 w-3" />}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-4 lg:col-span-8">
          {/* Parameters */}
          <Panel title="Optimizer parameters" description="Constraints applied by the engine during scheduling">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <ParamNumber label="Plan start (h from now)" value={params.blockStartOffset} min={0} max={6} step={1} onChange={(v) => setParams((p) => ({ ...p, blockStartOffset: v }))} />
              <ParamNumber label="Duration multiplier" value={params.blockDuration} min={0.5} max={2.5} step={0.5} onChange={(v) => setParams((p) => ({ ...p, blockDuration: v }))} />
              <ParamNumber label="Max teams" value={params.maxTeams} min={1} max={8} step={1} onChange={(v) => setParams((p) => ({ ...p, maxTeams: v }))} />
              <ParamNumber label="Simultaneous blocks / location" value={params.simultaneousBlocks} min={1} max={4} step={1} onChange={(v) => setParams((p) => ({ ...p, simultaneousBlocks: v }))} />
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-600" htmlFor="prio">Priority mode</label>
                <select
                  id="prio"
                  value={params.maintenancePriority}
                  onChange={(e) => setParams((p) => ({ ...p, maintenancePriority: e.target.value as typeof params.maintenancePriority }))}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="auto">Use request priority</option>
                  <option value="Critical">Force Critical</option>
                  <option value="High">Force High</option>
                  <option value="Medium">Force Medium</option>
                  <option value="Low">Force Low</option>
                </select>
              </div>
            </div>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
              <Info className="h-3 w-3" /> The engine searches 30-minute slots, weighs train conflicts by train priority, prefers adjacent grouping and night windows. {pendingCount} requests in this queue.
            </p>
          </Panel>

          {runError && (
            <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {runError}
            </div>
          )}

          {!result ? (
            <EmptyState
              title={pendingCount === 0 ? "No schedulable maintenance requests" : "Generate your first optimized block plan"}
              description={
                pendingCount === 0
                  ? "Create maintenance requests before running the optimizer."
                  : "Select requests on the left, adjust parameters, then run the optimizer. The engine returns a plan with full reasoning and sends it to the approval queue."
              }
              action={
                <Button asChild variant="amber" size="sm">
                  <Link href="/maintenance-requests">
                    Create / Open maintenance request <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              }
              className="min-h-[340px]"
            />
          ) : (
            <>
              <OptimizationSummary plan={result.plan} />
              <PlanTable
                plan={result.plan}
                traceByRequest={traceByRequest}
                simultaneousBlocks={params.simultaneousBlocks}
                startOffset={params.blockStartOffset}
              />
              <ExplainabilityPanel plan={result.plan} />
              <SkippedPanel trace={result.trace} requests={requests} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ParamNumber({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-600" htmlFor={label}>
        {label}
      </label>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(min, Number((value - step).toFixed(1))))}
          className="h-9 w-7 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          id={label}
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-center text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          onClick={() => onChange(Math.min(max, Number((value + step).toFixed(1))))}
          className="h-9 w-7 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function OptimizationSummary({ plan }: { plan: BlockPlan }) {
  const stats = [
    { label: "Requests scheduled", value: plan.totalRequestsScheduled },
    { label: "Total block duration", value: minutesToHM(plan.totalBlockDuration) },
    { label: "Trains affected", value: plan.trainsAffected },
    { label: "Estimated delay", value: `${plan.estimatedDelay} min` },
    { label: "Delay reduction", value: `−${plan.delayReduction} min` },
    { label: "Availability improvement", value: `+${plan.assetAvailabilityImprovement}%` },
    { label: "Risk reduction", value: `−${plan.riskReduction} pts` },
  ];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Optimization summary</h3>
            <Badge variant="green">Optimization score {plan.optimizationScore}/100</Badge>
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-slate-400">{plan.id} · generated {new Date(plan.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md bg-slate-50 px-2.5 py-2 text-center">
            <p className="text-base font-semibold text-slate-900">{s.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanTable({
  plan,
  traceByRequest,
  simultaneousBlocks,
  startOffset,
}: {
  plan: BlockPlan;
  traceByRequest: Map<string, OptimizeTrace>;
  simultaneousBlocks: number;
  startOffset: number;
}) {
  return (
    <Panel
      title="Optimized block schedule"
      description="Proposed possession windows — grouped and sequenced by the engine"
      contentClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-2.5">Task</th>
              <th className="px-4 py-2.5">Start</th>
              <th className="px-4 py-2.5">End</th>
              <th className="px-4 py-2.5">Location</th>
              <th className="px-4 py-2.5">Team</th>
              <th className="px-4 py-2.5">Trains</th>
              <th className="px-4 py-2.5">Delay</th>
              <th className="px-4 py-2.5">Priority</th>
              <th className="px-4 py-2.5">Risk ↓</th>
            </tr>
          </thead>
          <tbody>
            {plan.blocks.map((b) => {
              const tr = traceByRequest.get(b.requestId);
              return (
                <React.Fragment key={b.id}>
                  <tr className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="max-w-[180px] px-4 py-2.5">
                      <p className="truncate text-xs font-medium text-slate-800">{b.id}</p>
                      <p className="truncate font-mono text-[10px] text-slate-400">{b.requestId}</p>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{new Date(b.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{new Date(b.endTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{b.location}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{b.teamName}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {b.affectedTrainIds.length ? b.affectedTrainIds.slice(0, 3).map((t) => (
                          <Badge key={t} variant="secondary" className="font-mono">{t}</Badge>
                        )) : <span className="text-[11px] text-slate-400">0</span>}
                        {b.affectedTrainIds.length > 3 && <Badge variant="secondary">+{b.affectedTrainIds.length - 3}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-xs font-semibold", b.expectedDelay > 30 ? "text-red-600" : b.expectedDelay > 10 ? "text-amber-600" : "text-emerald-600")}>
                        {b.expectedDelay > 0 ? `${b.expectedDelay} min` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={priorityColor(b.priority)}>{b.priority}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-emerald-600">−{b.riskReduction} pts</td>
                  </tr>
                  {tr && (
                    <tr className="border-b border-slate-100">
                      <td colSpan={9} className="bg-slate-50/40 px-4 py-2">
                        <BlockReason block={b} tr={tr} simultaneousBlocks={simultaneousBlocks} startOffset={startOffset} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {plan.blocks.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">
                  No blocks could be scheduled under the given constraints.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {plan.totalRequestsScheduled === 0 ? null : (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <ListChecks className="h-3.5 w-3.5" />
            This plan was created as a pending recommendation.
          </p>
          <Button asChild variant="amber" size="sm">
            <Link href="/approvals">
              Review & approve <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </Panel>
  );
}

function ExplainabilityPanel({ plan }: { plan: BlockPlan }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Sparkles className="h-4 w-4 text-emerald-600" />
        Why was this schedule selected?
      </h3>
      <ul className="mt-3 space-y-2">
        {plan.explanationFactors.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-start gap-2 rounded-md bg-white p-3 text-xs text-slate-500">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <span>
          The optimizer is deterministic: identical inputs always produce the same plan. Swap the service
          for a commercial solver or ML heuristic later without changing the API contract.
        </span>
      </div>
    </div>
  );
}

function BlockReason({
  block,
  tr,
  simultaneousBlocks,
  startOffset,
}: {
  block: Block;
  tr: OptimizeTrace;
  simultaneousBlocks: number;
  startOffset: number;
}) {
  const hasAlt = tr.alternatives.length > 0;
  const basis = [
    { label: `Duration ${block.durationMinutes} min`, note: "within the 30–360 min bound for the request" },
    { label: `Starts at ${tr.chosenStart}`, note: `at least ${startOffset} h after the plan start` },
    { label: `At most ${simultaneousBlocks} simultaneous block${simultaneousBlocks === 1 ? "" : "s"} per section`, note: "this window clears the section-occupancy constraint" },
    { label: `Team: ${block.teamName}`, note: "closest available team within travel/load constraints" },
  ];
  const comparison = [
    { label: "Selected", start: tr.chosenStart, end: tr.chosenEnd, trains: tr.trainConflicts, delay: tr.delayMinutes, maxDelay: tr.chosenMaxDelay, severity: tr.chosenSeverity },
    ...tr.alternatives.map((a, i) => ({ label: `Alternative ${i + 1}`, start: a.start, end: a.end, trains: a.trainConflicts, delay: a.delayMinutes, maxDelay: a.maxDelay, severity: a.severity })),
  ];
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900">
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-180" />
        Why this window?
      </summary>
      <div className="mt-2 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-slate-100 bg-white p-2.5 text-xs">
          <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-slate-700">
            <ListChecks className="h-3.5 w-3.5 text-emerald-600" />
            Feasibility
          </p>
          <ul className="space-y-1 text-slate-600">
            {basis.map((it) => (
              <li key={it.label} className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>
                  <span className="font-medium text-slate-700">{it.label}</span> — {it.note}
                </span>
              </li>
            ))}
            <li className="flex items-start gap-1.5">
              <Gauge className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>
                <span className="font-medium text-slate-700">{tr.candidatesEvaluated} of 48 half-hour slots scored</span>{" "}
                ({tr.skippedForEarliestStart} before earliest start, {tr.skippedForSection} already occupied); objective penalty{" "}
                <span className="font-medium text-slate-700">{tr.chosenPenalty}</span>, ties broken by earliest start.
              </span>
            </li>
          </ul>
        </div>
        <div className="rounded-md border border-slate-100 bg-white p-2.5 text-xs">
          <p className="mb-1.5 flex items-center gap-1.5 font-semibold text-slate-700">
            <Info className="h-3.5 w-3.5 text-sky-600" />
            Impact
          </p>
          <p className="text-slate-600">
            {tr.delayMinutes} min expected total delay across {tr.trainConflicts} train(s) · max single-train delay{" "}
            <span className="font-medium text-slate-700">{tr.chosenMaxDelay} min ({tr.chosenSeverity})</span>
          </p>
          {hasAlt && (
            <div className="mt-2.5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Next-best windows (as scored by the same objective)
              </p>
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-slate-400">
                    <th className="pb-1 pr-2 font-medium">Window</th>
                    <th className="pb-1 pr-2 font-medium">Trains</th>
                    <th className="pb-1 pr-2 font-medium">Total delay</th>
                    <th className="pb-1 pr-2 font-medium">Max delay</th>
                    <th className="pb-1 font-medium">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.label} className={row.label === "Selected" ? "border-t border-emerald-200/70 text-slate-800" : "text-slate-600"}>
                      <td className="py-0.5 pr-2">
                        <span className="font-medium">{row.label}</span>{" "}
                        <span className="font-mono text-slate-400">{row.start}–{row.end}</span>
                      </td>
                      <td className="py-0.5 pr-2">{row.trains}</td>
                      <td className="py-0.5 pr-2">{row.delay} min</td>
                      <td className="py-0.5 pr-2">{row.maxDelay} min</td>
                      <td className="py-0.5">{row.severity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/train-impact?block=${block.id}`}>
            <TrainIcon className="h-3.5 w-3.5" /> View train impact
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/what-if?block=${block.id}`}>
            <FlaskConical className="h-3.5 w-3.5" /> Simulate windows
          </Link>
        </Button>
      </div>
    </details>
  );
}

function SkippedPanel({ trace, requests }: { trace: OptimizeTrace[]; requests: MaintenanceRequest[] }) {
  const skipped = trace.filter((t) => t.skippedReason);
  if (skipped.length === 0) return null;
  return (
    <Panel title="Deferred requests" description="Requests the optimizer could not schedule in this cycle">
      <ul className="space-y-2">
        {skipped.map((t) => {
          const req = requests.find((r) => r.id === t.requestId);
          return (
            <li key={t.requestId} className="flex items-start gap-2.5 rounded-md border border-amber-100 bg-amber-50/50 p-2.5 text-xs">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="font-medium text-slate-800">
                  {t.requestId}
                  {req ? ` — ${req.assetName}` : null}
                </p>
                <p className="text-slate-600">{t.skippedReason}</p>
                {t.candidatesEvaluated > 0 && (
                  <p className="mt-0.5 text-slate-500">
                    Best-scored window had penalty {t.chosenPenalty} ({t.chosenMaxDelay} min max delay, {t.chosenSeverity}).
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}