import { getStore } from "@/lib/store";
import { ok, fail, parseJson } from "@/lib/server-utils";
import { requirePermission } from "@/lib/auth/server-auth";
import { validateOptimizeRequest } from "@/lib/validation";
import { blockOptimizer, type OptimizerParams } from "@/lib/ai";
import { DEFAULT_SIM_PARAMS } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await parseJson<{ requestIds?: string[]; params?: Record<string, unknown>; simulate?: boolean }>(req);

  const isSimulation = body?.simulate === true;
  const guard = requirePermission(isSimulation ? "simulation.run" : "optimizer.run");
  if ("error" in guard) return guard.error;

  const { error, data } = validateOptimizeRequest(body);
  if (error) return fail(error, 400);

  const store = getStore();
  const requests = store.getRequests();
  const teams = store.getTeams();
  const trains = store.getTrains();
  const config = store.getConfig();

  const selected = requests.filter((r) => data!.requestIds.includes(r.id));
  if (selected.length === 0) return fail("None of the selected requests were found.", 404);

  const params: OptimizerParams = {
    blockStartOffset: Number(data!.params?.blockStartOffset ?? store.simParams.blockStartOffset ?? DEFAULT_SIM_PARAMS.blockStartOffset),
    blockDuration: Number(data!.params?.blockDuration ?? store.simParams.blockDuration ?? DEFAULT_SIM_PARAMS.blockDuration),
    maintenancePriority: (data!.params?.maintenancePriority as OptimizerParams["maintenancePriority"]) ?? DEFAULT_SIM_PARAMS.maintenancePriority,
    maxTeams: Number(data!.params?.maxTeams ?? store.simParams.maxTeams ?? DEFAULT_SIM_PARAMS.maxTeams),
    trainPriorityWeight: Number(data!.params?.trainPriorityWeight ?? config.trainPriorityWeight),
    simultaneousBlocks: Number(data!.params?.simultaneousBlocks ?? store.simParams.simultaneousBlocks ?? DEFAULT_SIM_PARAMS.simultaneousBlocks),
    existingBlockIds: store.getBlocks().map((b) => b.id),
    existingBlocks: store.getBlocks().filter((b) => b.status === "Approved" || b.status === "Active"),
  };

  const result = blockOptimizer.optimize(selected, teams, trains, params);

  if (isSimulation) {
    return ok({ plan: result.plan, trace: result.trace, skippedCount: result.skippedCount, simulated: true });
  }

  store.clearProposedBlocks();

  const saved = store.addPlan({ ...result.plan, blocks: result.plan.blocks.map((b) => ({ ...b })) });

  for (const block of result.plan.blocks) {
    store.addBlock(block);
  }

  store.log({
    action: "AI_OPTIMIZE",
    entity: "Block Plan",
    entityId: saved.id,
    performedBy: guard.user.name,
    details: `${guard.user.name} triggered optimizer — produced ${saved.totalRequestsScheduled} blocks, ${saved.estimatedDelay} min expected delay, score ${saved.optimizationScore}.`,
  });

  if (saved.blocks.length > 0) {
    const stalePlanApprovals = store
      .getApprovals()
      .filter((a) => a.status === "Pending" && a.type === "Block Plan");
    for (const stale of stalePlanApprovals) {
      store.decideApproval(
        stale.id,
        "Rejected",
        "RAILOPT AI",
        "Superseded by a newer optimized block plan."
      );
    }

    store.addApproval({
      type: "Block Plan",
      refId: saved.id,
      title: `Optimized block plan — ${saved.totalRequestsScheduled} maintenance block${saved.totalRequestsScheduled === 1 ? "" : "s"} scheduled`,
      description: `AI generated a block plan covering ${saved.totalRequestsScheduled} request${saved.totalRequestsScheduled === 1 ? "" : "s"} with ${saved.estimatedDelay} min of expected train delay.`,
      benefit: `Reduces total risk by ~${saved.riskReduction} points and cuts expected disruption by ~${saved.delayReduction} train-minutes.`,
      impact: `Affects ${saved.trainsAffected} train${saved.trainsAffected === 1 ? "" : "s"} across ${saved.totalBlockDuration} minutes of possessions.`,
      confidence: Math.min(97, 70 + saved.optimizationScore / 4.2),
      createdBy: "RAILOPT AI",
      riskReduction: saved.riskReduction,
      estimatedDelay: saved.estimatedDelay,
    });
  }

  return ok({ plan: saved, trace: result.trace, skippedCount: result.skippedCount });
}