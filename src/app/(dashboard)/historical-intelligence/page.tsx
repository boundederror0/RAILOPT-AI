"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Database, Clock3, Gauge, AlertTriangle, Train, Search, ShieldAlert } from "lucide-react";
import type {
  HistoricalOverallStats,
  HistoricalTrainStats,
  HistoricalZoneStats,
  HistoricalDelayCauseStat,
  HistoricalJourneyRecord,
  HistoricalTrainTypeStat,
} from "@/lib/data/historical-types";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { KpiCard } from "@/components/shared/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { AccessGuard } from "@/components/shared/access-guard";

interface HistoricalSummaryResponse {
  available: boolean;
  label: string;
  sourceLabel: string;
  note: string;
  disclaimer: string;
  onTimeThresholdMinutes: number | null;
  severeThresholdMinutes: number | null;
  generatedAt: string | null;
  inputFile: string | null;
  inputRows: number | null;
  validRows: number | null;
  duplicateJourneys: number | null;
  invalidRows: number | null;
  outputFiles: Record<string, { bytes: number; records: number | null }> | null;
  overall: HistoricalOverallStats | null;
  zones: HistoricalZoneStats[];
  delayCauses: HistoricalDelayCauseStat[];
  trainTypes: HistoricalTrainTypeStat[];
  train: {
    trainNumber: string;
    stats: HistoricalTrainStats | null;
    delayHistory: HistoricalJourneyRecord[];
  } | null;
}

const STATUS_PERIOD = "2018–2024";

