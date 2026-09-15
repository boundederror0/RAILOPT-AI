import { getStore } from "@/lib/store";
import { ok, fail, parseJson } from "@/lib/server-utils";
import { requirePermission } from "@/lib/auth/server-auth";
import { canAccessRequestDepartment, isDepartmentScoped } from "@/lib/rbac";

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

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Open: ["In Review", "Cancelled", "Approved"],
  "In Review": ["Approved", "Open", "In Progress", "Cancelled", "Rejected"],
  Approved: ["Scheduled", "In Progress", "Open", "Cancelled"],
  Scheduled: ["In Progress", "Approved", "Cancelled"],
  "In Progress": ["Completed", "Open", "Cancelled"],
  Completed: [],
  Cancelled: [],
  Rejected: [],
};

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = requirePermission("maintenance.edit");
  if ("error" in guard) return guard.error;

  const store = getStore();
  const existing = store.getRequest(params.id);
  if (!existing) return fail("Maintenance request not found.", 404);

  // Department-scoped postings may only edit requests belonging to their
  // own department. Isolation is enforced server-side (not just the UI).
  if (isDepartmentScoped(guard.user) && !canAccessRequestDepartment(guard.user, existing.department)) {
    return fail("You can only manage maintenance requests for your department.", 403);
  }

  const body = await parseJson<Record<string, unknown>>(req);
  if (!body) return fail("Invalid JSON body.", 400);

  if ("status" in body && (typeof body.status !== "string" || !REQUEST_STATUSES.has(body.status))) {
    return fail("status must be one of: Open, In Review, Approved, Scheduled, In Progress, Completed, Cancelled, Rejected.", 400);
  }
  if ("status" in body && typeof body.status === "string" && body.status !== existing.status) {
    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(body.status)) {
      return fail(
        `Invalid status transition from '${existing.status}' to '${body.status}'. Allowed transitions: ${allowed.join(", ") || "none"}.`,
        409
      );
    }
  }
  if ("priority" in body && (typeof body.priority !== "string" || !PRIORITIES.has(body.priority))) {
    return fail("priority must be Critical, High, Medium or Low.", 400);
  }
  if ("riskScore" in body) {
    if (typeof body.riskScore !== "number" || !Number.isFinite(body.riskScore) || body.riskScore < 0 || body.riskScore > 100) {
      return fail("riskScore must be a number between 0 and 100.", 400);
    }
  }
  if ("estimatedDuration" in body) {
    if (typeof body.estimatedDuration !== "number" || !Number.isFinite(body.estimatedDuration) || body.estimatedDuration <= 0 || body.estimatedDuration > 1440) {
      return fail("estimatedDuration must be a number between 1 and 1440 minutes.", 400);
    }
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
  store.log({
    action: "REQUEST_UPDATE",
    entity: "Maintenance Request",
    entityId: updated!.id,
    performedBy: guard.user.name,
    details: `${guard.user.name} updated ${updated!.id} (${Object.keys(patch).join(", ")}).`,
  });
  return ok({ request: updated });
}