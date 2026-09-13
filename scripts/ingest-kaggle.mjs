#!/usr/bin/env node
// RAILOPT AI - Kaggle historical dataset ingestion
// Streams the raw Kaggle CSV, validates + normalizes records, and writes
// compact aggregated artifacts under data/processed/. The raw files are read-only.
//
// Usage:
//   node scripts/ingest-kaggle.mjs                 (uses data/raw/ir_train.csv)
//   node scripts/ingest-kaggle.mjs --input <path>  (custom raw file)
//   node scripts/ingest-kaggle.mjs --out <dir>     (custom output directory)

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");

const args = process.argv.slice(2);
function flagValue(name, fallback) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}

const INPUT = path.resolve(flagValue("--input", path.join(ROOT, "data", "raw", "ir_train.csv")));
const OUT_DIR = path.resolve(flagValue("--out", path.join(ROOT, "data", "processed")));
const SOUTH_ZONE = "SR";

// ---------- CSV parsing (handles quotes, no external deps) ----------
function parseRow(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// ---------- normalization helpers ----------
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function normalizeDate(raw) {
  const v = String(raw).trim();
  if (!DATE_RE.test(v)) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return v;
}

function normalizeTrainNumber(raw) {
  const v = String(raw).trim();
  if (/^\d{5}$/.test(v)) return v;
  if (/^\d{1,4}$/.test(v)) return v.padStart(5, "0");
  return null;
}

function normalizeHour(raw) {
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n)) return null;
  if (!Number.isInteger(n) || n < 0 || n > 23) return null;
  return n;
}

function normalizeDelayMinutes(raw) {
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return Math.round(n);
}

function normalizeBinary(raw) {
  const n = Number(String(raw).trim());
  if (n === 0) return 0;
  if (n === 1) return 1;
  return null;
}