export default function HistoricalIntelligencePage() {
  const [data, setData] = useState<HistoricalSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trainInput, setTrainInput] = useState("");
  const [trainStats, setTrainStats] = useState<Pick<HistoricalSummaryResponse, "train">["train"]>(null);
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainError, setTrainError] = useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    api
      .getHistoricalSummary<HistoricalSummaryResponse>()
      .then((res) => active && setData(res))
      .catch((e) => active && setError(e instanceof Error ? e.message : "Failed to load historical data"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const fetchTrain = async (train: string) => {
    setTrainLoading(true);
    setTrainError(null);
    try {
      const res = await api.getHistoricalSummary<HistoricalSummaryResponse>(train);
      setTrainStats(res.train);
      if (!res.train) {
        setTrainError(`Train ${train} was not found in the historical dataset.`);
      }
    } catch (e) {
      setTrainError(e instanceof Error ? e.message : "Failed to load train history");
      setTrainStats(null);
    } finally {
      setTrainLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Historical Intelligence"
          subtitle="Journey delay patterns from a public railway dataset (2018–2024) — separate from the live operational simulation"
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="mt-4 space-y-4">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Historical Intelligence"
          subtitle="Journey delay patterns from a public railway dataset"
        />
        <EmptyState
          title="Unable to load historical data"
          description={error}
        />
      </div>
    );
  }

  if (!data) return null;

  const overall = data.overall;

  return (
    <AccessGuard requiredPermission="historical.view">
      <div>
        <PageHeader
          title="Historical Intelligence"
          subtitle="Journey delay patterns from a public railway dataset (2018–2024) — separate from the live operational simulation"
          actions={<Badge variant="amber">{data.label}</Badge>}
        />

        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {data.label} · {data.sourceLabel} · {data.note}.
            </p>
            <p className="mt-0.5 text-xs text-amber-800/80">
              All series on this page describe past journeys ({STATUS_PERIOD}). They are never used as live or
              real-time railway telemetry, and current maintenance planning and optimization remain based on the
              operational simulation. {data.disclaimer}
            </p>
            {data.inputFile && (
              <p className="mt-1 text-[11px] text-amber-800/70">
                Processed from {data.inputFile} · {data.inputRows?.toLocaleString() ?? "?"} input rows ·{" "}
                {data.validRows?.toLocaleString() ?? "?"} valid · {data.invalidRows?.toLocaleString() ?? "?"} invalid.{" "}
                {data.onTimeThresholdMinutes != null && `On-time ≤ ${data.onTimeThresholdMinutes} min`} ·{" "}
                {data.severeThresholdMinutes != null && `Severe delay > ${data.severeThresholdMinutes} min`}.
              </p>
            )}
          </div>
        </div>

        {overall && (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={`Total Journeys (${STATUS_PERIOD})`}
              value={overall.journeys.toLocaleString()}
              icon={Database}
              sub="Across all zones and train types"
            />
            <KpiCard
              label="Avg Delay"
              value={`${overall.avgDelay.toFixed(1)} min`}
              icon={Clock3}
              sub={`Median ${overall.medianDelay.toFixed(0)} · p90 ${overall.p90Delay.toFixed(0)}`}
            />
            <KpiCard
              label="On-Time Rate"
              value={`${(overall.onTimeRate * 100).toFixed(1)}%`}
              icon={Gauge}
              sub={`Within ≤ ${data.onTimeThresholdMinutes ?? 15} min window`}
            />
            <KpiCard
              label="Severe Delay Rate"
              value={`${(overall.severeDelayRate * 100).toFixed(1)}%`}
              icon={AlertTriangle}
              sub={`Delayed > ${data.severeThresholdMinutes ?? 60} minutes`}
            />
          </div>
        )}

        {overall && overall.delayBuckets.length > 0 && (
          <Panel title="Delay Buckets" description="Share of journeys by delay band" className="mb-6">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overall.delayBuckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                  <Tooltip
                    formatter={(v: unknown) => [`${Number(v ?? 0).toFixed(1)}%`, "share"]}
                    labelFormatter={(label: unknown) => String(label ?? "")}
                  />
                  <Bar dataKey="share" fill="#0e2a47" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        )}

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Panel title="Delay Cause Distribution" description="Share of journeys by primary cause" className="h-full">
            {data.delayCauses.length === 0 ? (
              <EmptyState title="No cause data" description="Delay-cause statistics are not available." />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.delayCauses} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} unit="%" />
                    <YAxis
                      type="category"
                      dataKey="cause"
                      width={170}
                      tick={{ fontSize: 10 }}
                      interval={0}
                    />
                    <Tooltip
                      formatter={(v: unknown) => [`${Number(v ?? 0).toFixed(1)}%`, "share"]}
                      labelFormatter={(label: unknown) => String(label ?? "")}
                    />
                    <Bar dataKey="share" fill="#7a2d2b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          <Panel title="Zone-Wise Performance" description="Average delay by zone" className="h-full">
            {data.zones.length === 0 ? (
              <EmptyState title="No zone data" description="Zone statistics are not available." />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.zones} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="zoneAbbr"
                      width={120}
                      tick={{ fontSize: 10 }}
                      interval={0}
                    />
                    <Tooltip
                      formatter={(v: unknown) => [`${Number(v ?? 0).toFixed(1)} min`, "avg delay"]}
                      labelFormatter={(label: unknown) => String(label ?? "")}
                    />
                    <Bar dataKey="avgDelay" fill="#0e2a47" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Panel title="Train Delay Lookup" description="Search by train number from the historical dataset">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px] flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={trainInput}
                    onChange={(e) => setTrainInput(e.target.value)}
                    placeholder="Enter train number (e.g., 12635)"
                    onKeyDown={(e) => e.key === "Enter" && trainInput.trim() && fetchTrain(trainInput.trim())}
                    className="pl-8"
                    aria-label="Search train number"
                  />
                </div>
                <Button
                  onClick={() => trainInput.trim() && fetchTrain(trainInput.trim())}
                  disabled={!trainInput.trim() || trainLoading}
                >
                  {trainLoading ? "Loading…" : "Search"}
                </Button>
              </div>

              {trainError && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {trainError}
                </div>
              )}

              {trainStats && (
                <div className="space-y-4">
                  {trainStats.stats && (
                    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <KpiCard
                        label="Total Journeys"
                        value={trainStats.stats.journeyCount.toLocaleString()}
                        icon={Database}
                        sub={`${trainStats.stats.trainType}, ${trainStats.stats.zoneAbbr}`}
                      />
                      <KpiCard
                        label="Avg Delay"
                        value={`${trainStats.stats.avgDelay.toFixed(1)} min`}
                        icon={Clock3}
                        sub={`Median ${trainStats.stats.medianDelay.toFixed(0)} · p90 ${trainStats.stats.p90Delay.toFixed(0)}`}
                      />
                      <KpiCard
                        label="On-Time Rate"
                        value={`${(trainStats.stats.onTimeRate * 100).toFixed(1)}%`}
                        icon={Gauge}
                        sub="Within schedule"
                      />
                      <KpiCard
                        label="Severe Delay Rate"
                        value={`${(trainStats.stats.severeDelayRate * 100).toFixed(1)}%`}
                        icon={AlertTriangle}
                        sub="Delayed >60 min"
                      />
                    </div>
                  )}

                  {trainStats.delayHistory && trainStats.delayHistory.length > 0 && (
                    <Panel title="Recent Journeys" description={`Last ${trainStats.delayHistory.length} records for ${trainStats.trainNumber}`} contentClassName="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                              <TableHead className="px-3 py-2">Date</TableHead>
                              <TableHead className="px-3 py-2">Scheduled Hour</TableHead>
                              <TableHead className="px-3 py-2">Delay</TableHead>
                              <TableHead className="px-3 py-2">Cause</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {trainStats.delayHistory.slice(0, 10).map((j, i) => (
                              <TableRow key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                                <TableCell className="px-3 py-2 font-mono text-xs text-slate-500">{j.departureDate}</TableCell>
                                <TableCell className="px-3 py-2 text-sm text-slate-600">{String(j.departureHour).padStart(2, "0")}:00</TableCell>
                                <TableCell className="px-3 py-2">
                                  <Badge variant={j.delayMinutes > 60 ? "red" : j.delayMinutes > 15 ? "amber" : "green"}>
                                    {j.delayMinutes >= 0 ? `+${j.delayMinutes} min` : `${j.delayMinutes} min`}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-3 py-2 text-xs text-slate-600">{j.primaryDelayCause || "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Panel>
                  )}
                </div>
              )}
            </Panel>
          </div>

          <div className="lg:col-span-5">
            <Panel title="Train Types" description="Journey counts by train type" className="mb-4">
              <div className="space-y-1.5">
                {data.trainTypes.slice(0, 12).map((t) => (
                  <div key={t.trainType} className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs">
                    <span className="truncate text-slate-700">{t.trainType}</span>
                    <span className="ml-3 shrink-0 font-mono font-medium text-slate-500">
                      {t.journeys.toLocaleString()}
                    </span>
                  </div>
                ))}
                {data.trainTypes.length === 0 && (
                  <p className="text-xs text-slate-400">No train-type statistics available.</p>
                )}
              </div>
            </Panel>

            <Panel title="Zones" description="Journeys sampled per zone">
              <div className="space-y-1.5">
                {data.zones.slice(0, 24).map((z) => (
                  <div key={z.zoneAbbr} className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs">
                    <span className="flex items-center gap-2 truncate text-slate-700">
                      <span className="w-7 shrink-0 font-mono font-medium text-slate-400">{z.zoneAbbr}</span>
                      {z.zone}
                    </span>
                    <span className="ml-3 shrink-0 font-mono font-medium text-slate-500">
                      {z.journeys.toLocaleString()}
                    </span>
                  </div>
                ))}
                {data.zones.length === 0 && (
                  <p className="text-xs text-slate-400">No zone statistics available.</p>
                )}
              </div>
            </Panel>

            <div className="mt-4 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
              <Train className="h-4 w-4 shrink-0 text-slate-400" />
              <span>
                Chart data reflects the processed dataset at{" "}
                <span className="font-mono">{data.generatedAt}</span>.
              </span>
            </div>
          </div>
        </div>
      </div>
    </AccessGuard>
  );
}