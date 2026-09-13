import fs from "node:fs";
import path from "node:path";
import type {
  HistoricalSummary,
  HistoricalTrainStats,
  HistoricalZoneStats,
  HistoricalDelayCauseStat,
  HistoricalOverallStats,
  HistoricalTrainTypeStat,
  HistoricalJourneyRecord,
  HistoricalManifest,
} from "./historical-types";
import { HISTORICAL_SOURCE, HISTORICAL_DISCLAIMER } from "./historical-types";

const PROCESSED_DIR = path.join(process.cwd(), "data", "processed");

type Cache = {
  summary: HistoricalSummary | null;
  trainStats: HistoricalTrainStats[] | null;
  southern: { causes: string[]; journeys: { t: string; d: number; h: number; dm: number; c: number }[] } | null;
  manifest: HistoricalManifest | null;
};

let cache: Cache | null = null;

function readProcessed<T>(filename: string): T | null {
  const file = path.join(PROCESSED_DIR, filename);
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function loadAll(): Cache {
  if (cache) return cache;
  cache = {
    summary: readProcessed<HistoricalSummary>("kaggle_historical_summary.json"),
    trainStats: readProcessed<HistoricalTrainStats[]>("kaggle_historical_train_stats.json"),
    southern: readProcessed<{
      causes: string[];
      journeys: { t: string; d: number; h: number; dm: number; c: number }[];
    }>("kaggle_historical_southern.json"),
    manifest: readProcessed<HistoricalManifest>("kaggle_manifest.json"),
  };
  return cache;
}

export function isHistoricalDataAvailable(): boolean {
  const c = loadAll();
  return c.summary !== null && c.trainStats !== null;
}

export function getHistoricalSummary(): HistoricalSummary | null {
  return loadAll().summary;
}

export function getHistoricalTrainStats(): HistoricalTrainStats[] | null {
  return loadAll().trainStats;
}

export function getTrainStatsByNumber(trainNumber: string): HistoricalTrainStats | null {
  const stats = loadAll().trainStats;
  if (!stats) return null;
  return stats.find((t) => t.trainNumber === trainNumber) ?? null;
}

export function getTrainDelayHistory(
  trainNumber: string,
  limit = 200
): { trainNumber: string; totalJourneys: number; recentJourneys: HistoricalJourneyRecord[] } | null {
  const c = loadAll();
  if (!c.southern) return null;
  const { causes, journeys } = c.southern;
  const matches = journeys.filter((j) => j.t === trainNumber);
  matches.sort((a, b) => b.d - a.d);
  const recent = matches.slice(0, limit).map((j) => {
    const d = String(j.d);
    const departureDate = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    return {
      trainNumber,
      departureDate,
      departureHour: j.h,
      delayMinutes: j.dm,
      primaryDelayCause: causes[j.c] ?? "Unspecified",
      source: HISTORICAL_SOURCE,
    } satisfies HistoricalJourneyRecord;
  });
  return {
    trainNumber,
    totalJourneys: matches.length,
    recentJourneys: recent,
  };
}

export function getDelayCauseStats(): HistoricalDelayCauseStat[] | null {
  return loadAll().summary?.delayCauses ?? null;
}

export function getZoneDelayStats(): HistoricalZoneStats[] | null {
  return loadAll().summary?.zones ?? null;
}

export function getOverallDelayStats(): HistoricalOverallStats | null {
  return loadAll().summary?.overall ?? null;
}

export function getTrainTypeStats(): HistoricalTrainTypeStat[] | null {
  return loadAll().summary?.trainTypes ?? null;
}

export function getHistoricalManifest(): HistoricalManifest | null {
  return loadAll().manifest;
}

export function getHistoricalLabel() {
  return { ...HISTORICAL_DISCLAIMER, source: HISTORICAL_SOURCE };
}

export function resetHistoricalCacheForTests(): void {
  cache = null;
}