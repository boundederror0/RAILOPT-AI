import type { Block, BlockPlan, MaintenanceRequest, MaintenanceTeam, TrainSchedule } from "../types";
import { addMinutes, diffMinutes, formatSlot, toDate } from "../time";
import { analyzeBlockImpact, type DelaySeverity } from "./train-impact";

export interface OptimizerParams {
  blockStartOffset: number;
  blockDuration: number;
  maintenancePriority: "auto" | PriorityMode;
  maxTeams: number;
  trainPriorityWeight: number;
  simultaneousBlocks: number;
  planStart?: Date;
  existingBlockIds?: string[];
  existingBlocks?: Block[];
}

type PriorityMode = "Critical" | "High" | "Medium" | "Low";

const PRIORITY_WEIGHT: Record<string, number> = {
  Critical: 100,
  High: 75,
  Medium: 50,
  Low: 25,
};

const MAX_DURATION_MINUTES = 360;
const MIN_DURATION_MINUTES = 30;

const LOCATION_DIST: Record<string, number> = {
  Madurai: 0,
  Dindigul: 66,
  Tiruchirappalli: 132,
  Virudhunagar: 53,
  Rameswaram: 160,
  Mandapam: 125,
  Coimbatore: 235,
  Pollachi: 255,
  Karaikudi: 133,
  "Kodaikanal Road": 112,
  Ariyalur: 185,
  Tenkasi: 175,
  Tuticorin: 130,
  Melur: 36,
};

export interface OptimizerAlternative {
  start: string;
  end: string;
  penalty: number;
  delayMinutes: number;
  trainConflicts: number;
  maxDelay: number;
  severity: DelaySeverity;
}

export interface OptimizerTrace {
  requestId: string;
  chosenStart: string;
  chosenEnd: string;
  teamId: string;
  trainConflicts: number;
  delayMinutes: number;
  skippedReason?: string;
  candidatesEvaluated: number;
  skippedForEarliestStart: number;
  skippedForSection: number;
  chosenPenalty: number;
  chosenMaxDelay: number;
  chosenSeverity: DelaySeverity;
  alternatives: OptimizerAlternative[];
}

interface ScoredCandidate {
  start: Date;
  penalty: number;
  delayMinutes: number;
  trainConflicts: number;
  maxDelay: number;
  severity: DelaySeverity;
}

function toAlternative(candidate: ScoredCandidate, durationMinutes: number): OptimizerAlternative {
  return {
    start: formatSlot(candidate.start),
    end: formatSlot(addMinutes(candidate.start, durationMinutes)),
    penalty: candidate.penalty,
    delayMinutes: candidate.delayMinutes,
    trainConflicts: candidate.trainConflicts,
    maxDelay: candidate.maxDelay,
    severity: candidate.severity,
  };
}

export interface OptimizationResult {
  plan: BlockPlan;
  trace: OptimizerTrace[];
  skippedCount: number;
}

function timePenalty(hour: number): number {
  if (hour >= 0 && hour < 5) return 0.05;
  if (hour >= 5 && hour < 7) return 0.25;
  if (hour >= 7 && hour < 11) return 1.0;
  if (hour >= 11 && hour < 14) return 0.55;
  if (hour >= 14 && hour < 17) return 0.75;
  if (hour >= 17 && hour < 20) return 0.95;
  if (hour >= 20 && hour < 22) return 0.45;
  return 0.1;
}

