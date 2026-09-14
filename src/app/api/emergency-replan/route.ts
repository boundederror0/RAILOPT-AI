import { getStore } from "@/lib/store";
import { ok, fail, parseJson } from "@/lib/server-utils";
import { requirePermission } from "@/lib/auth/server-auth";
import { validateIncidentInput } from "@/lib/validation";
import { emergencyReplanService, incidentTypeFor } from "@/lib/ai";
import type { Incident } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = requirePermission("emergency.replan");
  if ("error" in guard) return guard.error;

  const body = await parseJson<unknown>(req);
  const { error, data } = validateIncidentInput(body);
  if (error) return fail(error, 400);

  const store = getStore();
  const description = String(data!.description);
  const incident: Incident = {
    id: `INC-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    type: typeof data!.type === "string" ? String(data!.type) : incidentTypeFor(description),
    assetId: typeof data!.assetId === "string" ? data!.assetId : null,
    location: String(data!.location ?? "Madurai"),
    section: String(data!.section),
    severity: data!.severity as Incident["severity"],
    detectedAt: new Date().toISOString(),
    status: "Detected",
    affectedTrains: Array.isArray(data!.affectedTrains) ? (data!.affectedTrains as string[]) : [],
    description,
    recommendedActions: [],
  };

  store.addIncident(incident);
  const recommendation = emergencyReplanService.replan(
    incident,
    store.getTrains(),
    store.getRequests()
  );

  const updatedIncident = store.updateIncident(incident.id, {
    recommendedActions: recommendation.alternativePlans,
    recommendedBlock: recommendation.recommendedBlock,
  });

  store.log({
    action: "AI_INCIDENT",
    entity: "Incident",
    entityId: incident.id,
    performedBy: guard.user.name,
    details: `${guard.user.name} initiated AI incident response for ${incident.type} (${incident.severity}) at ${incident.section}.`,
  });

  if (recommendation.recommendedBlock) {
    store.addApproval({
      type: "Emergency Replan",
      refId: incident.id,
      title: `Emergency replan — ${incident.type} at ${incident.section}`,
      description: `Recommended ${recommendation.recommendedBlock.durationMinutes} min block at ${recommendation.recommendedBlock.startTime.slice(11, 16)} with regulation of ${recommendation.affectedTrains.join(", ") || "affected"} train${recommendation.affectedTrains.length === 1 ? "" : "s"}.`,
      benefit: recommendation.recommendedResponse,
      impact: `Estimated disruption ≈ ${recommendation.estimatedDisruption} train-min. Human approval required before applying.`,
      confidence: incident.severity === "Critical" ? 93 : 86,
      createdBy: "RAILOPT AI",
      riskReduction: recommendation.recommendedBlock.riskReduction,
      estimatedDelay: recommendation.estimatedDisruption,
    });
  }

  return ok({ incident: updatedIncident, recommendation }, 201);
}