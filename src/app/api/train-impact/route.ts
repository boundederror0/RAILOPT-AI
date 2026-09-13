import { getStore } from "@/lib/store";
import { ok, fail, parseJson } from "@/lib/server-utils";
import { analyzeBlockImpact } from "@/lib/ai";
import type { Block } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await parseJson<{ block?: Partial<Block> }>(req);
  if (!body?.block) return fail("A block definition is required.", 400);

  const { startTime, endTime, durationMinutes } = body.block;
  if (!startTime || !endTime) return fail("startTime and endTime are required on the block.", 400);

  const store = getStore();
  const trains = store.getTrains();

  const block: Block = {
    id: body.block.id ?? `BLK-X-${Date.now()}`,
    requestId: body.block.requestId ?? body.block.id ?? "manual",
    location: body.block.location ?? "Unknown",
    section: body.block.section ?? "Madurai–Melur",
    startTime,
    endTime,
    durationMinutes: durationMinutes ?? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
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