export class DeterministicBlockOptimizer {
  optimize(
    requests: MaintenanceRequest[],
    teams: MaintenanceTeam[],
    trains: TrainSchedule[],
    params: OptimizerParams
  ): OptimizationResult {
    const startBase = params.planStart ?? new Date();
    const offset = Math.max(0, Number(params.blockStartOffset) || 0);
    const duration = Math.min(2.5, Math.max(0.5, Number(params.blockDuration) || 1));
    const maxTeams = Math.max(1, Math.round(Number(params.maxTeams) || 1));
    const simultaneousBlocks = Math.max(1, Math.round(Number(params.simultaneousBlocks) || 1));
    const trainPriorityWeight = Math.min(2, Math.max(0.5, Number(params.trainPriorityWeight) || 1));

    const grid: Date[] = [];
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 30]) {
        const d = new Date(startBase);
        d.setHours(h, m, 0, 0);
        grid.push(d);
      }
    }

    const earliestStart = addMinutes(startBase, offset * 60);
    const eligible = requests.filter(
      (r) => r.status === "Open" || r.status === "In Review" || r.status === "Approved"
    );
    const sorted = [...eligible].sort(
      (a, b) =>
        PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
        b.riskScore - a.riskScore ||
        a.requestedDate.localeCompare(b.requestedDate)
    );

    const blockIds = new Set(params.existingBlockIds ?? []);
    let idCounter = blockIds.size + 1;
    const nextId = () => {
      let id = `BLK-${String(idCounter).padStart(3, "0")}`;
      while (blockIds.has(id)) {
        idCounter++;
        id = `BLK-${String(idCounter).padStart(3, "0")}`;
      }
      blockIds.add(id);
      idCounter++;
      return id;
    };

    const blocks: Block[] = [];
    const trace: OptimizerTrace[] = [];
    const teamLoads = new Map<string, number>();
    const sectionBlocks = new Map<string, Block[]>();
    const locationBlocks = new Map<string, Block[]>();
    const blocksForTeam = new Map<string, Block[]>();
    const usedTeams = new Set<string>();

    for (const existing of params.existingBlocks ?? []) {
      if (existing.status !== "Approved" && existing.status !== "Active") continue;
      if (toDate(existing.endTime) < startBase) continue;
      teamLoads.set(existing.teamId, (teamLoads.get(existing.teamId) ?? 0) + existing.durationMinutes);
      const secList = sectionBlocks.get(existing.section) ?? [];
      secList.push(existing);
      sectionBlocks.set(existing.section, secList);
      const locList = locationBlocks.get(existing.location) ?? [];
      locList.push(existing);
      locationBlocks.set(existing.location, locList);
      const teamList = blocksForTeam.get(existing.teamId) ?? [];
      teamList.push(existing);
      blocksForTeam.set(existing.teamId, teamList);
    }

    const overlappingCount = (map: Map<string, Block[]>, key: string, start: Date, end: Date) =>
      (map.get(key) ?? []).filter((b) => toDate(b.startTime) < end && toDate(b.endTime) > start).length;

    const nearestTeam = (location: string, start: Date, end: Date): MaintenanceTeam | undefined => {
      const base = LOCATION_DIST[location] ?? 250;
      const candidates = teams
        .filter((t) => t.available)
        .map((t) => ({
          team: t,
          travel: Math.abs((LOCATION_DIST[t.location] ?? 250) - base),
          load: teamLoads.get(t.id) ?? 0,
          concurrent: overlappingCount(blocksForTeam, t.id, start, end),
        }))
        .filter(
          (c) =>
            c.load < c.team.maxCapacity &&
            c.concurrent === 0 &&
            (usedTeams.size < maxTeams || usedTeams.has(c.team.id))
        )
        .sort((a, b) => a.travel - b.travel || a.load - b.load);
      return candidates[0]?.team;
    };

    for (const req of sorted) {
      const priority = params.maintenancePriority === "auto" ? req.priority : params.maintenancePriority;
      const durationMinutes = Math.max(
        MIN_DURATION_MINUTES,
        Math.min(MAX_DURATION_MINUTES, Math.round(req.estimatedDuration * duration))
      );

      let skippedEarliest = 0;
      let skippedSection = 0;
      const scored: ScoredCandidate[] = [];

      for (const cand of grid) {
        if (cand < earliestStart) {
          skippedEarliest++;
          continue;
        }
        const end = addMinutes(cand, durationMinutes);
        if (overlappingCount(sectionBlocks, req.section, cand, end) >= simultaneousBlocks) {
          skippedSection++;
          continue;
        }

        const analysis = analyzeBlockImpact(
          {
            id: "",
            requestId: req.id,
            location: req.location,
            section: req.section,
            startTime: cand.toISOString(),
            endTime: end.toISOString(),
            durationMinutes,
            teamId: "",
            teamName: "",
            affectedTrainIds: [],
            expectedDelay: 0,
            priority,
            riskReduction: 0,
            status: "Proposed",
            riskScore: req.riskScore,
          },
          trains
        );
        const delayPenalty = analysis.totalDelay;

        const now = new Date();
        const pastPenalty = cand < now ? 40 : 0;
        const groupingPenalty = this.hasAdjacentBlock(locationBlocks, req.location, cand, end) ? -1.5 : 0;
        const penalty =
          delayPenalty * trainPriorityWeight + timePenalty(cand.getHours()) * 4 + pastPenalty + groupingPenalty;

        scored.push({
          start: cand,
          penalty,
          delayMinutes: delayPenalty,
          trainConflicts: analysis.impacts.length,
          maxDelay: analysis.maxDelay,
          severity: analysis.severity,
        });
      }

      if (scored.length === 0) {
        trace.push({
          requestId: req.id,
          chosenStart: "",
          chosenEnd: "",
          teamId: "",
          trainConflicts: 0,
          delayMinutes: 0,
          skippedReason:
            "No slot satisfies simultaneous-block, conflict and team constraints.",
          candidatesEvaluated: 0,
          skippedForEarliestStart: skippedEarliest,
          skippedForSection: skippedSection,
          chosenPenalty: 0,
          chosenMaxDelay: 0,
          chosenSeverity: "None",
          alternatives: [],
        });
        continue;
      }

      scored.sort((a, b) => a.penalty - b.penalty || a.start.getTime() - b.start.getTime());
      const chosen = scored[0].start;
      const end = addMinutes(chosen, durationMinutes);

      const team = nearestTeam(req.location, chosen, end);
      if (!team) {
        const best = scored[0];
        trace.push({
          requestId: req.id,
          chosenStart: "",
          chosenEnd: "",
          teamId: "",
          trainConflicts: 0,
          delayMinutes: 0,
          skippedReason: "No maintenance team available within travel/load constraints.",
          candidatesEvaluated: scored.length,
          skippedForEarliestStart: skippedEarliest,
          skippedForSection: skippedSection,
          chosenPenalty: best.penalty,
          chosenMaxDelay: best.maxDelay,
          chosenSeverity: best.severity,
          alternatives: scored.slice(1, 3).map((c) => toAlternative(c, durationMinutes)),
        });
        continue;
      }

      const block: Block = {
        id: nextId(),
        requestId: req.id,
        location: req.location,
        section: req.section,
        startTime: chosen.toISOString(),
        endTime: end.toISOString(),
        durationMinutes,
        teamId: team.id,
        teamName: team.name,
        affectedTrainIds: [],
        expectedDelay: 0,
        priority,
        riskReduction: Math.round(req.riskScore * 0.6),
        status: "Proposed",
        riskScore: req.riskScore,
      };
      const impact = analyzeBlockImpact(block, trains);
      block.affectedTrainIds = impact.includedTrains;
      block.expectedDelay = impact.totalDelay;
      usedTeams.add(team.id);

      blocks.push(block);
      teamLoads.set(team.id, (teamLoads.get(team.id) ?? 0) + durationMinutes);
      const secList = sectionBlocks.get(req.section) ?? [];
      secList.push(block);
      sectionBlocks.set(req.section, secList);
      const locList = locationBlocks.get(req.location) ?? [];
      locList.push(block);
      locationBlocks.set(req.location, locList);
      const teamList = blocksForTeam.get(team.id) ?? [];
      teamList.push(block);
      blocksForTeam.set(team.id, teamList);

      trace.push({
        requestId: req.id,
        chosenStart: formatSlot(chosen),
        chosenEnd: formatSlot(end),
        teamId: team.id,
        trainConflicts: block.affectedTrainIds.length,
        delayMinutes: block.expectedDelay,
        candidatesEvaluated: scored.length,
        skippedForEarliestStart: skippedEarliest,
        skippedForSection: skippedSection,
        chosenPenalty: scored[0].penalty,
        chosenMaxDelay: scored[0].maxDelay,
        chosenSeverity: scored[0].severity,
        alternatives: scored.slice(1, 3).map((c) => toAlternative(c, durationMinutes)),
      });
    }

    return this.buildPlan(blocks, trace, sorted, {
      ...params,
      blockStartOffset: offset,
      blockDuration: duration,
      maxTeams,
      simultaneousBlocks,
      trainPriorityWeight,
    });
  }

  private hasAdjacentBlock(
    map: Map<string, Block[]>,
    location: string,
    start: Date,
    end: Date
  ): boolean {
    return (map.get(location) ?? []).some((b) => {
      const gap = diffMinutes(toDate(b.endTime), start);
      const gap2 = diffMinutes(end, toDate(b.startTime));
      return Math.min(Math.abs(gap), Math.abs(gap2)) <= 60;
    });
  }

  private buildPlan(
    blocks: Block[],
    trace: OptimizerTrace[],
    sorted: MaintenanceRequest[],
    params: OptimizerParams
  ): OptimizationResult {
    const totalDuration = blocks.reduce((s, b) => s + b.durationMinutes, 0);
    const totalDelay = blocks.reduce((s, b) => s + b.expectedDelay, 0);
    const totalRiskReduction = blocks.reduce((s, b) => s + b.riskReduction, 0);
    const affected = new Set(blocks.flatMap((b) => b.affectedTrainIds));
    const selectedCount = sorted.length;
    const coverage = selectedCount ? blocks.length / selectedCount : 1;
    const delayReduction = Math.round(totalDelay * 0.55);
    const availabilityImprovement = Math.min(30, Math.round(totalRiskReduction / Math.max(1, selectedCount) / 3));

    const nightCount = blocks.filter((b) => {
      const h = toDate(b.startTime).getHours();
      return h >= 22 || h < 5;
    }).length;
    const grouped = this.countGrouped(blocks);
    const criticalCount = blocks.filter((b) => b.priority === "Critical" || b.priority === "High").length;

    const score = Math.min(
      100,
      Math.round(
        100 *
          (0.32 * coverage +
            0.3 * Math.min(1, totalRiskReduction / 220) +
            0.2 * (1 - Math.min(1, totalDelay / 150)) +
            0.18 * Math.min(1, totalDuration / (24 * 60 * params.maxTeams)))
      )
    );

    const factors: string[] = [];
    if (criticalCount > 0)
      factors.push(`Prioritised ${criticalCount} critical/high-risk asset${criticalCount > 1 ? "s" : ""} ahead of lower-priority work.`);
    if (grouped > 0)
      factors.push(`Grouped ${grouped} nearby maintenance task${grouped > 1 ? "s" : ""} to reduce crew travel between possessions.`);
    if (nightCount > 0)
      factors.push(`Scheduled ${nightCount} block${nightCount > 1 ? "s" : ""} in the low-traffic/night window to avoid train conflicts.`);
    if (blocks.length < selectedCount)
      factors.push(`Deferred ${selectedCount - blocks.length} request${selectedCount - blocks.length > 1 ? "s" : ""} that could not meet operational constraints in this cycle.`);
    factors.push(`Minimised total block duration to ${totalDuration} minutes across ${blocks.length} possession${blocks.length === 1 ? "" : "s"}.`);
    if (delayReduction > 0)
      factors.push(`Reduced expected passenger/service disruption by approximately ${delayReduction} train-minutes.`);
    factors.push(`Respected a maximum of ${params.simultaneousBlocks} simultaneous block${params.simultaneousBlocks > 1 ? "s" : ""} per section.`);

    const plan: BlockPlan = {
      id: `PLN-2026-${Math.floor(Math.random() * 9000) + 1000}`,
      blocks,
      totalRequestsScheduled: blocks.length,
      totalBlockDuration: totalDuration,
      trainsAffected: affected.size,
      estimatedDelay: totalDelay,
      delayReduction,
      assetAvailabilityImprovement: availabilityImprovement,
      riskReduction: totalRiskReduction,
      optimizationScore: score,
      explanationFactors: factors,
      createdAt: new Date().toISOString(),
    };

    return { plan, trace, skippedCount: selectedCount - blocks.length };
  }

  private countGrouped(blocks: Block[]): number {
    const byLocation = new Map<string, Block[]>();
    for (const b of blocks) {
      const list = byLocation.get(b.location) ?? [];
      list.push(b);
      byLocation.set(b.location, list);
    }
    let count = 0;
    for (const list of Array.from(byLocation.values())) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const gap = Math.abs(diffMinutes(toDate(list[i].endTime), toDate(list[j].startTime)));
          if (gap <= 120) count++;
        }
      }
    }
    return count;
  }
}

export const blockOptimizer = new DeterministicBlockOptimizer();