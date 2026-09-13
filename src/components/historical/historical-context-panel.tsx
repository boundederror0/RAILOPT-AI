"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Archive, Clock3, Database } from "lucide-react";
import { api } from "@/lib/api";
import { SECTION_TRAINS } from "@/lib/ai/train-impact";
import { Panel } from "@/components/shared/panel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const CONTEXT_DISCLAIMER =
  "This historical information provides contextual evidence only. Current operational decisions are based on RAILOPT's operational data and rules.";

const NO_TRAINS: string[] = [];

interface TrainStat {
  trainNumber: string;
  trainType: string;
  zoneAbbr: string | null;
  journeyCount: number;
  avgDelay: number;
  medianDelay: number;
  p90Delay: number;
  maxDelay: number;
  delayedRate: number;
  severeDelayRate: number;
  onTimeRate: number;
  delayCauseDistribution: { cause: string; count: number }[];
}

interface ZoneStat {
  zoneAbbr: string;
  zone: string;
  journeys: number;
  avgDelay: number;
  medianDelay: number;
  p90Delay: number;
  maxDelay: number;
  delayedRate: number;
  severeDelayRate: number;
  onTimeRate: number;
  topDelayCause: string;
}

interface TrainSummaryResponse {
  available: boolean;
  sourceLabel?: string;
  note?: string;
  zones?: ZoneStat[];
  train?: {
    trainNumber: string;
    stats: TrainStat | null;
    delayHistory?: { trainNumber: string; totalJourneys: number } | null;
  } | null;
}

interface MatchedResponse {
  response: TrainSummaryResponse;
  trainNumber: string;
  stats: TrainStat;
  srSliceJourneys: number;
}

export function HistoricalContextPanel({ section }: { section: string }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [matched, setMatched] = useState<MatchedResponse[] | null>(null);
  const [srZone, setSrZone] = useState<ZoneStat | null>(null);

  const candidates = SECTION_TRAINS[section] ?? NO_TRAINS;

  useEffect(() => {
    let active = true;
    setAvailable(null);
    setMatched(null);
    setSrZone(null);

    if (candidates.length === 0) {
      setAvailable(true);
      return () => {
        active = false;
      };
    }

    (async () => {
      const acc: MatchedResponse[] = [];
      let zoneAcc: ZoneStat | null = null;
      let anyAvailable = false;
      for (const n of candidates) {
        try {
          const r = await api.getHistoricalSummary<TrainSummaryResponse>(n);
          if (r.available) anyAvailable = true;
          if (!zoneAcc && r.zones) zoneAcc = r.zones.find((z) => z.zoneAbbr === "SR") ?? null;
          if (r.train?.stats) {
            acc.push({
              response: r,
              trainNumber: n,
              stats: r.train.stats,
              srSliceJourneys: r.train.delayHistory?.totalJourneys ?? 0,
            });
          }
        } catch {
          // ignore individual lookup failures
        }
      }
      if (!active) return;
      setAvailable(anyAvailable);
      setMatched(acc);
      setSrZone(zoneAcc);
    })();

    return () => {
      active = false;
    };
  }, [candidates]);

  if (available === false) return null;

  const loading = matched === null;

  return (
    <Panel
      title="Historical context"
      description="Public-dataset records for the trains that run on this section"
      action={
        <Badge variant="blue" className="gap-1.5 py-1">
          <Archive className="h-3 w-3" />
          HISTORICAL DATA
        </Badge>
      }
      className="border-violet-200 bg-violet-50/40"
      contentClassName="border-t border-violet-100 pt-4"
    >
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      ) : (
        <div className="space-y-4">
          {matched && matched.length > 0 && (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {matched.map((m) => (
                <TrainCard key={m.trainNumber} match={m} />
              ))}
            </div>
          )}

          {matched && matched.length === 0 && (
            <div className="rounded-md border border-violet-200 bg-white/70 p-3 text-xs text-slate-600">
              <p className="font-medium text-slate-700">No individual train records in the public dataset</p>
              <p className="mt-0.5">
                None of the trains on this section appear in the historical slice. Zone-level context below still applies.
              </p>
            </div>
          )}

          {srZone && (
            <div className="rounded-md border border-violet-200 bg-white/70 p-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Database className="h-3.5 w-3.5 text-violet-600" />
                <span className="font-medium text-violet-800">Southern Railway zone context</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {srZone.zone} — {srZone.journeys.toLocaleString()} recorded journeys: {pct(srZone.onTimeRate)}% on time,
                {pct(srZone.delayedRate)}% delayed, {pct(srZone.severeDelayRate)}% severe. Avg {round1(srZone.avgDelay)} min
                · median {Math.round(srZone.medianDelay)} · P90 {Math.round(srZone.p90Delay)} · max{" "}
                {Math.round(srZone.maxDelay)} min.
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Zone-level context covers the full Southern Railway, not just Madurai Division.
              </p>
            </div>
          )}

          {matched && matched.length > 0 && candidates.length > 0 && (
            <p className="text-[11px] text-slate-500">
              {matched.length} of {candidates.length} trains on this section have historical records in the dataset.
            </p>
          )}

          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-slate-700">{CONTEXT_DISCLAIMER}</p>
          </div>

          <p className="text-[11px] text-slate-400">Source: Public Kaggle dataset · Not live railway telemetry.</p>

          {matched && matched.length > 0 && (
            <div>
              <Link
                href={`/historical-intelligence?train=${matched[0].trainNumber}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900"
              >
                Open full historical intelligence <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

function TrainCard({ match }: { match: MatchedResponse }) {
  const { stats, srSliceJourneys } = match;
  const topNonOnTime = stats.delayCauseDistribution?.find((d) => d.cause !== "On Time");
  return (
    <div className="rounded-md border border-violet-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary" className="font-mono">{stats.trainNumber}</Badge>
        <span className="truncate text-[11px] text-slate-500">{stats.trainType}</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-xs">
        <MiniStat label="On time" value={`${pct(stats.onTimeRate)}%`} />
        <MiniStat label="Avg delay" value={`${round1(stats.avgDelay)}m`} />
        <MiniStat label="P90 delay" value={`${Math.round(stats.p90Delay)}m`} />
      </div>
      <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500">
        <Clock3 className="h-3 w-3 shrink-0 text-slate-400" />
        {topNonOnTime ? (
          <span className="truncate">
            Top cause: {topNonOnTime.cause} ({topNonOnTime.count.toLocaleString()} of{" "}
            {stats.journeyCount.toLocaleString()} journeys)
          </span>
        ) : (
          <span className="truncate">{stats.journeyCount.toLocaleString()} journeys recorded</span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400">
          {stats.journeyCount.toLocaleString()} journeys
          {srSliceJourneys > 0 ? ` · Southern Railway records: ${srSliceJourneys}` : ""}
        </span>
        <Link
          href={`/historical-intelligence?train=${stats.trainNumber}`}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 hover:text-violet-900"
        >
          Details <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50/60 px-1.5 py-1">
      <p className="text-[9px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="truncate text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}`;
}

function round1(n: number): string {
  return `${Math.round(n * 10) / 10}`;
}