"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Database, Clock3, Gauge, AlertTriangle, TrendingUp, Train, Search, ArrowRight, ArrowDown, ShieldAlert } from "lucide-react";
import type {
  HistoricalOverallStats,
  HistoricalTrainStats,
  HistoricalZoneStats,
  HistoricalDelayCauseStat,
  HistoricalJourneyRecord,
} from "@/lib/data/historical-types";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { KpiCard } from "@/components/shared/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface HistoricalTrainLookupResponse {
  trainNumber: string;
  stats: HistoricalTrainStats | null;
  delayHistory: {
    trainNumber: string;
    totalJourneys: number;
    recentJourneys: HistoricalJourneyRecord[];
  } | null;
}

interface HistoricalSummaryResponse {
  available: boolean;
  label: string;
  sourceLabel: string;
  source: string;
  note: string | null;
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
  trainTypes: { trainType: string; journeys: number }[];
  train: HistoricalTrainLookupResponse | null;
}

const QUICK_PICKS = ["12635", "12636", "12666", "12668", "12679", "12694"];

const DISTRIBUTION_COLOR = "#0e2a47";
const CAUSE_COLOR = "#7a2d2b";
const YEARLY_COLOR = "#b45309";

function pct(share: number) {
  return `${(share * 100).toFixed(1)}%`;
}

function pctChart(share: number) {
  return Math.round(share * 1000) / 10;
}

