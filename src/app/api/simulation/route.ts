import { getStore, DEFAULT_SIM_PARAMS } from "@/lib/store";
import { ok, fail, parseJson } from "@/lib/server-utils";
import { requireAnyPermission, requirePermission } from "@/lib/auth/server-auth";
import type { SimulationParams } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = requireAnyPermission(["simulation.view", "profile.view"]);
  if ("error" in guard) return guard.error;
  const store = getStore();
  return ok({ params: store.simParams, defaults: DEFAULT_SIM_PARAMS, config: store.getConfig() });
}

export async function POST(req: Request) {
  const guard = requirePermission("profile.edit");
  if ("error" in guard) return guard.error;
  const body = await parseJson<Partial<SimulationParams>>(req);
  if (!body) return fail("Invalid JSON body.", 400);

  const numeric = (v: unknown, min: number, max: number): number | null => {
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    if (v < min || v > max) return null;
    return v;
  };

  const blockStartOffset = numeric(body.blockStartOffset, -4, 8);
  const blockDuration = numeric(body.blockDuration, 0.5, 2.5);
  const maxTeamsRaw = numeric(body.maxTeams, 1, 8);
  const trainPriorityWeight = numeric(body.trainPriorityWeight, 0.5, 2);
  const simultaneousBlocks = numeric(body.simultaneousBlocks, 1, 4);
  if (
    blockStartOffset === null ||
    blockDuration === null ||
    maxTeamsRaw === null ||
    trainPriorityWeight === null ||
    simultaneousBlocks === null
  ) {
    return fail(
      "Each simulation parameter must be a number within its supported range (blockStartOffset -4..8, blockDuration 0.5..2.5, maxTeams 1..8, trainPriorityWeight 0.5..2, simultaneousBlocks 1..4).",
      422
    );
  }
  if (
    body.maintenancePriority !== undefined &&
    body.maintenancePriority !== "auto" &&
    !["Critical", "High", "Medium", "Low"].includes(body.maintenancePriority)
  ) {
    return fail("maintenancePriority must be auto, Critical, High, Medium or Low.", 422);
  }

  const params: SimulationParams = {
    blockStartOffset,
    blockDuration: blockDuration,
    maintenancePriority:
      body.maintenancePriority === undefined ? DEFAULT_SIM_PARAMS.maintenancePriority : (body.maintenancePriority as SimulationParams["maintenancePriority"]),
    maxTeams: Math.round(maxTeamsRaw),
    trainPriorityWeight,
    simultaneousBlocks: Math.round(simultaneousBlocks),
  };

  const store = getStore();
  store.simParams = params;
  store.log({
    action: "SIM_PARAMS_UPDATED",
    entity: "Simulation",
    entityId: "global",
    performedBy: guard.user.name,
    details: `${guard.user.name} updated global simulation parameters.`,
  });
  return ok({ params });
}