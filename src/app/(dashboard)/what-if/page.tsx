"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FlaskConical, Loader2, RefreshCw, TrendingDown, TrendingUp, ShieldCheck } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { api } from "@/lib/api";
import type { BlockPlan, MaintenanceRequest } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { WorkflowBar } from "@/components/shared/workflow-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { minutesToHM, cn } from "@/lib/utils";
import { AccessGuard } from "@/components/shared/access-guard";

type SimPlan = BlockPlan;

interface Controls {
  blockStartOffset: number;
  blockDuration: number;
  maintenancePriority: string;
  maxTeams: number;
  trainPriorityWeight: number;
  simultaneousBlocks: number;
}

const DEFAULT_CONTROLS: Controls = {
  blockStartOffset: 1,
  blockDuration: 1,
  maintenancePriority: "auto",
  maxTeams: 4,
  trainPriorityWeight: 1,
  simultaneousBlocks: 1,
};

export default function WhatIfPage() {
  const { data: requestsRes, loading: reqLoading } = useFetch<{ requests: MaintenanceRequest[] }>(() => api.getRequests());
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);
  const [baseline, setBaseline] = useState<SimPlan | null>(null);
  const [current, setCurrent] = useState<SimPlan | null>(null);
  const [running, setRunning] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [contextBlock, setContextBlock] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const b = q.get("block");
    if (b) {
      setContextBlock(b);
      window.history.replaceState({}, "", "/what-if");
    }
  }, []);

  const selectedIds = useMemo(() => {
    const requests = requestsRes?.requests ?? [];
    const eligible = requests.filter((r) => ["Open", "In Review", "Approved"].includes(r.status));
    return eligible
      .sort((a, b) => b.riskScore - a.riskScore || a.requestedDate.localeCompare(b.requestedDate))
      .slice(0, 6)
      .map((r) => r.id);
  }, [requestsRes]);

  const runSimulation = async (params: Controls) => {
    if (selectedIds.length === 0) return null;
    const res = await api.optimizeBlock<{ plan: SimPlan }>({ requestIds: selectedIds, params, simulate: true });
    return res.plan;
  };

  // Baseline on mount (default controls)
  useEffect(() => {
    if (selectedIds.length === 0 || baseline) return;
    api
      .optimizeBlock<{ plan: SimPlan }>({ requestIds: selectedIds, params: DEFAULT_CONTROLS, simulate: true })
      .then((res) => {
        setBaseline(res.plan);
        setCurrent(res.plan);
      })
      .catch(() => setBaseline(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  // Debounced resimulation whenever controls change
  useEffect(() => {
    if (!baseline) return;
    setDirty(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setRunning(true);
      try {
        const plan = await runSimulation(controls);
        if (plan) {
          setCurrent(plan);
          setDirty(false);
        }
      } catch {
        setDirty(false);
      } finally {
        setRunning(false);
      }
    }, 450);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, baseline]);

  const set = (patch: Partial<Controls>) => setControls((c) => ({ ...c, ...patch }));

  const metrics = useMemo(() => {
    if (!baseline || !current) return [];
    const rows = [
      { label: "Expected delay", before: `${baseline.estimatedDelay} min`, after: `${current.estimatedDelay} min`, better: current.estimatedDelay <= baseline.estimatedDelay },
      { label: "Affected trains", before: String(baseline.trainsAffected), after: String(current.trainsAffected), better: current.trainsAffected <= baseline.trainsAffected },
      { label: "Operational conflicts", before: String(conflictCount(baseline)), after: String(conflictCount(current)), better: conflictCount(current) <= conflictCount(baseline) },
      { label: "Blocks scheduled", before: String(baseline.totalRequestsScheduled), after: String(current.totalRequestsScheduled), better: current.totalRequestsScheduled >= baseline.totalRequestsScheduled },
      { label: "Risk reduction", before: `−${baseline.riskReduction} pts`, after: `−${current.riskReduction} pts`, better: current.riskReduction >= baseline.riskReduction },
      { label: "Asset availability", before: `+${baseline.assetAvailabilityImprovement}%`, after: `+${current.assetAvailabilityImprovement}%`, better: current.assetAvailabilityImprovement >= baseline.assetAvailabilityImprovement },
      { label: "Optimization score", before: `${baseline.optimizationScore}/100`, after: `${current.optimizationScore}/100`, better: current.optimizationScore >= baseline.optimizationScore },
    ];
    return rows;
  }, [baseline, current]);

  return (
    <AccessGuard requiredPermission="simulation.view">
      <div>
        <PageHeader
          title="What-If Simulation"
          subtitle="Tune planning parameters and watch the optimizer re-plan in near real time — no approvals created"
          actions={
            <Badge variant="outline" className="gap-1.5 py-1">
              <FlaskConical className="h-3.5 w-3.5 text-blue-600" /> Simulation mode — results are not persisted
            </Badge>
          }
        />

      <WorkflowBar current={4} context={{ block: contextBlock || undefined }} />

      {contextBlock && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-800">
          <p className="flex items-start gap-1.5">
            <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Simulating alternatives for <span className="font-mono font-semibold">{contextBlock}</span> from Train
              Impact. Scenarios are comparison-only: <strong>results are not persisted</strong>.
            </span>
          </p>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/train-impact?block=${contextBlock}`}>Back to train impact</Link>
          </Button>
        </div>
      )}

      {reqLoading || (!baseline && !reqLoading && selectedIds.length > 0) ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Skeleton className="h-[400px] lg:col-span-4" />
          <Skeleton className="h-[400px] lg:col-span-8" />
        </div>
      ) : selectedIds.length === 0 ? (
        <Panel title="Nothing to simulate">
          <p className="text-sm text-slate-500">Create maintenance requests first — the simulator needs open requests to plan.</p>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Controls */}
          <div className="lg:col-span-4">
            <Panel
              title="Simulation controls"
              description="Changes take effect automatically"
              action={running ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" /> : dirty ? <RefreshCw className="h-4 w-4 animate-spin text-amber-500" /> : <Badge variant="green">Live</Badge>}
            >
              <div className="space-y-4">
                <Slider
                  label="Block start offset"
                  hint="Hours from now the earliest block may start"
                  value={controls.blockStartOffset}
                  min={0}
                  max={6}
                  step={0.5}
                  onChange={(v) => set({ blockStartOffset: v })}
                />
                <Slider
                  label="Block duration multiplier"
                  hint="Scales every task duration (0.5x = compressed)"
                  value={controls.blockDuration}
                  min={0.5}
                  max={2.5}
                  step={0.1}
                  onChange={(v) => set({ blockDuration: v })}
                />
                <Slider
                  label="Number of maintenance teams"
                  hint="Teams that can be allocated in parallel"
                  value={controls.maxTeams}
                  min={1}
                  max={8}
                  step={1}
                  onChange={(v) => set({ maxTeams: v })}
                />
                <Slider
                  label="Train priority weight"
                  hint="How much high-priority trains dominate conflict score"
                  value={controls.trainPriorityWeight}
                  min={0.5}
                  max={2}
                  step={0.1}
                  onChange={(v) => set({ trainPriorityWeight: v })}
                />
                <Slider
                  label="Simultaneous blocks / location"
                  hint="Max possessions overlapping in one place"
                  value={controls.simultaneousBlocks}
                  min={1}
                  max={4}
                  step={1}
                  onChange={(v) => set({ simultaneousBlocks: v })}
                />
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700" htmlFor="sim-priority">Maintenance priority</label>
                  <Select value={controls.maintenancePriority} onValueChange={(v) => set({ maintenancePriority: v })}>
                    <SelectTrigger id="sim-priority">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Use request priority</SelectItem>
                      <SelectItem value="Critical">Force Critical</SelectItem>
                      <SelectItem value="High">Force High</SelectItem>
                      <SelectItem value="Low">Force Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setControls(DEFAULT_CONTROLS)}>
                    <RefreshCw className="h-3.5 w-3.5" /> Reset baseline
                  </Button>
                  <p className="text-[11px] text-slate-400">Simulating over {selectedIds.length} top-risk requests</p>
                </div>
              </div>
            </Panel>
          </div>

          {/* Results */}
          <div className="space-y-4 lg:col-span-8">
            {baseline && current && (
              <>
                <Panel title="Before vs after">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-2">Metric</th>
                          <th className="px-3 py-2">Baseline (defaults)</th>
                          <th className="px-3 py-2">After your changes</th>
                          <th className="px-3 py-2">Outcome</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map((m) => (
                          <tr key={m.label} className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-2 text-xs font-medium text-slate-700">{m.label}</td>
                            <td className="px-3 py-2 text-xs text-slate-500">{m.before}</td>
                            <td className="px-3 py-2 text-xs font-semibold text-slate-800">{m.after}</td>
                            <td className="px-3 py-2">
                              {m.before === m.after ? (
                                <Badge variant="outline">No change</Badge>
                              ) : (
                                <Badge variant={m.better ? "green" : "red"} className="gap-1">
                                  {m.better ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                                  {m.better ? "Improved" : "Worse"}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>

                <Panel title="Resulting schedule (current scenario)" description="Clicks are simulation-only; nothing is sent to approvals">
                  <div className="space-y-2">
                    {current.blocks.length === 0 && (
                      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                        No blocks could be scheduled under these constraints. Loosen a parameter (e.g. more teams or later start).
                      </p>
                    )}
                    {current.blocks.map((b) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-800">
                            {b.section} · {b.location}
                          </p>
                          <p className="font-mono text-[11px] text-slate-400">
                            {new Date(b.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}–
                            {new Date(b.endTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })} · {minutesToHM(b.durationMinutes)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            {b.affectedTrainIds.length} train{b.affectedTrainIds.length === 1 ? "" : "s"}
                          </span>
                          <span className={cn("text-xs font-semibold", b.expectedDelay > 30 ? "text-red-600" : b.expectedDelay > 10 ? "text-amber-600" : "text-emerald-600")}>
                            +{b.expectedDelay} min
                          </span>
                          <span className="text-xs font-semibold text-emerald-600">−{b.riskReduction} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-3">
                  <p className="max-w-xl text-xs text-slate-500">
                    Explored the trade-offs? The pending recommendation stays in the Approval Center for a human decision.
                    Simulation never changes the live plan.
                  </p>
                  <Button asChild variant="amber" size="sm">
                    <Link href="/approvals">
                      <ShieldCheck className="h-3.5 w-3.5" /> Review & approve
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </AccessGuard>
  );
}

function conflictCount(plan: SimPlan): number {
  return plan.blocks.reduce((s, b) => s + b.affectedTrainIds.length, 0);
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-700">{label}</label>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
          {(value * 10) % 10 === 0 ? value : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-500"
        aria-label={label}
      />
      <p className="text-[10px] text-slate-400">{hint}</p>
    </div>
  );
}