export default function HistoricalIntelligencePage() {
  const [summary, setSummary] = useState<HistoricalSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fleetNumbers, setFleetNumbers] = useState<Set<string>>(new Set());

  const [trainInput, setTrainInput] = useState("");
  const [searchedTrain, setSearchedTrain] = useState<string | null>(null);
  const [trainResult, setTrainResult] = useState<HistoricalTrainLookupResponse | null>(null);
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainError, setTrainError] = useState<string | null>(null);

  const loadSummary = React.useCallback((train?: string) => {
    setLoading(true);
    setError(null);
    api
      .getHistoricalSummary<HistoricalSummaryResponse>(train)
      .then((d) => setSummary(d))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load historical data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    let active = true;
    api
      .getTrains<{ trains: { number: string }[] }>()
      .then((d) => active && setFleetNumbers(new Set(d.trains.map((t) => t.number))))
      .catch(() => {
        if (active) setFleetNumbers(new Set());
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const train = params.get("train");
    if (train && /^\d{1,5}$/.test(train)) pickTrain(train.padStart(5, "0"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overall = summary?.overall ?? null;

  const kpis = useMemo(() => {
    if (!overall) return null;
    const sr = summary?.zones.find((z) => z.zoneAbbr === "SR");
    const topCause = summary?.delayCauses.find((c) => c.cause !== "On Time") ?? summary?.delayCauses[0];
    return {
      journeys: overall.journeys,
      onTimeRate: overall.onTimeRate,
      avgDelay: overall.avgDelay,
      medianDelay: overall.medianDelay,
      p90Delay: overall.p90Delay,
      severeDelayRate: overall.severeDelayRate,
      southernJourneys: sr?.journeys ?? 0,
      topCause: topCause?.cause ?? "—",
      topCauseShare: topCause?.share ?? 0,
    };
  }, [overall, summary]);

  const bucketData = useMemo(
    () => (overall?.delayBuckets ?? []).map((b) => ({ name: b.bucket, share: pctChart(b.share), journeys: b.journeys })),
    [overall]
  );

  const causeData = useMemo(
    () =>
      [...(summary?.delayCauses ?? [])]
        .sort((a, b) => b.share - a.share)
        .slice(0, 8)
        .map((c) => ({ cause: c.cause, share: pctChart(c.share) })),
    [summary]
  );

  const yearlyData = useMemo(() => (overall?.yearly ?? []).map((y) => ({ year: String(y.year), journeys: y.journeys })), [overall]);

  const zoneData = useMemo(() => [...(summary?.zones ?? [])].sort((a, b) => b.journeys - a.journeys), [summary]);

  const emptyBucketNote = useMemo(() => {
    const bucket = overall?.delayBuckets.find((b) => b.bucket === "16-30");
    return bucket && bucket.journeys === 0
      ? "The 16–30 min bucket is empty in the source dataset."
      : null;
  }, [overall]);

  const handleSearch = () => {
    const digits = trainInput.replace(/\D/g, "");
    if (!digits || digits.length > 5) {
      setTrainError("Enter a valid 5-digit train number (e.g. 12635).");
      setTrainResult(null);
      setSearchedTrain(null);
      return;
    }
    const normalized = digits.padStart(5, "0");
    setSearchedTrain(normalized);
    setTrainLoading(true);
    setTrainError(null);
    dfetchTrain(normalized);
  };

  const dfetchTrain = (train: string) => {
    api
      .getHistoricalSummary<HistoricalSummaryResponse>(train)
      .then((d) => setTrainResult(d.train))
      .catch((e) => setTrainError(e instanceof Error ? e.message : "Failed to load train history"))
      .finally(() => setTrainLoading(false));
  };

  const pickTrain = (train: string) => {
    setTrainInput(train);
    setSearchedTrain(train);
    setTrainLoading(true);
    setTrainError(null);
    dfetchTrain(train);
  };

  const inOperationalFleet = searchedTrain ? fleetNumbers.has(searchedTrain) : false;

  return (
    <div>
      <PageHeader
        title="Historical Intelligence"
        subtitle="Journey delay patterns from a public railway dataset (2018–2024) — separate from the live operational simulation"
        actions={<Badge variant="amber">HISTORICAL DATA</Badge>}
      />

      <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-amber-900">
            HISTORICAL DATA · Source: Public Kaggle dataset · Not live railway telemetry.
          </p>
          <p className="mt-0.5 text-xs text-amber-800/80">
            All series on this page describe past journeys (2018–2024). They are never used as live or real-time
            railway telemetry, and current maintenance planning and optimization remain based on the operational simulation.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="Historical data unavailable"
          description={error}
          action={<Button variant="outline" size="sm" onClick={() => loadSummary()}>Retry</Button>}
        />
      ) : !summary || !summary.available || !overall ? (
        <EmptyState
          title="No historical data"
          description="The historical dataset has not been ingested. Run `npm run ingest` and rebuild the processed files."
          action={<Button variant="outline" size="sm" onClick={() => loadSummary()}>Retry</Button>}
        />
      ) : (
        <div className="space-y-4">
          {kpis && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <KpiCard
                label="Total journeys"
                value={kpis.journeys.toLocaleString("en-IN")}
                sub="2018–2024 dataset"
                icon={Database}
              />
              <KpiCard
                label="On-time rate"
                value={pct(kpis.onTimeRate)}
                sub={`within ${summary.onTimeThresholdMinutes ?? 15} min`}
                icon={Gauge}
              />
              <KpiCard
                label="Avg delay"
                value={`${kpis.avgDelay} min`}
                sub={`median ${kpis.medianDelay} · P90 ${kpis.p90Delay}`}
                icon={Clock3}
              />
              <KpiCard
                label="Severe delay rate"
                value={pct(kpis.severeDelayRate)}
                sub={`> ${summary.severeThresholdMinutes ?? 60} min`}
                icon={AlertTriangle}
              />
              <KpiCard
                label="Top cause"
                value={kpis.topCause}
                sub={`${pct(kpis.topCauseShare)} of all journeys`}
                icon={TrendingUp}
              />
              <KpiCard label="SR zone journeys" value={kpis.southernJourneys.toLocaleString("en-IN")} sub="Southern Railway slice" icon={Train} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Delay distribution" description="Share of journeys by delay bucket — historical (2018–2024)">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bucketData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip
                      formatter={(v) => [`${v}%`, "Share"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                      cursor={{ fill: "#f1f5f9" }}
                    />
                    <Bar dataKey="share" name="Share" fill={DISTRIBUTION_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {emptyBucketNote && (
                <p className="mt-2 text-xs text-slate-400">{emptyBucketNote}</p>
              )}
            </Panel>

            <Panel title="Delay causes" description="Most frequent recorded primary causes — historical">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={causeData} layout="vertical" margin={{ top: 4, right: 24, left: 16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit="%" />
                    <YAxis type="category" dataKey="cause" width={140} tick={{ fontSize: 11, fill: "#475569" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v) => [`${v}%`, "Share"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                      cursor={{ fill: "#f8fafc" }}
                    />
                    <Bar dataKey="share" name="Share" fill={CAUSE_COLOR} radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Journey volume by year" description="Historical journey counts recorded per calendar year">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                    <Tooltip
                      formatter={(v) => [`${Number(v).toLocaleString("en-IN")} journeys`, "Journeys"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                      cursor={{ fill: "#f1f5f9" }}
                    />
                    <Bar dataKey="journeys" name="Journeys" fill={YEARLY_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Zone performance" description="Delay profile across railway zones — historical">
              <div className="overflow-x-auto">
                <Table className="min-w-[520px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead className="text-right">Journeys</TableHead>
                      <TableHead className="text-right">Avg (min)</TableHead>
                      <TableHead className="text-right">P90 (min)</TableHead>
                      <TableHead className="text-right">On-time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zoneData.map((z) => (
                      <TableRow key={z.zoneAbbr}>
                        <TableCell>
                          <span className="font-medium text-slate-800">{z.zoneAbbr}</span>
                          <span className="ml-2 hidden text-xs text-slate-400 sm:inline">{z.zone}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{z.journeys.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right tabular-nums">{z.avgDelay}</TableCell>
                        <TableCell className="text-right tabular-nums">{z.p90Delay}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", z.onTimeRate >= 0.4 ? "text-emerald-700" : "text-red-600")}>
                          {pct(z.onTimeRate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableCaption>16 zones · historical journeys only</TableCaption>
                </Table>
              </div>
            </Panel>
          </div>

          <Panel
            title="Train-level historical lookup"
            description="Look up delay history for a specific train number from the historical dataset (e.g. 12635)."
            action={<Badge variant="outline">HISTORICAL</Badge>}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={trainInput}
                onChange={(e) => setTrainInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Enter train number, e.g. 12635"
                inputMode="numeric"
                maxLength={5}
                className="sm:max-w-xs"
                aria-label="Train number"
              />
              <Button onClick={handleSearch} disabled={trainLoading}>
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400">Operational trains in dataset:</span>
              {QUICK_PICKS.map((n) => (
                <button
                  key={n}
                  onClick={() => pickTrain(n)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    searchedTrain === n
                      ? "border-blue-300 bg-blue-100 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>

            {trainLoading ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : trainError ? (
              <div className="mt-4">
                <EmptyState title="Lookup failed" description={trainError} />
              </div>
            ) : searchedTrain && trainResult ? (
              trainResult.stats ? (
                <TrainDetail
                  stats={trainResult.stats}
                  delayHistory={trainResult.delayHistory}
                  inOperationalFleet={inOperationalFleet}
                />
              ) : (
                <div className="mt-4">
                  <EmptyState
                    title={`No historical records for train ${searchedTrain}`}
                    description="This train number does not exist in the 2018–2024 public Kaggle dataset. Try another number."
                  />
                </div>
              )
            ) : (
              <div className="mt-4">
                <EmptyState
                  title="Select a train to inspect"
                  description="Use the quick picks above or enter a 5-digit train number, then press Search."
                />
              </div>
            )}
          </Panel>

          <Panel
            title="How historical intelligence fits RAILOPT"
            description="Historical context informs planning; it never replaces the operational simulation."
            action={<Badge variant="outline">CONTEXTUAL</Badge>}
          >
            <p className="mb-4 max-w-3xl text-sm text-slate-600">
              RAILOPT uses historical railway intelligence to provide operational context, while current maintenance
              planning and optimization remain based on the operational simulation.
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-3 lg:flex-nowrap">
              {[
                "Historical Intelligence",
                "Delay Patterns",
                "Contextual Intelligence",
                "Maintenance / Risk",
                "Block Optimization",
                "Train Impact",
                "Human Approval",
              ].map((step, i, arr) => (
                <React.Fragment key={step}>
                  <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
                    {step}
                  </span>
                  {i < arr.length - 1 && (
                    <>
                      <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-300 lg:block" aria-hidden />
                      <ArrowDown className="h-4 w-4 shrink-0 text-slate-300 lg:hidden" aria-hidden />
                    </>
                  )}
                </React.Fragment>
              ))}
            </div>
          </Panel>

          <div className="flex justify-center">
            <Badge variant="outline" className="py-1 text-center">
              HISTORICAL DATA · Public Kaggle dataset (2018–2024) · Not live railway telemetry · Operational simulation remains separate
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function TrainDetail({
  stats,
  delayHistory,
  inOperationalFleet,
}: {
  stats: HistoricalTrainStats;
  delayHistory: HistoricalTrainLookupResponse["delayHistory"];
  inOperationalFleet: boolean;
}) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-slate-900">Train {stats.trainNumber}</h3>
        <Badge variant="secondary">{stats.trainType}</Badge>
        <Badge variant="outline">{stats.zoneAbbr} zone</Badge>
        {inOperationalFleet && <Badge variant="blue">Also part of the simulated operational fleet</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Journeys" value={stats.journeyCount.toLocaleString("en-IN")} />
        <Stat label="Avg delay" value={`${stats.avgDelay} min`} />
        <Stat label="Median" value={`${stats.medianDelay} min`} />
        <Stat label="P90" value={`${stats.p90Delay} min`} />
        <Stat label="Max" value={`${stats.maxDelay} min`} />
        <Stat label="On-time rate" value={pct(stats.onTimeRate)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Cause breakdown</p>
          <div className="space-y-2">
            {[...stats.delayCauseDistribution]
              .sort((a, b) => b.count - a.count)
              .slice(0, 6)
              .map((c) => (
                <div key={c.cause} className="flex items-center gap-2">
                  <span className="w-40 truncate text-xs text-slate-600 sm:w-48">{c.cause}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-rail-navy"
                      style={{ width: `${(c.count / stats.journeyCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-xs tabular-nums text-slate-500">{c.count}</span>
                </div>
              ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            First journey {stats.firstJourneyDate} · Last journey {stats.lastJourneyDate}.
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Most recent delay records</p>
          {delayHistory && delayHistory.recentJourneys.length > 0 ? (
            <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200">
              <Table className="min-w-[360px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Hour</TableHead>
                    <TableHead className="text-right">Delay (min)</TableHead>
                    <TableHead>Cause</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {delayHistory.recentJourneys.slice(0, 100).map((j, i) => (
                    <TableRow key={`${j.departureDate}-${i}`}>
                      <TableCell className="whitespace-nowrap tabular-nums">{j.departureDate}</TableCell>
                      <TableCell className="text-right tabular-nums">{j.departureHour}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", j.delayMinutes > 60 ? "text-red-600" : "text-slate-700")}>
                        {j.delayMinutes}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">{j.primaryDelayCause}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/50 px-4 py-6 text-center text-xs text-slate-500">
              No Southern Railway slice history recorded for this train in the dataset.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}