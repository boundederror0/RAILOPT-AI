import { getStore } from "@/lib/store";
import { ok, fail, parseJson } from "@/lib/server-utils";
import { requirePermission } from "@/lib/auth/server-auth";
import { riskService } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = requirePermission("ai-analysis.run");
  if ("error" in guard) return guard.error;

  const body = await parseJson<{ assetId?: string }>(req);
  if (!body || typeof body.assetId !== "string") {
    return fail("assetId is required.", 400);
  }

  const store = getStore();
  const asset = store.getAsset(body.assetId);
  if (!asset) return fail("Asset not found.", 404);

  const analysis = riskService.analyzeAsset(asset);

  const prediction = {
    id: `AI-RSK-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    assetId: asset.id,
    assetName: asset.name,
    riskScore: analysis.riskScore,
    riskCategory: analysis.riskCategory,
    confidence: analysis.confidence,
    factors: analysis.factors,
    recommendedAction: analysis.recommendedAction,
    createdAt: analysis.createdAt,
    model: analysis.model,
  };

  store.log({
    action: "AI_ANALYSIS",
    entity: "Asset",
    entityId: asset.id,
    performedBy: guard.user.name,
    details: `${guard.user.name} ran AI scoring on ${asset.name}: ${analysis.riskScore} (${analysis.riskCategory}).`,
  });

  return ok({ analysis, prediction });
}