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
import { AccessGuard } from "@/components/shared/access-guard";

interface HistoricalTrainLookupResponse {
  trainNumber: string;
  stats: HistoricalTrainStats | null;
  delayHistory: {
    trainNumber: string;
    totalJourneys: number;
    recentJourneys: HistoricalJourneyRecord[];
  } | null;
}

export default function HistoricalIntelligencePage() {
  const [overallStats, setOverallStats] = useState<HistoricalOverallStats | null>(null);
  const [zoneStats, setZoneStats] = useState<HistoricalZoneStats[]>([]);
  const [causeStats, setCauseStats] = useState<HistoricalDelayCauseStat[]>([]);
  const [trainInput, setTrainInput] = useState("");
  const [searchedTrain, setSearchedTrain] = useState<string | null>(null);
  const [trainStats, setTrainStats] = useState<HistoricalTrainLookupResponse | null>(null);
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [fleetNumbers, setFleetNumbers] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      api.getHistoricalOverall<HistoricalOverallStats>(),
      api.getHistoricalZones<HistoricalZoneStats[]>(),
      api.getHistoricalCauses<HistoricalDelayCauseStat[]>(),
      api.getHistoricalFleet<{ fleetNumbers: string[] }>(),
    ])
      .then(([overall, zones, causes, fleet]) => {
        setOverallStats(overall);
        setZoneStats(zones);
        setCauseStats(causes);
        setFleetNumbers(new Set(fleet.fleetNumbers));
      })
      .catch((e) => console.error("Failed to load historical data:", e));
  }, []);

  const dfetchTrain = async (train: string) => {
    setTrainLoading(true);
    setTrainError(null);
    try {
      const res = await api.getHistoricalTrain<HistoricalTrainLookupResponse>(train);
      setTrainStats(res);
      setSearchedTrain(train);
    } catch (e) {
      setTrainError(e instanceof Error ? e.message : "Failed to load train history");
      setTrainStats(null);
    } finally {
      setTrainLoading(false);
    }
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
    <AccessGuard requiredPermission="historical.view">
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

        {overallStats && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <KpiCard
              label="Total Journeys (2018–2024)"
              value={overallStats.totalJourneys.toLocaleString()}
              icon={Database}
              sub="Across all zones and train types"
            />
            <KpiCard
              label="Avg Delay"
              value={`${overallStats.avgDelayMinutes.toFixed(1)} min`}
              icon={Clock3}
              sub="Mean delay across all journeys"
            />
            <KpiCard
              label="On-Time %"
              value={`${overallStats.onTimePercentage.toFixed(1)}%`}
              icon={Gauge}
              sub="Journeys within scheduled window"
            />
            <KpiCard
              label="Severe Delay Rate"
              value={`${overallStats.severeDelayRate.toFixed(2)}%`}
              icon={AlertTriangle}
              sub="Journeys delayed >30 minutes"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
          <Panel title="Delay Cause Distribution" description="Top causes across the dataset" className="h-full">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={causeStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="cause"
                    width={140}
                    tick={{ fontSize: 10 }}
                    interval={0}
                  />
                  <Tooltip
                    formatter={(v: number) => [v.toLocaleString(), "journeys"]}
                    labelFormatter={(cause: string) => cause}
                  />
                  <Bar dataKey="count" fill="#7a2d2b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Zone-Wise Performance" description="Average delay by zone" className="h-full">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="zone"
                    width={120}
                    tick={{ fontSize: 10 }}
                    interval={0}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v.toFixed(1)} min`, "avg delay"]}
                    labelFormatter={(zone: string) => zone}
                  />
                  <Bar dataKey="avgDelay" fill="#0e2a47" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
                    onKeyDown={(e) => e.key === "Enter" && trainInput.trim() && dfetchTrain(trainInput.trim())}
                    className="pl-8"
                    aria-label="Search train number"
                  />
                </div>
                <Button onClick={() => trainInput.trim() && dfetchTrain(trainInput.trim())} disabled={!trainInput.trim() || trainLoading}>
                  {trainLoading ? "Loading…" : "Search"}
                </Button>
                {inOperationalFleet && (
                  <Badge variant="green" className="gap-1">
                    <Train className="h-3 w-3" />
                    In operational fleet
                  </Badge>
                )}
              </div>

              {trainError && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {trainError}
                </div>
              )}

              {trainStats && (
                <div className="space-y-4">
                  {trainStats.stats && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
                      <KpiCard
                        label="Total Journeys"
                        value={trainStats.stats.totalJourneys.toLocaleString()}
                        icon={Database}
                        sub={trainStats.stats.trainNumber}
                      />
                      <KpiCard
                        label="Avg Delay"
                        value={`${trainStats.stats.avgDelay.toFixed(1)} min`}
                        icon={Clock3}
                        sub="Mean delay"
                      />
                      <KpiCard
                        label="On-Time %"
                        value={`${trainStats.stats.onTimePercentage.toFixed(1)}%`}
                        icon={Gauge}
                        sub="Within schedule"
                      />
                      <KpiCard
                        label="Severe Delay Rate"
                        value={`${trainStats.stats.severeDelayRate.toFixed(2)}%`}
                        icon={AlertTriangle}
                        sub=">30 min delay"
                      />
                    </div>
                  )}

                  {trainStats.delayHistory && (
                    <Panel title="Recent Journeys" contentClassName="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                              <TableHead className="px-3 py-2">Date</TableHead>
                              <TableHead className="px-3 py-2">From → To</TableHead>
                              <TableHead className="px-3 py-2">Scheduled</TableHead>
                              <TableHead className="px-3 py-2">Actual</TableHead>
                              <TableHead className="px-3 py-2">Delay</TableHead>
                              <TableHead className="px-3 py-2">Cause</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {trainStats.delayHistory.recentJourneys.slice(0, 10).map((j, i) => (
                              <TableRow key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                                <TableCell className="px-3 py-2 font-mono text-xs text-slate-500">{j.date}</TableCell>
                                <TableCell className="px-3 py-2 text-sm text-slate-700">{j.from} → {j.to}</TableCell>
                                <TableCell className="px-3 py-2 text-sm text-slate-600">{j.scheduledDep}</TableCell>
                                <TableCell className="px-3 py-2 text-sm text-slate-600">{j.actualDep}</TableCell>
                                <TableCell className="px-3 py-2">
                                  <Badge variant={j.delayMinutes > 30 ? "red" : j.delayMinutes > 0 ? "amber" : "green"}>
                                    {j.delayMinutes >= 0 ? `+${j.delayMinutes} min` : `${j.delayMinutes} min`}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-3 py-2 text-xs text-slate-600">{j.delayCause || "—"}</TableCell>
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
            <Panel title="Quick Train Selector" description="Common trains in the dataset" className="mb-4">
              <div className="flex flex-wrap gap-1.5">
                {["12635", "12636", "16101", "12679", "12680", "22635", "22636", "12631", "12632", "12633"].map((num) => (
                  <Button
                    key={num}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={() => pickTrain(num)}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </Panel>

            <Panel title="Fleet Status" description={`${fleetNumbers.size} trains in historical dataset`}>
              <div className="space-y-2">
                {Array.from(fleetNumbers).sort().slice(0, 20).map((num) => (
                  <div key={num} className="flex items-center justify-between py-1.5">
                    <span className="font-mono text-sm font-medium text-slate-700">{num}</span>
                    <Badge variant={inOperationalFleet && searchedTrain === num ? "green" : "outline"} className="text-[10px]">
                      {inOperationalFleet && searchedTrain === num ? "Selected" : "In dataset"}
                    </Badge>
                  </div>
                ))}
                {fleetNumbers.size > 20 && (
                  <p className="text-xs text-slate-500 text-center mt-2">+{fleetNumbers.size - 20} more</p>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </AccessGuard>
  );
}