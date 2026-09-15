"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FlaskConical,
  Loader2,
  ShieldCheck,
  Train,
  Clock,
  AlertTriangle,
  ArrowRight,
  Info,
  CalendarClock,
  CheckCircle2,
  Ban,
  MoveRight,
} from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { api, ApiError } from "@/lib/api";
import type { Block, MaintenanceRequest, SimulationImpactRow, SimulationScenario, SimulationScenarioResult } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { WorkflowBar } from "@/components/shared/workflow-bar";
import { KpiCard } from "@/components/shared/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { minutesToHM, cn, formatTime } from "@/lib/utils";
import { AccessGuard, ActionButton } from "@/components/shared/access-guard";
import { StatusBadge } from "@/components/shared/status-badge";
import { toDate } from "@/lib/time";

const SCENARIOS: { key: SimulationScenario; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "accept", label: "Accept proposed block", hint: "Hold the block as planned at its proposed window.", icon: CheckCircle2 },
  { key: "move", label: "Move block", hint: "Shift the block to an alternative time slot.", icon: MoveRight },
  { key: "defer", label: "Defer block", hint: "Postpone; zero train impact while unscheduled.", icon: Clock },
  { key: "reject", label: "Reject block", hint: "Do not run the block; request stays open.", icon: Ban },
];

