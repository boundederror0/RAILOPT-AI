import type { Block, Incident, MaintenanceRequest, TrainSchedule } from "../types";
import { addMinutes, formatSlot, toDate } from "../time";
import { SECTION_STATIONS } from "./train-impact";

export interface EmergencyRecommendation {
  incidentId: string;
  affectedSection: string;
  severity: string;
  affectedTrains: string[];
  estimatedDisruption: number;
  recommendedResponse: string;
  recommendedBlock: Block | null;
  alternativePlans: string[];
  description: string;
  revisionReason: string;
}

export class EmergencyReplanService {
  replan(incident: Incident, trains: TrainSchedule[], requests: MaintenanceRequest[]): EmergencyRecommendation {
    const corridor = SECTION_STATIONS[incident.section] ?? [incident.location];
    const now = new Date();

    const impacted = trains.filter((t) => {
      const tStart = toDate(t.departureTime);
      const tEnd = t.arrivalTime.length > 0 && !t.arrivalTime.includes("T-1") ? toDate(t.arrivalTime) : addMinutes(tStart, tStart.getDate() === now.getDate() ? 480 : 720);
      const isRunning = t.currentStatus === "Running" || t.currentStatus === "Held";
      return isRunning && tStart <= addMinutes(now, 420) && tEnd >= now;
    });

    const affectedTrains = impacted.slice(0, 5).map((t) => t.number);

    const speedFactor = incident.severity === "Critical" ? 38 : incident.severity === "High" ? 24 : 12;
    const estimatedDisruption = 15 + affectedTrains.length * speedFactor;

    const relatedRequest = requests.find((r) => r.section === incident.section && (r.status === "Open" || r.status === "In Review"));

    const start = addMinutes(now, 30);
    const duration = incident.severity === "Critical" ? 75 : incident.severity === "High" ? 60 : 45;
    const end = addMinutes(start, duration);

    const recommendedBlock: Block = {
      id: `BEM-${Date.now() % 100000}`,
      requestId: relatedRequest?.id ?? `EM-${incident.id}`,
      location: incident.location,
      section: incident.section,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationMinutes: duration,
      teamId: "TM-02",
      teamName: "Madurai S&T Team B",
      affectedTrainIds: affectedTrains,
      expectedDelay: estimatedDisruption,
      priority: incident.severity === "Critical" ? "Critical" : "High",
      riskReduction: Math.round(relatedRequest?.riskScore ? relatedRequest.riskScore * 0.6 : 45),
      status: "Proposed",
      riskScore: relatedRequest?.riskScore ?? 75,
    };

    const alternativePlans =
      incident.severity === "Critical"
        ? [
            `Plan A — Immediate block ${formatSlot(start)}–${formatSlot(end)} on ${incident.section}; divert express trains via Virudhunagar chord.`,
            `Plan B — Hold trains ${affectedTrains.slice(0, 2).join(", ")} at ${corridor[0] ?? incident.location}; shift block 2 hours later.`,
            "Plan C — Deploy double-gang and compress block to 45 minutes during night window.",
          ]
        : [
            `Plan A — Short block ${formatSlot(start)}–${formatSlot(end)} with line speed restriction 30 km/h.`,
            "Plan B — Combine with next scheduled maintenance window to avoid repeat possessions.",
          ];

    return {
      incidentId: incident.id,
      affectedSection: incident.section,
      severity: incident.severity,
      affectedTrains,
      estimatedDisruption,
      recommendedResponse:
        "Isolate the failed equipment, protect the block section, deploy a maintenance gang, and run a short emergency possession with train regulation.",
      recommendedBlock,
      alternativePlans,
      description: incident.description,
      revisionReason: `Replan computed from severity ${incident.severity} and ${affectedTrains.length} live trains near ${incident.section}.`,
    };
  }
}

export const emergencyReplanService = new EmergencyReplanService();

export function incidentTypeFor(description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes("track circuit")) return "Track Circuit Failure";
  if (lower.includes("point")) return "Point Machine Failure";
  if (lower.includes("signal")) return "Signal Failure";
  if (lower.includes("bridge")) return "Bridge / Structural Fault";
  if (lower.includes("level crossing")) return "Level Crossing Fault";
  if (lower.includes("overhead")) return "OHE / Traction Fault";
  return "Operational Incident";
}