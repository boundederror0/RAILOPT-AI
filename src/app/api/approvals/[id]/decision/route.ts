import { getStore } from "@/lib/store";
import { ok, fail, parseJson } from "@/lib/server-utils";
import { requirePermission } from "@/lib/auth/server-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = requirePermission("approval.decide");
  if ("error" in guard) return guard.error;

  const body = await parseJson<{ decision?: string; note?: string }>(req);
  if (!body) return fail("Invalid JSON body.", 400);

  const decision = body.decision;
  if (decision !== "Approved" && decision !== "Rejected" && decision !== "Modified") {
    return fail("decision must be Approved, Rejected or Modified.", 400);
  }
  if ((decision === "Rejected" || decision === "Modified") && !body.note?.trim()) {
    return fail("A note explaining the decision is required when rejecting or modifying a recommendation.", 400);
  }

  const store = getStore();
  const approval = store.getApprovals().find((a) => a.id === params.id);
  if (!approval) return fail("Approval not found.", 404);
  if (approval.status !== "Pending") {
    return fail(`This recommendation has already been ${approval.status.toLowerCase()}.`, 409);
  }

  const operator = guard.user.name;
  const updated = store.decideApproval(params.id, decision, operator, body.note);

  return ok({ approval: updated });
}