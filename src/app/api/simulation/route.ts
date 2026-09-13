import { getStore, DEFAULT_SIM_PARAMS } from "@/lib/store";
import { ok, fail, parseJson } from "@/lib/server-utils";
import type { SimulationParams } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStore();
  return ok({ params: store.simParams, defaults: DEFAULT_SIM_PARAMS, config: store.getConfig() });
}

export async function POST(req: Request) {
  const body = await parseJson<Partial<SimulationParams>>(req);
  if (!body) return fail("Invalid JSON body.", 400);

  const numeric = (v: unknown, min: number, max: number, def: number) => {
    const n = Number(v);
    if (Number.isNaN(n) || n < min || n > max) return def;
    return n;
  };

  const params: SimulationParams = {
    blockStartOffset: numeric(body.blockStartOffset, -4, 8, DEFAULT_SIM_PARAMS.blockStartOffset),
    blockDuration: numeric(body.blockDuration, 0.5, 2.5, DEFAULT_SIM_PARAMS.blockDuration),
    maintenancePriority:
      body.maintenancePriority === "auto" ||
      ["Critical", "High", "Medium", "Low"].includes(body.maintenancePriority ?? "")
        ? (body.maintenancePriority as SimulationParams["maintenancePriority"])
        : DEFAULT_SIM_PARAMS.maintenancePriority,
    maxTeams: Math.round(numeric(body.maxTeams, 1, 8, DEFAULT_SIM_PARAMS.maxTeams)),
    trainPriorityWeight: numeric(body.trainPriorityWeight, 0.5, 2, DEFAULT_SIM_PARAMS.trainPriorityWeight),
    simultaneousBlocks: Math.round(numeric(body.simultaneousBlocks, 1, 4, DEFAULT_SIM_PARAMS.simultaneousBlocks)),
  };

  const store = getStore();
  store.simParams = params;
  return ok({ params });
}