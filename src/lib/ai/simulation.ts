import type {
  Block,
  MaintenanceRequest,
  SimulationScenario,
  SimulationScenarioResult,
  SimulationWindow,
  TrainSchedule,
} from "../types";
import { addMinutes, formatSlotRange, toDate } from "../time";
import { analyzeBlockImpact, type BlockImpactAnalysis } from "./train-impact";
import { DEFAULT_SIM_PARAMS } from "../store";

export interface SimulationInput {
  request: MaintenanceRequest;
  scenario: SimulationScenario;
  trains: TrainSchedule[];
  existingBlocks: Block[];
  anchorBlock?: Block;
  alternativeStartTime?: string;
  durationMinutes?: number;
  blockStartOffset?: number;
  now?: Date;
}

export type { SimulationScenario, SimulationScenarioResult, SimulationWindow } from "../types";

const MIN_DURATION_MINUTES = 30;
const MAX_DURATION_MINUTES = 360;

const clampDuration = (minutes: number): number =>
  Math.max(MIN_DURATION_MINUTES, Math.min(MAX_DURATION_MINUTES, Math.round(minutes)));

function referenceDay(trains: TrainSchedule[]): Date | null {
  for (const t of trains) {
    if (!t.stops || !t.stops.length) continue;
    for (const s of t.stops) {
      const raw = (s as { departureTime?: string }).departureTime || (s as { arrivalTime?: string }).arrivalTime;
      if (!raw) continue;
      const d = toDate(String(raw));
      if (!Number.isNaN(d.getTime())) {
        const ref = new Date(d);
        ref.setHours(6, 0, 0, 0);
        return ref;
      }
    }
  }
  return null;
}

function resolveDuration(input: SimulationInput): number {
  if (input.durationMinutes !== undefined) {
    const n = Number(input.durationMinutes);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return clampDuration(n);
  }
  return clampDuration(input.request.estimatedDuration || 90);
}

function resolveProposedWindow(input: SimulationInput, now: Date, duration: number): SimulationWindow {
  const anchor = input.anchorBlock;
  if (anchor && anchor.startTime && anchor.endTime) {
    return {
      startTime: anchor.startTime,
      endTime: anchor.endTime,
      durationMinutes: clampDuration(
        anchor.durationMinutes ||
          Math.round((new Date(anchor.endTime).getTime() - new Date(anchor.startTime).getTime()) / 60000)
      ),
    };
  }

  const offset = Math.max(0, Number(input.blockStartOffset) || DEFAULT_SIM_PARAMS.blockStartOffset);
  const scheduleDay = referenceDay(input.trains);
  const requested = scheduleDay ?? new Date(`${input.request.requestedDate}T06:00:00`);
  const base = Number.isNaN(requested.getTime()) ? now : requested;
  const earliest = addMinutes(base, Math.round(offset * 60));
  earliest.setMinutes(earliest.getMinutes() < 30 ? 0 : 30, 0, 0);
  return {
    startTime: earliest.toISOString(),
    endTime: addMinutes(earliest, duration).toISOString(),
    durationMinutes: duration,
  };
}

function windowToBlock(request: MaintenanceRequest, win: SimulationWindow, riskReduction: number): Block {
  return {
    id: `SIM-${request.id}-${Date.now()}`,
    requestId: request.id,
    location: request.location,
    section: request.section,
    startTime: win.startTime,
    endTime: win.endTime,
    durationMinutes: win.durationMinutes,
    teamId: "-",
    teamName: "Simulation",
    affectedTrainIds: [],
    expectedDelay: 0,
    priority: request.priority,
    riskReduction,
    status: "Proposed",
    riskScore: request.riskScore,
  };
}

function countConflicts(window: SimulationWindow, blocks: Block[]): number {
  const start = toDate(window.startTime);
  const end = toDate(window.endTime);
  return blocks.filter(
    (b) =>
      (b.status === "Approved" || b.status === "Active") &&
      toDate(b.startTime) < end &&
      toDate(b.endTime) > start
  ).length;
}

