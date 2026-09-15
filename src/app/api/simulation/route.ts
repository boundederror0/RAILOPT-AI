import { getStore, DEFAULT_SIM_PARAMS } from "@/lib/store";
import { ok, fail, parseJson } from "@/lib/server-utils";
import { requireAnyPermission, requirePermission } from "@/lib/auth/server-auth";
import { evaluateSimulation, type SimulationScenario } from "@/lib/ai/simulation";
import { canAccessRequestDepartment, isDepartmentScoped } from "@/lib/rbac";
import type { SimulationParams } from "@/lib/types";

export const dynamic = "force-dynamic";

const SCENARIOS: SimulationScenario[] = ["accept", "move", "defer", "reject"];

export async function GET() {
  const guard = requireAnyPermission(["simulation.view", "settings.view"]);
  if ("error" in guard) return guard.error;
  const store = getStore();
  return ok({ params: store.simParams, defaults: DEFAULT_SIM_PARAMS, config: store.getConfig() });
}

interface SimulationBody {
  requestId?: string;
  blockId?: string;
  scenario?: string;
  alternativeStartTime?: string;
  durationMinutes?: number;
}

export async function POST(req: Request) {
  const body = await parseJson<SimulationBody & Partial<SimulationParams>>(req);
  if (!body) return fail("Invalid JSON body.", 400);

  if (body.scenario || body.requestId || body.blockId) {
    return runSimulation(req, body);
  }
  return saveParams(req, body);
}

async function runSimulation(req: Request, body: SimulationBody) {
  const guard = requirePermission("simulation.run");
  if ("error" in guard) return guard.error;

  const scenario = body.scenario as SimulationScenario | undefined;
  if (!scenario || !SCENARIOS.includes(scenario)) {
    return fail("scenario must be one of accept, move, defer or reject.", 400);
  }
  const hasRequest = typeof body.requestId === "string" && body.requestId.trim() !== "";
  const hasBlock = typeof body.blockId === "string" && body.blockId.trim() !== "";
  if (hasRequest === hasBlock) {
    return fail("Provide exactly one of requestId or blockId.", 400);
  }

  const store = getStore();

  let anchorBlock = null;
  if (hasBlock) {
    anchorBlock = store.getBlocks().find((b) => b.id === body.blockId);
    if (!anchorBlock) return fail("Selected block does not exist.", 404);
  }

  const requestId = hasRequest ? body.requestId! : anchorBlock!.requestId;
  const request = store.getRequest(requestId);
  if (!request) return fail("Maintenance request not found.", 404);

  if (isDepartmentScoped(guard.user) && !canAccessRequestDepartment(guard.user, request.department)) {
    return fail("You are not authorized to simulate a request in this department.", 403);
  }

  if (scenario === "move") {
    if (typeof body.alternativeStartTime !== "string" || Number.isNaN(new Date(body.alternativeStartTime).getTime())) {
      return fail("alternativeStartTime is required and must be a valid date for the move scenario.", 400);
    }
  }
  if (body.durationMinutes !== undefined) {
    const n = Number(body.durationMinutes);
    if (!Number.isFinite(n) || n < 30 || n > 360) {
      return fail("durationMinutes must be between 30 and 360.", 400);
    }
  }

  try {
    const result = evaluateSimulation({
      request,
      scenario,
      trains: store.getTrains(),
      existingBlocks: store.getBlocks(),
      anchorBlock: anchorBlock ?? undefined,
      alternativeStartTime: scenario === "move" ? body.alternativeStartTime : undefined,
      durationMinutes: body.durationMinutes,
      blockStartOffset: store.simParams.blockStartOffset,
    });
    return ok({ result });
  } catch {
    return fail("Simulation could not be completed. Please check the selected block and try again.", 500);
  }
}

async function saveParams(req: Request, body: Partial<SimulationParams>) {
  const guard = requirePermission("settings.view");
  if ("error" in guard) return guard.error;

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