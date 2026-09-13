import { getStore } from "@/lib/store";
import { ok, fail, parseJson } from "@/lib/server-utils";

export const dynamic = "force-dynamic";

const REQUEST_STATUSES = new Set([
  "Open",
  "In Review",
  "Approved",
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled",
  "Rejected",
]);
const PRIORITIES = new Set(["Critical", "High", "Medium", "Low"]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const store = getStore();
  const existing = store.getRequest(params.id);
  if (!existing) return fail("Maintenance request not found.", 404);

  const body = await parseJson<Record<string, unknown>>(req);
  if (!body) return fail("Invalid JSON body.", 400);

  if ("status" in body && (typeof body.status !== "string" || !REQUEST_STATUSES.has(body.status))) {
    return fail("status must be one of: Open, In Review, Approved, Scheduled, In Progress, Completed, Cancelled, Rejected.", 400);
  }
  if ("priority" in body && (typeof body.priority !== "string" || !PRIORITIES.has(body.priority))) {
    return fail("priority must be Critical, High, Medium or Low.", 400);
  }
  if ("riskScore" in body) {
    const n = Number(body.riskScore);
    if (!Number.isFinite(n) || n < 0 || n > 100) return fail("riskScore must be a number between 0 and 100.", 400);
  }
  if ("estimatedDuration" in body) {
    const n = Number(body.estimatedDuration);
    if (!Number.isFinite(n) || n <= 0 || n > 1440) return fail("estimatedDuration must be a number between 1 and 1440 minutes.", 400);
  }
  if ("issue" in body && typeof body.issue !== "string") return fail("issue must be a string.", 400);
  if ("description" in body && typeof body.description !== "string") return fail("description must be a string.", 400);
  if ("department" in body && typeof body.department !== "string") return fail("department must be a string.", 400);

  const allowed = [
    "status",
    "priority",
    "issue",
    "description",
    "department",
    "riskScore",
    "estimatedDuration",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) return fail("No valid fields to update.", 400);

  const updated = store.updateRequest(params.id, patch);
  return ok({ request: updated });
}