export function evaluateSimulation(input: SimulationInput): SimulationScenarioResult {
  const now = input.now ?? new Date();
  const duration = resolveDuration(input);
  const proposed = resolveProposedWindow(input, now, duration);

  if (duration <= 0) {
    return {
      scenario: input.scenario,
      requestId: input.request.id,
      persisted: false,
      proposedWindow: proposed,
      chosenWindow: null,
      kpis: { trainsAffected: 0, maxDelay: 0, totalDelay: 0, conflicts: 0, blockStatus: "Invalid duration" },
      impacts: [],
      summary: "Simulation could not be completed. Please check the selected block and try again.",
      recommendation: "Provide a valid block duration (30–360 minutes) before simulating.",
      comparison: null,
    };
  }

  const riskReduction = Math.round(input.request.riskScore * 0.6);

  if (input.scenario === "defer" || input.scenario === "reject") {
    const label = input.scenario === "defer" ? "Deferring" : "Rejecting";
    return {
      scenario: input.scenario,
      requestId: input.request.id,
      persisted: false,
      proposedWindow: proposed,
      chosenWindow: null,
      kpis: {
        trainsAffected: 0,
        maxDelay: 0,
        totalDelay: 0,
        conflicts: 0,
        blockStatus: input.scenario === "defer" ? "Deferred (not executed)" : "Rejected (not executed)",
      },
      impacts: [],
      summary: `${label} this block keeps every train on schedule today (0 trains affected, 0 min total delay).`,
      recommendation: `The maintenance request ${input.request.id} would remain ${input.request.status === "Open" ? "open" : input.request.status} until rescheduled; asset risk score ${input.request.riskScore} stays unmitigated. Send to approval or reschedule when a quieter window is available.`,
      comparison: {
        proposed: { trainsAffected: 0, maxDelay: 0, totalDelay: 0 },
        chosen: { trainsAffected: 0, maxDelay: 0, totalDelay: 0 },
        locked: false,
      },
    };
  }

  let chosen: SimulationWindow = proposed;
  if (input.scenario === "move") {
    let start = input.alternativeStartTime ? toDate(input.alternativeStartTime) : toDate(proposed.startTime);
    const proposedDay = toDate(proposed.startTime);
    const altDay = start.getFullYear() === proposedDay.getFullYear() &&
      start.getMonth() === proposedDay.getMonth() &&
      start.getDate() === proposedDay.getDate();
    if (!altDay) {
      const alt = toDate(proposed.startTime);
      alt.setHours(start.getHours(), start.getMinutes(), 0, 0);
      start = alt;
    }
    const alternative: SimulationWindow = {
      startTime: start.toISOString(),
      endTime: addMinutes(start, duration).toISOString(),
      durationMinutes: duration,
    };
    chosen = alternative;
  }

  const block = windowToBlock(input.request, chosen, riskReduction);
  const analysis: BlockImpactAnalysis = analyzeBlockImpact(block, input.trains);
  const proposedAnalysis: BlockImpactAnalysis =
    input.scenario === "move" ? analyzeBlockImpact(windowToBlock(input.request, proposed, riskReduction), input.trains) : analysis;

  const kpis = {
    trainsAffected: analysis.impacts.length,
    maxDelay: analysis.maxDelay,
    totalDelay: analysis.totalDelay,
    conflicts: countConflicts(chosen, input.existingBlocks),
    blockStatus: "Proposed (simulation only)",
  };

  const affects = (a: BlockImpactAnalysis) => ({
    trainsAffected: a.impacts.length,
    maxDelay: a.maxDelay,
    totalDelay: a.totalDelay,
  });

  const summary =
    input.scenario === "accept"
      ? `Accepting this block (${formatSlotRange(toDate(chosen.startTime), toDate(chosen.endTime))}) affects ${kpis.trainsAffected} train${kpis.trainsAffected === 1 ? "" : "s"} with a maximum delay of ${kpis.maxDelay} min and ${kpis.totalDelay} min total delay.`
      : `Moving the block to ${formatSlotRange(toDate(chosen.startTime), toDate(chosen.endTime))} affects ${kpis.trainsAffected} train${kpis.trainsAffected === 1 ? "" : "s"} (max ${kpis.maxDelay} min, total ${kpis.totalDelay} min) versus ${proposedAnalysis.impacts.length} trains (max ${proposedAnalysis.maxDelay} min, total ${proposedAnalysis.totalDelay} min) at the proposed window.`;

  const quieter = analysis.totalDelay <= proposedAnalysis.totalDelay;
  const recommendation =
    input.scenario === "accept"
      ? `Preferred window ${formatSlotRange(toDate(chosen.startTime), toDate(chosen.endTime))} — ${kpis.trainsAffected} affected, ${kpis.maxDelay} min max delay${kpis.conflicts ? `, overlapping ${kpis.conflicts} existing approved block(s)` : ""}. Review below and send to approval.`
      : quieter
        ? `Moving to ${formatSlotRange(toDate(chosen.startTime), toDate(chosen.endTime))} reduces impact (${Math.abs(analysis.totalDelay - proposedAnalysis.totalDelay)} min saved) versus the proposed window.`
        : `The proposed window is quieter than the requested move (${formatSlotRange(toDate(proposed.startTime), toDate(proposed.endTime))}). Prefer the proposed window.`;

  return {
    scenario: input.scenario,
    requestId: input.request.id,
    persisted: false,
    proposedWindow: proposed,
    chosenWindow: chosen,
    kpis,
    impacts: analysis.impacts,
    summary,
    recommendation,
    comparison: {
      proposed: affects(proposedAnalysis),
      chosen: affects(analysis),
      locked: input.scenario === "accept",
    },
  };
}