export default function WhatIfPage() {
  const { data: requestsRes, loading: reqLoading, error: reqError, reload: reloadRequests } = useFetch<{ requests: MaintenanceRequest[] }>(() => api.getRequests());
  const { data: blocksRes, error: blocksError } = useFetch<{ blocks: Block[] }>(() => api.getBlocks());

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<SimulationScenario>("accept");
  const [alternativeTime, setAlternativeTime] = useState<string>("14:00");
  const [result, setResult] = useState<SimulationScenarioResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contextBlock = useRef<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const b = q.get("block");
    if (b) {
      contextBlock.current = b;
      window.history.replaceState({}, "", "/what-if");
    }
  }, []);

  const requests = useMemo(() => requestsRes?.requests ?? [], [requestsRes]);
  const blocks = useMemo(() => blocksRes?.blocks ?? [], [blocksRes]);

  const eligible = useMemo(
    () =>
      requests
        .filter((r) => ["Open", "In Review", "Approved", "Scheduled", "In Progress"].includes(r.status))
        .sort((a, b) => b.riskScore - a.riskScore || a.requestedDate.localeCompare(b.requestedDate)),
    [requests]
  );

  useEffect(() => {
    if (selectedRequestId || eligible.length === 0) return;
    if (contextBlock.current) {
      const b = blocks.find((x) => x.id === contextBlock.current);
      if (b && eligible.some((r) => r.id === b.requestId)) {
        setSelectedRequestId(b.requestId);
        return;
      }
    }
    setSelectedRequestId(eligible[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, blocks]);

  const selectedRequest = useMemo(() => requests.find((r) => r.id === selectedRequestId) ?? null, [requests, selectedRequestId]);
  const requestAnchorBlock = useMemo(
    () => (selectedRequest ? blocks.find((b) => b.requestId === selectedRequest.id && b.status !== "Cancelled") ?? null : null),
    [blocks, selectedRequest]
  );

  const runTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (runTimer.current) clearTimeout(runTimer.current);
  }, []);

  const run = async () => {
    if (!selectedRequest || running) return;
    setRunning(true);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const moveTime = scenario === "move" && selectedRequest ? `${selectedRequest.requestedDate}T${alternativeTime}` : undefined;

    try {
      const res = await api.runSimulation<{ result: SimulationScenarioResult }>(
        {
          requestId: selectedRequest.id,
          scenario,
          alternativeStartTime: moveTime,
        },
        controller.signal
      );
      setResult(res.result);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("The simulation took too long and was stopped. Please try again.");
      } else if (e instanceof ApiError && e.status === 403) {
        setError("You are not authorised to run simulations for this request.");
      } else {
        setError(e instanceof Error ? e.message : "Simulation could not be completed. Please check the selected block and try again.");
      }
    } finally {
      clearTimeout(timeout);
      setRunning(false);
    }
  };

  const loading = reqLoading || (!selectedRequest && eligible.length > 0);

  return (
    <AccessGuard requiredPermission="simulation.view">
      <div>
        <PageHeader
          title="What-If Simulation"
          subtitle="Evaluate a maintenance block before it runs — results are comparison-only and never persisted"
          actions={
            <Badge variant="outline" className="gap-1.5 py-1">
              <FlaskConical className="h-3.5 w-3.5 text-blue-600" /> Simulation mode — no operational changes
            </Badge>
          }
        />

        <WorkflowBar
          current={4}
          context={{
            block: contextBlock.current ? contextBlock.current : requestAnchorBlock?.id || undefined,
          }}
        />

        {contextBlock.current && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-800">
            <p className="flex items-start gap-1.5">
              <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Simulating scenarios for <span className="font-mono font-semibold">{contextBlock.current}</span> from Train
                Impact. Scenarios are comparison-only: <strong>nothing is persisted</strong>.
              </span>
            </p>
            <Button asChild variant="ghost" size="sm">
              <Link href={"/train-impact"}>Back to train impact</Link>
            </Button>
          </div>
        )}

        {reqError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <p className="font-medium">Could not load maintenance requests.</p>
            <p className="mt-0.5">{reqError}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={reloadRequests}>Retry</Button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Skeleton className="h-[420px] lg:col-span-4" />
            <Skeleton className="h-[360px] lg:col-span-8" />
          </div>
        ) : eligible.length === 0 ? (
          <EmptyState
            title="Nothing to simulate"
            description="Create maintenance requests first — the simulator needs an open (or scheduled) request to evaluate. Simulation never persists operational changes."
            action={
              <Button asChild variant="amber" size="sm">
                <Link href="/maintenance-requests">Open maintenance requests</Link>
              </Button>
            }
            className="min-h-[320px]"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Controls */}
            <div className="lg:col-span-4">
              <Panel title="Scenario" description="Choose what happens to the block">
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run();
                  }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="request-select">Maintenance request</Label>
                    <Select value={selectedRequest?.id ?? ""} onValueChange={(v) => { setSelectedRequestId(v); setResult(null); }}>
                      <SelectTrigger id="request-select">
                        <SelectValue placeholder="Select a request" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligible.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.id} — {r.assetName} ({r.section})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedRequest && (
                      <p className="text-[11px] text-slate-400">
                        Risk {selectedRequest.riskScore} · {selectedRequest.priority} priority · est. {minutesToHM(selectedRequest.estimatedDuration)}
                        {requestAnchorBlock && ` · ${requestAnchorBlock.id} ${requestAnchorBlock.startTime.slice(11, 16)}–${requestAnchorBlock.endTime.slice(11, 16)}`}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Scenario</Label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {SCENARIOS.map((s) => {
                        const Icon = s.icon;
                        const active = scenario === s.key;
                        return (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => setScenario(s.key)}
                            aria-pressed={active}
                            className={cn(
                              "flex items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
                              active ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white hover:border-slate-300"
                            )}
                          >
                            <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", active ? "text-amber-600" : "text-slate-400")} />
                            <span className="min-w-0">
                              <span className={cn("block text-xs font-medium", active ? "text-amber-800" : "text-slate-700")}>{s.label}</span>
                              <span className="block text-[10px] text-slate-400">{s.hint}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {scenario === "move" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="move-time">Alternative start time</Label>
                      <Input id="move-time" type="time" value={alternativeTime} onChange={(e) => setAlternativeTime(e.target.value)} />
                      <p className="text-[10px] text-slate-400">
                        Duration stays at the request&apos;s estimate ({minutesToHM(selectedRequest?.estimatedDuration ?? 60)}).
                        The comparison shows your proposal against the original window.
                      </p>
                    </div>
                  )}

                  {error && (
                    <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                      {error}
                    </p>
                  )}

                  <ActionButton
                    type="submit"
                    permission="simulation.run"
                    variant="amber"
                    className="w-full"
                    disabled={running || !selectedRequest}
                    size="lg"
                  >
                    {running ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Running simulation…</span>
                        <span className="sm:hidden">Running…</span>
                      </>
                    ) : (
                      <>
                        <FlaskConical className="h-4 w-4" />
                        Run simulation
                      </>
                    )}
                  </ActionButton>

                  <p className="flex items-start gap-1.5 text-[10px] text-slate-400">
                    <Info className="mt-0.5 h-3 w-3 shrink-0" />
                    Requires the simulation.run permission. Results are read-only — approval happens later in the
                    Approval Center.
                  </p>
                </form>
              </Panel>
            </div>

            {/* Results */}
            <div className="space-y-4 lg:col-span-8">
              {running ? (
                <Panel title="Running simulation">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                    <p className="mt-3 text-sm font-medium text-slate-700">Evaluating affected trains…</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {eligible.length} request{eligible.length === 1 ? "" : "s"} · single-window impact analysis
                    </p>
                  </div>
                </Panel>
              ) : blocksError ? (
                <Panel title="Unable to prepare scenarios">
                  <p className="text-sm text-red-700">{blocksError}</p>
                </Panel>
              ) : !result ? (
                <EmptyState
                  title="No scenario evaluated"
                  description="Pick a request and a scenario (accept, move, defer or reject the block), then press Run simulation. Results are comparison-only and are never persisted."
                  action={
                    <p className="flex items-center gap-1.5 text-xs text-slate-400">
                      <ArrowRight className="h-3.5 w-3.5" /> Choose a scenario on the left
                    </p>
                  }
                  className="min-h-[320px]"
                />
              ) : (
                <>
                  {/* KPI grid */}
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <KpiCard
                      label="Trains affected"
                      value={result.kpis.trainsAffected}
                      sub={`of ${result.impacts.length} assessed`}
                      icon={Train}
                    />
                    <KpiCard
                      label="Maximum delay"
                      value={`${result.kpis.maxDelay} min`}
                      sub="worst single train"
                      icon={Clock}
                    />
                    <KpiCard
                      label="Total delay"
                      value={`${result.kpis.totalDelay} min`}
                      sub="across affected trains"
                      icon={AlertTriangle}
                    />
                    <KpiCard
                      label="Operational conflicts"
                      value={result.kpis.conflicts}
                      sub="overlapping approved blocks"
                      icon={CalendarClock}
                      className={result.kpis.conflicts > 0 ? "border-red-200" : undefined}
                    />
                  </div>

                  {/* Decision summary */}
                  <Panel title="Decision summary" description={`Scenario: ${scenario.toUpperCase()}`}>
                    <p className="text-sm text-slate-800">{result.summary}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>
                        Proposed window:{" "}
                        <span className="font-mono">
                          {formatTime(toDate(result.proposedWindow.startTime))}–{formatTime(toDate(result.proposedWindow.endTime))}
                        </span>
                      </span>
                      {result.chosenWindow && (
                        <span>
                          Evaluated window:{" "}
                          <span className="font-mono">
                            {formatTime(toDate(result.chosenWindow.startTime))}–{formatTime(toDate(result.chosenWindow.endTime))}
                          </span>
                        </span>
                      )}
                      <StatusBadge status={result.kpis.blockStatus === "Proposed (simulation only)" ? "Proposed" : result.kpis.blockStatus} />
                    </div>
                  </Panel>

                  {/* Comparison */}
                  {result.comparison && (
                    <Panel title="Proposed vs chosen" description="Trains affected · max delay · total delay">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                              <th className="px-3 py-2">Metric</th>
                              <th className="px-3 py-2">Proposed window</th>
                              <th className="px-3 py-2">Chosen scenario</th>
                              <th className="px-3 py-2">Difference</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-2 text-xs font-medium text-slate-700">Trains affected</td>
                              <td className="px-3 py-2 text-xs text-slate-500">{result.comparison.proposed.trainsAffected}</td>
                              <td className="px-3 py-2 text-xs font-semibold text-slate-800">{result.comparison.chosen.trainsAffected}</td>
                              <td className={cn("px-3 py-2 text-xs font-semibold", result.comparison.chosen.trainsAffected <= result.comparison.proposed.trainsAffected ? "text-emerald-600" : "text-red-600")}>
                                {result.comparison.chosen.trainsAffected - result.comparison.proposed.trainsAffected > 0 ? "+" : ""}
                                {result.comparison.chosen.trainsAffected - result.comparison.proposed.trainsAffected}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-2 text-xs font-medium text-slate-700">Maximum delay</td>
                              <td className="px-3 py-2 text-xs text-slate-500">{result.comparison.proposed.maxDelay} min</td>
                              <td className="px-3 py-2 text-xs font-semibold text-slate-800">{result.comparison.chosen.maxDelay} min</td>
                              <td className={cn("px-3 py-2 text-xs font-semibold", result.comparison.chosen.maxDelay <= result.comparison.proposed.maxDelay ? "text-emerald-600" : "text-red-600")}>
                                {result.comparison.chosen.maxDelay - result.comparison.proposed.maxDelay > 0 ? "+" : ""}
                                {result.comparison.chosen.maxDelay - result.comparison.proposed.maxDelay} min
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100 last:border-0">
                              <td className="px-3 py-2 text-xs font-medium text-slate-700">Total delay</td>
                              <td className="px-3 py-2 text-xs text-slate-500">{result.comparison.proposed.totalDelay} min</td>
                              <td className="px-3 py-2 text-xs font-semibold text-slate-800">{result.comparison.chosen.totalDelay} min</td>
                              <td className={cn("px-3 py-2 text-xs font-semibold", result.comparison.chosen.totalDelay <= result.comparison.proposed.totalDelay ? "text-emerald-600" : "text-red-600")}>
                                {result.comparison.chosen.totalDelay - result.comparison.proposed.totalDelay > 0 ? "+" : ""}
                                {result.comparison.chosen.totalDelay - result.comparison.proposed.totalDelay} min
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </Panel>
                  )}

                  {/* Recommendation */}
                  <Panel title="Recommendation" description="Deterministic, reference-style guidance — a human decides in Approval Center">
                    <p className="text-sm text-slate-700">{result.recommendation}</p>
                  </Panel>

                  {/* Train impact table */}
                  <Panel title="Affected trains" description={`${result.impacts.length} train${result.impacts.length === 1 ? "" : "s"} in the evaluated window`} contentClassName="p-0">
                    {result.impacts.length === 0 ? (
                      <div className="p-6 text-center">
                        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                        <p className="mt-2 text-sm font-medium text-slate-700">No trains affected in this window.</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {scenario === "accept" ? "Accepting this block has zero schedule impact right now." : "The chosen window avoids all trains on this section."}
                        </p>
                      </div>
                    ) : (
                      <ImpactTable impacts={result.impacts} />
                    )}
                  </Panel>

                  {/* Send to approval */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-3">
                    <p className="max-w-xl text-xs text-slate-500">
                      Scenario evaluated — <strong>nothing has been persisted</strong>. To act on it, send the approved
                      plan through the Approval Center for a human decision; simulation never changes live operations.
                    </p>
                    <Button asChild variant="amber" size="sm">
                      <Link href="/approvals">
                        <ShieldCheck className="h-3.5 w-3.5" /> Send to approval
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

function ImpactTable({ impacts }: { impacts: SimulationImpactRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="px-4 py-2.5">Train</th>
            <th className="px-4 py-2.5">Route</th>
            <th className="px-4 py-2.5">Scheduled</th>
            <th className="px-4 py-2.5">Affected station</th>
            <th className="px-4 py-2.5">Expected delay</th>
            <th className="px-4 py-2.5">Severity</th>
            <th className="px-4 py-2.5">Alternative action</th>
          </tr>
        </thead>
        <tbody>
          {impacts.map((imp) => (
            <tr key={imp.trainId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-2.5">
                <p className="font-mono text-xs font-semibold text-slate-800">{imp.number}</p>
                <p className="text-[11px] text-slate-400">{imp.name}</p>
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-600">{imp.route}</td>
              <td className="px-4 py-2.5 text-xs text-slate-600">{imp.scheduledTime.slice(11, 16) || imp.scheduledTime}</td>
              <td className="px-4 py-2.5 text-xs text-slate-600">{imp.affectedStation}</td>
              <td className="px-4 py-2.5">
                <span className={cn("text-xs font-semibold", imp.expectedDelay > 30 ? "text-red-600" : imp.expectedDelay > 10 ? "text-amber-600" : "text-emerald-600")}>
                  +{imp.expectedDelay} min
                </span>
              </td>
              <td className="px-4 py-2.5">
                <Badge className={imp.delaySeverity === "Severe" ? "bg-red-100 text-red-700" : imp.delaySeverity === "High" || imp.delaySeverity === "Moderate" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>
                  {imp.delaySeverity}
                </Badge>
              </td>
              <td className="max-w-[220px] px-4 py-2.5 text-xs text-slate-500">{imp.alternativeAction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}