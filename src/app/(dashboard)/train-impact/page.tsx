"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Train, Info, ShieldCheck, FlaskConical } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { api } from "@/lib/api";
import type { Block } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { WorkflowBar } from "@/components/shared/workflow-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BlockTimeline } from "@/components/timeline/block-timeline";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn, minutesToHM } from "@/lib/utils";

type Severity = "None" | "Minor" | "Moderate" | "High" | "Severe";

interface ImpactResponse {
  block: Block;
  impact: {
    blockId: string;
    location: string;
    section: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    severity: Severity;
    impacts: {
      trainId: string;
      number: string;
      name: string;
      route: string;
      type: string;
      scheduledTime: string;
      affectedStation: string;
      expectedDelay: number;
      delaySeverity: Severity;
      alternativeAction: string;
      timeWindowStart: string;
      timeWindowEnd: string;
    }[];
    totalDelay: number;
    maxDelay: number;
  };
}

const SECTIONS = [
  "Madurai–Melur",
  "Madurai–Dindigul",
  "Dindigul–Tiruchirappalli",
  "Madurai–Virudhunagar",
  "Rameswaram Line",
  "Madurai–Coimbatore",
  "Chennai–Madurai (Chord)",
  "Madurai–Tenkasi",
];

export default function TrainImpactPage() {
  const [selectedBlock, setSelectedBlock] = useState<string>("");
  const [custom, setCustom] = useState({
    section: "Madurai–Melur",
    start: "08:00",
    end: "09:00",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImpactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paramBlock, setParamBlock] = useState<string | null>(null);
  const paramAutoRan = useRef(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const b = q.get("block");
    if (b) {
      setParamBlock(b);
      window.history.replaceState({}, "", "/train-impact");
    }
  }, []);

  const { data: blocksRes, loading: blocksLoading } = useFetch<{ blocks: Block[] }>(() => api.getBlocks());
  const blocks = blocksRes?.blocks ?? [];

  useEffect(() => {
    if (paramAutoRan.current) return;
    if (!paramBlock || blocksLoading) return;
    const b = blocks.find((x) => x.id === paramBlock);
    if (!b) {
      setError(`Block ${paramBlock} was not found in the operational store.`);
      paramAutoRan.current = true;
      return;
    }
    setSelectedBlock(paramBlock);
    setError(null);
    paramAutoRan.current = true;
    runFromBlock(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramBlock, blocksLoading, blocks]);

  const blocksThisWeek = useMemo(
    () => blocks.filter((b) => {
      const d = new Date(b.startTime);
      const now = new Date();
      return Math.abs(d.getTime() - now.getTime()) < 5 * 86400000 && b.status !== "Completed";
    }),
    [blocks]
  );

  const runFromBlock = async (block: Block) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.calculateImpact<ImpactResponse>({ block });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impact calculation failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const runCustom = async () => {
    const [sh, sm] = custom.start.split(":").map(Number);
    const [eh, em] = custom.end.split(":").map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      setError("End time must be after start time.");
      return;
    }
    const baseDate = new Date();
    const start = new Date(baseDate);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(baseDate);
    end.setHours(eh, em, 0, 0);

    setLoading(true);
    setError(null);
    try {
      const res = await api.calculateImpact<ImpactResponse>({
        block: {
          id: `BLK-MAN-${Date.now() % 100000}`,
          requestId: "manual",
          location: custom.section.split("–")[0],
          section: custom.section,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          durationMinutes: (eh * 60 + em) - (sh * 60 + sm),
          teamId: "TM-02",
          teamName: "Manual entry",
          affectedTrainIds: [],
          expectedDelay: 0,
          priority: "Medium",
          riskReduction: 0,
          status: "Proposed",
          riskScore: 50,
        },
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impact calculation failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const selectedBlockObj = blocks.find((b) => b.id === selectedBlock);

  return (
    <div>
      <PageHeader
        title="Train Impact Analysis"
        subtitle="Compute how a maintenance block affects running trains on the affected section"
        actions={
          <Badge variant="outline" className="gap-1.5 py-1">
            <Train className="h-3.5 w-3.5 text-blue-600" /> Delays weighted by train priority
          </Badge>
        }
      />

      <WorkflowBar current={3} context={{ block: selectedBlockObj?.id || result?.block.id }} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Controls */}
        <Panel title="Select a block" description="Choose an existing block plan or define one manually" className="lg:col-span-4">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="block-select">Existing blocks</Label>
              {blocksLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedBlock} onValueChange={(v) => setSelectedBlock(v)}>
                  <SelectTrigger id="block-select">
                    <SelectValue placeholder="Choose a scheduled or proposed block" />
                  </SelectTrigger>
                  <SelectContent>
                    {blocksThisWeek.length === 0 && <SelectItem value="__none" disabled>No blocks available</SelectItem>}
                    {blocksThisWeek.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.id} — {b.section} {b.startTime.slice(11, 16)}–{b.endTime.slice(11, 16)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedBlockObj && (
              <Button className="w-full" disabled={loading} onClick={() => runFromBlock(selectedBlockObj)}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Train className="h-4 w-4" />}
                Calculate impact
              </Button>
            )}

            <div className="flex items-center gap-2 py-1">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] uppercase tracking-wide text-slate-400">or define manually</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-section">Section</Label>
              <Select value={custom.section} onValueChange={(v) => setCustom((c) => ({ ...c, section: v }))}>
                <SelectTrigger id="custom-section">
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="custom-start">Start (block)</Label>
                <Input id="custom-start" type="time" value={custom.start} onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="custom-end">End (block)</Label>
                <Input id="custom-end" type="time" value={custom.end} onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))} />
              </div>
            </div>

            <Button variant="outline" className="w-full" disabled={loading} onClick={runCustom}>
              Analyze custom block
            </Button>

            {error && (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                {error}
              </p>
            )}
          </div>
        </Panel>

        {/* Results */}
        <div className="space-y-4 lg:col-span-8">
          {!result ? (
            <EmptyState
              title="No impact computed yet"
              description="Select a block from the list (or build a custom one) and calculate its impact on train movements."
              action={
                <Button asChild variant="amber" size="sm">
                  <Link href="/block-optimizer">
                    Open block optimizer <Train className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              }
              className="min-h-[320px]"
            />
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Trains affected" value={String(result.impact.impacts.length)} />
                <Stat label="Total expected delay" value={`${result.impact.totalDelay} min`} />
                <Stat label="Worst single delay" value={`${result.impact.maxDelay} min`} />
                <Stat label="Overall severity" value={result.impact.severity} highlight={result.impact.severity === "High" || result.impact.severity === "Severe"} />
              </div>

              {/* Timeline */}
              <Panel
                title="Movement timeline"
                description={`Block ${result.impact.startTime.slice(11, 16)}–${result.impact.endTime.slice(11, 16)} on ${result.impact.section}`}
              >
                <BlockTimeline blockStart={result.impact.startTime} blockEnd={result.impact.endTime} impacts={result.impact.impacts} />
                <p className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-400">
                  <Info className="mt-0.5 h-3 w-3" />
                  Amber band = maintenance block. Solid lines = train passage over the section corridor. Shaded overlap = conflict period producing delay.
                </p>
              </Panel>

              {/* Affected trains table */}
              <Panel title="Affected trains" description="Impact detail per train" contentClassName="p-0">
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
                      {result.impact.impacts.map((imp) => (
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
                            <Badge className={imp.delaySeverity === "Severe" ? "bg-red-100 text-red-700" : imp.delaySeverity === "High" ? "bg-amber-100 text-amber-700" : imp.delaySeverity === "Moderate" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>
                              {imp.delaySeverity}
                            </Badge>
                          </td>
                          <td className="max-w-[220px] px-4 py-2.5 text-xs text-slate-500">{imp.alternativeAction}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
                  <span>Block duration: {minutesToHM(result.impact.durationMinutes)}</span>
                  <StatusBadge status={result.impact.severity === "None" ? "Operational" : result.impact.severity} />
                </div>
              </Panel>

              {/* Human approval hand-off */}
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="max-w-xl text-xs text-slate-500">
                    <p className="font-semibold text-slate-800">What happens if we accept it?</p>
                    <p className="mt-1">
                      {result.impact.impacts.length} train(s) would incur up to {result.impact.maxDelay} min extra delay
                      (severity: {result.impact.severity}). The plan is deterministic and recorded in the audit log — a human
                      signs it off before any block goes live.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/what-if?block=${result.block.id}`}>
                        <FlaskConical className="h-3.5 w-3.5" /> Run what-if simulation
                      </Link>
                    </Button>
                    <Button asChild variant="amber" size="sm">
                      <Link href="/approvals">
                        <ShieldCheck className="h-3.5 w-3.5" /> Review & approve
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg border bg-white p-3", highlight ? "border-red-200 bg-red-50/50" : "border-slate-200")}>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}