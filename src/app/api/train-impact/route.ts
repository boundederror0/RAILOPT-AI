import { getStore } from "@/lib/store";
import { ok, fail, parseJson } from "@/lib/server-utils";
import { requirePermission } from "@/lib/auth/server-auth";
import { analyzeBlockImpact } from "@/lib/ai";
import type { Block } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = requirePermission("train_impact.view");
  if ("error" in guard) return guard.error;

  const body = await parseJson<{ block?: Partial<Block> }>(req);
  if (!body?.block) return fail("A block definition is required.", 400);

  const { startTime, endTime, durationMinutes } = body.block;
  if (!startTime || !endTime) return fail("startTime and endTime are required on the block.", 400);

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime())) return fail("startTime is not a valid date.", 400);
  if (Number.isNaN(end.getTime())) return fail("endTime is not a valid date.", 400);
  const derivedDuration = Math.round((end.getTime() - start.getTime()) / 60000);
  if (derivedDuration <= 0) return fail("endTime must be after startTime.", 400);
  if (durationMinutes !== undefined) {
    const requested = Number(durationMinutes);
    if (!Number.isFinite(requested) || requested <= 0) {
      return fail("durationMinutes must be a positive number of minutes.", 400);
    }
  }

  const store = getStore();
  const trains = store.getTrains();

  const block: Block = {
    id: body.block.id ?? `BLK-X-${Date.now()}`,
    requestId: body.block.requestId ?? body.block.id ?? "manual",
    location: body.block.location ?? "Unknown",
    section: body.block.section ?? "Madurai–Melur",
    startTime,
    endTime,
    durationMinutes: durationMinutes ?? derivedDuration,
    teamId: body.block.teamId ?? "-",
    teamName: body.block.teamName ?? "Manual",
    affectedTrainIds: body.block.affectedTrainIds ?? [],
    expectedDelay: 0,
    priority: body.block.priority ?? "Medium",
    riskReduction: body.block.riskReduction ?? 0,
    status: "Proposed",
    riskScore: body.block.riskScore ?? 50,
  };

  const analysis = analyzeBlockImpact(block, trains);

  return ok({
    block,
    impact: analysis,
    summary: {
      trainsAffected: analysis.impacts.length,
      totalDelay: analysis.totalDelay,
      maxDelay: analysis.maxDelay,
      severity: analysis.severity,
    },
  });
}