import type { MaintenanceRequest } from "@/lib/types";

export interface WindowReasoning {
  headline: string;
  points: string[];
}

const URGENCY: Record<MaintenanceRequest["priority"], string> = {
  Critical: "clear within 24h — book the next 0600–1000 low-traffic window",
  High: "schedule within 48h — prefer a 0600–1000 low-traffic window",
  Medium: "clear this week — use an off-peak window",
  Low: "ride the normal maintenance cycle",
};

export function windowReasoningFor(
  r: Pick<
    MaintenanceRequest,
    "assetType" | "priority" | "department" | "estimatedDuration" | "riskScore" | "affectedTrains" | "requiredResources"
  >
): WindowReasoning {
  const score = r.riskScore ?? 0;
  const riskLine =
    score >= 80
      ? "drive this block before the weekend corridor cycle"
      : score >= 60
        ? "clear it before the next scheduled corridor load"
        : "precautionary — monitor, no urgent slot needed";

  const points: string[] = [
    `Block: ${r.estimatedDuration} min — standard for a ${r.assetType}.`,
    `Risk ${score}/100 — ${riskLine}.`,
    r.affectedTrains.length > 0
      ? `Coordinate with ${r.affectedTrains.length} affected train(s) (${r.affectedTrains.slice(0, 3).join(", ")}${r.affectedTrains.length > 3 ? "…" : ""}) — avoid their morning departures.`
      : "No specific train conflict flagged yet; precise impact is computed after a slot is selected.",
    `Owner: ${r.department} team · ${r.requiredResources.join(" · ")}.`,
  ];

  return {
    headline: `Window: next low-traffic slot · ${URGENCY[r.priority]}`,
    points,
  };
}