import { getStore } from "@/lib/store";
import { ok, fail, parseJson } from "@/lib/server-utils";
import { requireAnyPermission, requirePermission } from "@/lib/auth/server-auth";
import { validateRequestInput } from "@/lib/validation";
import { riskService } from "@/lib/ai";
import type { MaintenanceRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = requireAnyPermission(["maintenance.view", "maintenance.create", "simulation.view"]);
  if ("error" in guard) return guard.error;
  const store = getStore();
  const requests = store.getRequests();
  return ok({ requests });
}

export async function POST(req: Request) {
  const guard = requirePermission("maintenance.create");
  if ("error" in guard) return guard.error;
  const body = await parseJson<Record<string, unknown>>(req);
  if (!body) return fail("Invalid JSON body.", 400);

  const { error, data } = validateRequestInput(body);
  if (error) return fail(error, 400);

  const store = getStore();
  const asset = store.getAsset(data!.assetId!);
  if (!asset) return fail("Selected asset does not exist.", 404);

  const analysis = riskService.analyzeAsset(asset);
  const existing = store.getRequests();
  const dup = existing.find(
    (r) => r.assetId === asset.id && (r.status === "Open" || r.status === "In Review")
  );
  if (dup) {
    return fail(
      `An open maintenance request (${dup.id}) already exists for this asset.`,
      409
    );
  }

  const nextNumber =
    existing.reduce((max, r) => {
      const n = /^MR-2026-(\d{4})$/.exec(r.id);
      return n ? Math.max(max, Number(n[1])) : max;
    }, 0) + 1;
  const request: MaintenanceRequest = {
    id: `MR-2026-${String(nextNumber).padStart(4, "0")}`,
    assetId: asset.id,
    assetName: asset.name,
    assetType: asset.type,
    location: asset.location,
    section: asset.section,
    department: data!.priority === "Critical" || data!.priority === "High" ? "Signalling" : "Track",
    issue: data!.issue as string,
    description: data!.description as string,
    priority: data!.priority as MaintenanceRequest["priority"],
    riskScore: analysis.riskScore,
    requestedDate: new Date().toISOString().slice(0, 10),
    status: "Open",
    estimatedDuration:
      asset.type === "Bridge"
        ? 240
        : asset.type === "Traction Substation"
          ? 180
          : asset.type === "Track Circuit"
            ? 150
            : 90,
    requiredResources: analysis.requiredResources,
    affectedTrains: [],
    historicalFailures: asset.incidents,
    currentCondition: asset.condition,
  };

  const created = store.addRequest(request);
  store.log({
    action: "REQUESTED",
    entity: "Maintenance Request",
    entityId: created.id,
    performedBy: guard.user.name,
    details: `${guard.user.name} created ${created.id} for ${asset.name} at ${asset.location}.`,
  });

  return ok({ request: created, analysis }, 201);
}