function normalizeOptionalNumber(raw) {
  const s = String(raw ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function normalizeZoneAbbr(raw) {
  const v = String(raw).trim().toUpperCase();
  return /^[A-Z]{2,5}$/.test(v) ? v : null;
}

// ---------- delay buckets ----------
const BUCKETS = ["0", "1-15", "16-30", "31-60", "61-120", "121-240", ">240"];
function bucketOf(delay) {
  if (delay === 0) return "0";
  if (delay <= 15) return "1-15";
  if (delay <= 30) return "16-30";
  if (delay <= 60) return "31-60";
  if (delay <= 120) return "61-120";
  if (delay <= 240) return "121-240";
  return ">240";
}

const ON_TIME_THRESHOLD = 15; // matches RAILOPT operational delay threshold
const SEVERE_THRESHOLD = 60; // documented severe-delay threshold for this layer

// ---------- stats structures ----------
const stats = {
  inputFile: INPUT,
  columnsUsed: [],
  columnsIgnored: [],
  inputRows: 0,
  validRows: 0,
  duplicateJourneys: 0,
  seenJourneys: new Set(),
  invalid: { total: 0, reasons: {} },
  missingPerColumn: {},
  journeyIdPattern: 0,
  srRows: 0,
  srZoneLabelMismatch: 0,
  zoneAbbrNormalized: 0,
  trainNumberPadded: 0,
};

const overall = {
  journeys: 0,
  delaySum: 0,
  delays: [],
  delayedCount: 0,
  severeCount: 0,
  onTimeCount: 0,
  byCause: new Map(),
  byBucket: new Map(),
  byYear: new Map(),
  byMonth: new Map(),
  byType: new Map(),
};

const byZone = new Map(); // zone_abbr -> aggregates
const byTrain = new Map(); // train_number -> aggregates
const southernJourneys = [];

function countMap(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`[ingest] Input not found: ${INPUT}`);
    process.exit(1);
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT),
    crlfDelay: Infinity,
  });

  let header = null;
  let col = {};
  let invalidSample = {};
  let missingInitialized = false;

  const collectInvalid = (key, detail) => {
    stats.invalid.total++;
    countMap(stats.invalid.reasons, key);
    if (!invalidSample[key]) invalidSample[key] = [];
    if (invalidSample[key].length < 3) invalidSample[key].push(detail);
  };

  for await (const line of rl) {
    if (line.trim() === "") continue;
    const cells = parseRow(line);

    if (!header) {
      if (cells[0]?.startsWith("\uFEFF")) cells[0] = cells[0].slice(1);
      header = cells;
      col = Object.fromEntries(cells.map((name, i) => [name, i]));
      stats.columnsUsed = Object.keys(col).filter((name) => USED_COLUMNS.has(name));
      stats.columnsIgnored = Object.keys(col).filter((name) => !USED_COLUMNS.has(name));
      URGENT_COLUMNS.forEach((name) => {
        if (col[name] === undefined) {
          console.error(`[ingest] FATAL: required column "${name}" missing from ${path.basename(INPUT)}`);
          process.exit(1);
        }
      });
      continue;
    }

    stats.inputRows++;

    // --- track missing values per column ---
    if (!missingInitialized) {
      Object.keys(col).forEach((name) => (stats.missingPerColumn[name] = 0));
      missingInitialized = true;
    }
    Object.keys(col).forEach((name) => {
      if (cells[col[name]] === undefined || String(cells[col[name]]).trim() === "") {
        stats.missingPerColumn[name]++;
      }
    });

    const get = (name) => cells[col[name]];

    // --- validate critical fields ---
    const journeyId = String(get("journey_id") ?? "").trim();
    if (!/^IR\d{8}$/.test(journeyId)) {
      collectInvalid("journey_id_invalid", journeyId || "(empty)");
      continue;
    }
    if (stats.seenJourneys.has(journeyId)) {
      stats.duplicateJourneys++;
      continue;
    }
    stats.seenJourneys.add(journeyId);
    stats.journeyIdPattern++;

    const trainNumber = normalizeTrainNumber(get("train_number"));
    if (!trainNumber) {
      collectInvalid("train_number_invalid", String(get("train_number")));
      continue;
    }

    const departureDate = normalizeDate(get("departure_date"));
    if (!departureDate) {
      collectInvalid("departure_date_invalid", String(get("departure_date")));
      continue;
    }

    const departureHour = normalizeHour(get("departure_hour"));
    if (departureHour === null) {
      collectInvalid("departure_hour_invalid", String(get("departure_hour")));
      continue;
    }

    const delayMinutes = normalizeDelayMinutes(get("delay_minutes"));
    if (delayMinutes === null) {
      collectInvalid("delay_minutes_invalid", String(get("delay_minutes")));
      continue;
    }

    const isDelayed = normalizeBinary(get("is_delayed"));
    if (isDelayed === null) {
      collectInvalid("is_delayed_invalid", String(get("is_delayed")));
      continue;
    }

    const trainType = String(get("train_type") ?? "").trim();
    if (!trainType) {
      collectInvalid("train_type_invalid", "(empty)");
      continue;
    }

    const zoneAbbr = normalizeZoneAbbr(get("zone_abbr"));
    if (!zoneAbbr) {
      collectInvalid("zone_abbr_invalid", String(get("zone_abbr")));
      continue;
    }

    // --- optional / informational fields (tolerate malformed) ---
    const zone = String(get("zone") ?? "").trim();
    const causeRaw = String(get("primary_delay_cause") ?? "").trim();
    const delayCause = causeRaw || "Unspecified";
    const sourceCat = String(get("source_station_category") ?? "").trim();
    const destCat = String(get("destination_station_category") ?? "").trim();
    const distanceKm = normalizeOptionalNumber(get("distance_km"));
    const numStops = normalizeOptionalNumber(get("num_scheduled_stops"));
    const travelHours = normalizeOptionalNumber(get("scheduled_travel_hours"));

    if (trainNumber.length < 5) stats.trainNumberPadded++;
    if (zoneAbbr !== String(get("zone_abbr")).trim().toUpperCase()) stats.zoneAbbrNormalized++;

    // --- valid record ---
    stats.validRows++;
    const delayed = isDelayed === 1;
    const severe = delayMinutes > SEVERE_THRESHOLD;
    const onTime = delayMinutes <= ON_TIME_THRESHOLD;

    // overall aggregates
    overall.journeys++;
    overall.delaySum += delayMinutes;
    overall.delays.push(delayMinutes);
    if (delayed) overall.delayedCount++;
    if (severe) overall.severeCount++;
    if (onTime) overall.onTimeCount++;
    countMap(overall.byCause, delayCause);
    countMap(overall.byBucket, bucketOf(delayMinutes));
    countMap(overall.byYear, Number(String(get("year")).trim() || departureDate.slice(0, 4)));
    countMap(overall.byMonth, Number(departureDate.slice(5, 7)));
    countMap(overall.byType, trainType);

    // zone aggregates
    let z = byZone.get(zoneAbbr);
    if (!z) {
      z = {
        zoneAbbr,
        zone,
        journeys: 0,
        delaySum: 0,
        delays: [],
        delayedCount: 0,
        severeCount: 0,
        onTimeCount: 0,
        byCause: new Map(),
      };
      byZone.set(zoneAbbr, z);
    }
    z.journeys++;
    z.delaySum += delayMinutes;
    z.delays.push(delayMinutes);
    if (delayed) z.delayedCount++;
    if (severe) z.severeCount++;
    if (onTime) z.onTimeCount++;
    countMap(z.byCause, delayCause);

    // train aggregates
    let t = byTrain.get(trainNumber);
    if (!t) {
      t = {
        trainNumber,
        trainType,
        zone: zoneAbbr,
        zoneAbbr,
        sourceStationCategory: sourceCat,
        destinationStationCategory: destCat,
        distanceKm,
        numScheduledStops: numStops,
        scheduledTravelHours: travelHours,
        firstDate: departureDate,
        lastDate: departureDate,
        journeys: 0,
        delaySum: 0,
        delays: [],
        delayedCount: 0,
        severeCount: 0,
        onTimeCount: 0,
        byCause: new Map(),
      };
      byTrain.set(trainNumber, t);
    }
    t.journeys++;
    t.delaySum += delayMinutes;
    t.delays.push(delayMinutes);
    if (delayed) t.delayedCount++;
    if (severe) t.severeCount++;
    if (onTime) t.onTimeCount++;
    if (departureDate < t.firstDate) t.firstDate = departureDate;
    if (departureDate > t.lastDate) t.lastDate = departureDate;
    countMap(t.byCause, delayCause);

    // Southern Railway subset (zone_abbr === SR)
    if (zoneAbbr === SOUTH_ZONE) {
      stats.srRows++;
      if (zone && !/Southern\s*Railway/i.test(zone)) stats.srZoneLabelMismatch++;
      southernJourneys.push({
        t: trainNumber,
        d: Number(departureDate.replace(/-/g, "")),
        h: departureHour,
        dm: delayMinutes,
        cause: delayCause,
      });
    }
  }

  stats.seenJourneys = null; // free memory

  // ---------- resolve cause index for southern journeys ----------
  const causeOrder = [...overall.byCause.entries()].sort((a, b) => b[1] - a[1]).map(([cause]) => cause);
  const causeIdx = new Map(causeOrder.map((c, i) => [c, i]));
  for (const j of southernJourneys) {
    j.c = causeIdx.get(j.cause) ?? 0;
    delete j.cause;
  }

  // ---------- helpers for final records ----------
  const sorted = (arr) => [...arr].sort((a, b) => a - b);
  function statsOf(delays, delayedCount, severeCount, onTimeCount, count) {
    const s = sorted(delays);
    const median = count ? s[Math.floor(count / 2)] : 0;
    const p90 = count ? s[Math.min(s.length - 1, Math.floor(count * 0.9))] : 0;
    return {
      avgDelay: count ? Math.round((delays.reduce((a, b) => a + b, 0) / count) * 10) / 10 : 0,
      medianDelay: median,
      p90Delay: p90,
      maxDelay: count ? s[s.length - 1] : 0,
      delayedRate: count ? Math.round((delayedCount / count) * 1000) / 1000 : 0,
      severeDelayRate: count ? Math.round((severeCount / count) * 1000) / 1000 : 0,
      onTimeRate: count ? Math.round((onTimeCount / count) * 1000) / 1000 : 0,
    };
  }

  // ---------- per-train records ----------
  const trainStats = [...byTrain.values()].map((t) => ({
    trainNumber: t.trainNumber,
    trainType: t.trainType,
    zoneAbbr: t.zoneAbbr,
    sourceStationCategory: t.sourceStationCategory || null,
    destinationStationCategory: t.destinationStationCategory || null,
    distanceKm: t.distanceKm,
    numScheduledStops: t.numScheduledStops !== null ? Math.round(t.numScheduledStops) : null,
    scheduledTravelHours: t.scheduledTravelHours,
    firstJourneyDate: t.firstDate,
    lastJourneyDate: t.lastDate,
    journeyCount: t.journeys,
    ...statsOf(t.delays, t.delayedCount, t.severeCount, t.onTimeCount, t.journeys),
    delayCauseDistribution: [...t.byCause.entries()].sort((a, b) => b[1] - a[1]).map(([cause, count]) => ({ cause, count })),
  }));

  // ---------- per-zone records ----------
  const zoneStats = [...byZone.values()].map((z) => ({
    zoneAbbr: z.zoneAbbr,
    zone: z.zone || z.zoneAbbr,
    journeys: z.journeys,
    ...statsOf(z.delays, z.delayedCount, z.severeCount, z.onTimeCount, z.journeys),
    topDelayCause: [...z.byCause.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unspecified",
  }));

  // ---------- cause stats ----------
  const causeStats = causeOrder.map((cause) => {
    const count = overall.byCause.get(cause);
    return {
      cause,
      journeys: count,
      share: stats.validRows ? Math.round((count / stats.validRows) * 1000) / 1000 : 0,
    };
  });

  // ---------- train type stats ----------
  const trainTypeStats = [...overall.byType.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([trainType, journeys]) => ({ trainType, journeys }));

  // ---------- overall summary ----------
  const bucketCounts = overall.byBucket;
  const overallStats = {
    journeys: overall.journeys,
    ...statsOf(overall.delays, overall.delayedCount, overall.severeCount, overall.onTimeCount, overall.journeys),
    delayBuckets: BUCKETS.map((bucket) => {
      const count = bucketCounts.get(bucket) ?? 0;
      return {
        bucket,
        journeys: count,
        share: overall.journeys ? Math.round((count / overall.journeys) * 1000) / 1000 : 0,
      };
    }),
    yearly: [...overall.byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, journeys]) => ({ year, journeys })),
    monthly: [...overall.byMonth.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([month, journeys]) => ({ month, journeys })),
  };

  // ---------- write outputs ----------
  const summary = {
    generatedAt: new Date().toISOString(),
    source: "KAGGLE_HISTORICAL",
    sourceLabel: "Public Kaggle dataset",
    disclaimer: "Historical intelligence only. Not live railway telemetry.",
    onTimeThresholdMinutes: ON_TIME_THRESHOLD,
    severeThresholdMinutes: SEVERE_THRESHOLD,
    overall: overallStats,
    zones: zoneStats.sort((a, b) => b.journeys - a.journeys),
    delayCauses: causeStats,
    trainTypes: trainTypeStats,
  };

  const southern = {
    generatedAt: new Date().toISOString(),
    source: "KAGGLE_HISTORICAL",
    zoneAbbr: SOUTH_ZONE,
    zone: "Southern Railway",
    journeyCount: southernJourneys.length,
    causes: causeOrder,
    journeys: southernJourneys.sort((a, b) => a.d - b.d),
  };

  const manifest = {
    generatedAt: new Date().toISOString(),
    inputFile: INPUT,
    inputRows: stats.inputRows,
    validRows: stats.validRows,
    duplicateJourneys: stats.duplicateJourneys,
    invalidRows: stats.invalid.total,
    invalidReasons: stats.invalid.reasons,
    invalidSamples: invalidSample,
    columnsUsed: stats.columnsUsed,
    columnsIgnored: stats.columnsIgnored,
    missingValuesPerColumn: stats.missingPerColumn,
    normalization: {
      trainNumberPaddedTo5: stats.trainNumberPadded,
      zoneAbbrNormalized: stats.zoneAbbrNormalized,
      southernRailwayRows: stats.srRows,
      southernRailwayZoneLabelMismatch: stats.srZoneLabelMismatch,
    },
    onTimeThresholdMinutes: ON_TIME_THRESHOLD,
    severeThresholdMinutes: SEVERE_THRESHOLD,
    southZone: SOUTH_ZONE,
    outputFiles: {},
  };

  const files = {
    "kaggle_historical_summary.json": summary,
    "kaggle_historical_train_stats.json": trainStats,
    "kaggle_historical_southern.json": southern,
    "kaggle_manifest.json": manifest,
  };

  for (const [name, data] of Object.entries(files)) {
    const fp = path.join(OUT_DIR, name);
    fs.writeFileSync(fp, JSON.stringify(data));
    manifest.outputFiles[name] = {
      bytes: fs.statSync(fp).size,
      records: Array.isArray(data) ? data.length : typeof data === "object" && data.journeys ? data.journeys.length : typeof data === "object" ? data.overall?.journeys ?? data.validRows ?? null : null,
    };
  }

  // ---------- console report ----------
  const fmt = (b) => (b >= 1024 * 1024 ? (b / 1024 / 1024).toFixed(2) + " MB" : (b / 1024).toFixed(1) + " KB");
  console.log("\n===== KAGGLE INGESTION REPORT =====");
  console.log(`input file:       ${INPUT}`);
  console.log(`input rows:       ${stats.inputRows.toLocaleString()}`);
  console.log(`valid rows:       ${stats.validRows.toLocaleString()}`);
  console.log(`invalid rows:     ${stats.invalid.total.toLocaleString()}`);
  Object.entries(stats.invalid.reasons).forEach(([k, v]) => console.log(`  - ${k}: ${v}`));
  console.log(`duplicate rows:   ${stats.duplicateJourneys.toLocaleString()}`);
  console.log(`missing fields:   ${Object.entries(stats.missingPerColumn).filter(([, v]) => v > 0).length} column(s) flagged; total empty cells: ${Object.values(stats.missingPerColumn).reduce((a, b) => a + b, 0).toLocaleString()}`);
  console.log(`columns used:     ${stats.columnsUsed.length} -> ${stats.columnsUsed.join(", ")}`);
  console.log(`columns ignored:  ${stats.columnsIgnored.length} -> ${stats.columnsIgnored.slice(0, 12).join(", ")}${stats.columnsIgnored.length > 12 ? "..." : ""}`);
  console.log(`Southern Railway rows (zone_abbr=${SOUTH_ZONE}): ${stats.srRows.toLocaleString()} (label mismatches: ${stats.srZoneLabelMismatch})`);
  console.log(`overall: ${overall.journeys.toLocaleString()} journeys | avg ${overallStats.avgDelay} min | median ${overallStats.medianDelay} | severe(>${SEVERE_THRESHOLD}) ${overallStats.severeDelayRate * 100}% | on-time(<=${ON_TIME_THRESHOLD}) ${overallStats.onTimeRate * 100}%`);
  console.log(`distinct trains:  ${trainStats.length.toLocaleString()} | distinct zones: ${zoneStats.length}`);
  for (const [name, data] of Object.entries(files)) {
    console.log(`output: ${name} (${fmt(fs.statSync(path.join(OUT_DIR, name)).size)})`);
  }
  console.log("===== END REPORT =====\n");
}

async function start() {
  try {
    await main();
  } catch (err) {
    console.error("[ingest] FAILED:", err);
    process.exit(1);
  }
}

// referenced column sets (by exact header name)
const USED_COLUMNS = new Set([
  "journey_id",
  "train_number",
  "train_type",
  "departure_date",
  "year",
  "month",
  "departure_hour",
  "zone",
  "zone_abbr",
  "source_station_category",
  "destination_station_category",
  "distance_km",
  "num_scheduled_stops",
  "scheduled_travel_hours",
  "primary_delay_cause",
  "delay_minutes",
  "is_delayed",
]);
const URGENT_COLUMNS = new Set([
  "journey_id",
  "train_number",
  "train_type",
  "departure_date",
  "departure_hour",
  "zone",
  "zone_abbr",
  "primary_delay_cause",
  "delay_minutes",
  "is_delayed",
]);

start();