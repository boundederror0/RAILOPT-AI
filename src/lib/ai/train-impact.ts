import type { Block, TrainSchedule } from "../types";
import { diffMinutes, toDate } from "../time";

export const SECTION_STATIONS: Record<string, string[]> = {
  "Madurai–Melur": ["Madurai", "Melur", "Mandapam"],
  "Madurai–Dindigul": ["Madurai", "Kodaikanal Road", "Dindigul"],
  "Dindigul–Tiruchirappalli": ["Dindigul", "Tiruchirappalli"],
  "Madurai–Virudhunagar": ["Madurai", "Virudhunagar"],
  "Rameswaram Line": ["Mandapam", "Rameswaram"],
  "Madurai–Coimbatore": ["Pollachi", "Coimbatore"],
  "Chennai–Madurai (Chord)": ["Ariyalur", "Karaikudi"],
  "Madurai–Tenkasi": ["Madurai", "Tenkasi"],
};

export const SECTION_TRAINS: Record<string, string[]> = {
  "Madurai–Melur": ["12635", "16101", "16321", "12666", "12694", "06836", "56825", "12668"],
  "Madurai–Dindigul": ["12635", "12636", "16101", "16321", "12666", "12694", "12668"],
  "Dindigul–Tiruchirappalli": ["12635", "12636", "16101", "16321", "12666", "12694", "57821", "12668"],
  "Madurai–Virudhunagar": ["16101", "16321", "12666", "12694", "56825", "06451", "57821", "12668"],
  "Rameswaram Line": ["56825"],
  "Madurai–Coimbatore": ["12679"],
  "Chennai–Madurai (Chord)": ["12635", "16101", "16321", "12666", "12668"],
  "Madurai–Tenkasi": ["06451", "16321"],
};

export type DelaySeverity = "None" | "Minor" | "Moderate" | "High" | "Severe";

export interface TrainImpact {
  trainId: string;
  number: string;
  name: string;
  route: string;
  type: string;
  scheduledTime: string;
  affectedStation: string;
  expectedDelay: number;
  delaySeverity: DelaySeverity;
  alternativeAction: string;
  timeWindowStart: string;
  timeWindowEnd: string;
}

export interface BlockImpactAnalysis {
  blockId: string;
  requestId: string;
  location: string;
  section: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  includedTrains: string[];
  totalDelay: number;
  maxDelay: number;
  severity: DelaySeverity;
  impacts: TrainImpact[];
}

const PRIORITY_FACTOR: Record<string, number> = {
  Critical: 1.25,
  High: 1.0,
  Medium: 0.72,
  Low: 0.45,
};

const TYPE_FACTOR: Record<string, number> = {
  Freight: 0.4,
  DEMU: 0.65,
  MEMU: 0.65,
  Passenger: 0.7,
  Express: 0.9,
  Superfast: 1.0,
};

export function severityOf(delay: number): DelaySeverity {
  if (delay <= 0) return "None";
  if (delay < 10) return "Minor";
  if (delay < 30) return "Moderate";
  if (delay < 60) return "High";
  return "Severe";
}

function passageWindowFor(train: TrainSchedule, section: string): { start: Date; end: Date; station: string } {
  const corridor = SECTION_STATIONS[section] ?? [];
  const stops = train.stops.filter((s) => s.station);
  let start: Date | null = null;
  let end: Date | null = null;
  let station = "";

  const corridorIdx = stops.findIndex((s) => corridor.includes(s.station));
  if (corridorIdx === -1) {
    return {
      start: toDate(train.departureTime),
      end: toDate(train.arrivalTime),
      station: train.route.split("–")[0] ?? train.route,
    };
  }

  const entry = stops[corridorIdx];
  const exit = stops[corridorIdx + 1];
  if (entry) {
    start = toDate(entry.departureTime || entry.arrivalTime);
    station = entry.station;
  }
  if (exit && start) end = toDate(exit.arrivalTime);
  if (!end) end = toDate(train.arrivalTime);

  return { start: start!, end: end!, station };
}

export function analyzeBlockImpact(block: Block, trains: TrainSchedule[]): BlockImpactAnalysis {
  const start = toDate(block.startTime);
  const end = toDate(block.endTime);
  const trainNums = SECTION_TRAINS[block.section] ?? [];
  const impacts: TrainImpact[] = [];

  for (const train of trains) {
    if (!trainNums.includes(train.number)) continue;
    const { start: wStart, end: wEnd, station } = passageWindowFor(train, block.section);
    const overlapStart = new Date(Math.max(start.getTime(), wStart.getTime()));
    const overlapEnd = new Date(Math.min(end.getTime(), wEnd.getTime()));
    const overlap = diffMinutes(overlapStart, overlapEnd);
    if (overlap <= 0) continue;

    const factor = (PRIORITY_FACTOR[train.priority] ?? 0.7) * (TYPE_FACTOR[train.type] ?? 0.8);
    const delay = Math.min(90, Math.round(overlap * factor));

    impacts.push({
      trainId: train.id,
      number: train.number,
      name: train.name,
      route: train.route,
      type: train.type,
      scheduledTime: train.arrivalTime.includes("T-1") || !train.arrivalTime ? train.departureTime : train.arrivalTime,
      affectedStation: station,
      expectedDelay: delay,
      delaySeverity: severityOf(delay),
      alternativeAction:
        delay === 0
          ? "No action required."
          : delay < 10
            ? "Hold at previous station; no reschedule needed."
            : delay < 30
              ? "Advise regulation of 5–10 min at preceding station."
              : "Reschedule departure / route via chord line if available.",
      timeWindowStart: new Date(wStart).toISOString(),
      timeWindowEnd: new Date(wEnd).toISOString(),
    });
  }

  impacts.sort((a, b) => b.expectedDelay - a.expectedDelay);
  const totalDelay = impacts.reduce((s, i) => s + i.expectedDelay, 0);
  const maxDelay = impacts.length ? impacts[0].expectedDelay : 0;

  return {
    blockId: block.id,
    requestId: block.requestId,
    location: block.location,
    section: block.section,
    startTime: block.startTime,
    endTime: block.endTime,
    durationMinutes: block.durationMinutes,
    includedTrains: impacts.map((i) => i.number),
    totalDelay,
    maxDelay,
    severity: severityOf(Math.max(maxDelay, Math.round(totalDelay / Math.max(1, impacts.length)))),
    impacts,
  };
}

export function expectedDelayFor(block: Block, trains: TrainSchedule[]): number {
  return analyzeBlockImpact(block, trains).totalDelay;
}