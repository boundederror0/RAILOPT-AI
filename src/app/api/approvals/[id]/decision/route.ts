import { getStore } from "@/lib/store";
import { ok, fail, parseJson } from "@/lib/server-utils";
import { requirePermission } from "@/lib/auth/server-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = requirePermission("approvals.approve");
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

  // A user may never approve a recommendation they created themselves.
  if (approval.createdByUserId && approval.createdByUserId === guard.user.id) {
    return fail("You cannot approve a recommendation you created.", 403);
  }

  const operator = guard.user.name;
  const updated = store.decideApproval(params.id, decision, operator, body.note);

  return ok({ approval: updated });
}