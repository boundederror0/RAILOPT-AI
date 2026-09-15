import { getStore } from "@/lib/store";
import { ok } from "@/lib/server-utils";
import { requirePermission } from "@/lib/auth/server-auth";
import {
  canAccessRequestDepartment,
  isDepartmentScoped,
} from "@/lib/rbac";

export const dynamic = "force-dynamic";

/**
 * §16 Request Tracking — read-only, live status surface for maintenance
 * requests across the user's operational scope (zone for zonal postings,
 * zone/division for divisional postings, own department only for
 * department-scoped divisional technical engineers).
 *
 * Gate: requests.track (granted to every zonal + divisional role profile).
 */
export async function GET() {
  const guard = requirePermission("requests.track");
  if ("error" in guard) return guard.error;
  const store = getStore();
  const requests = store.getRequests();

  const scoped = isDepartmentScoped(guard.user)
    ? requests.filter((r) => canAccessRequestDepartment(guard.user, r.department))
    : requests;

  const tracking = scoped.map((r) => ({
    id: r.id,
    assetName: r.assetName,
    assetType: r.assetType,
    department: r.department,
    location: r.location,
    section: r.section,
    priority: r.priority,
    riskScore: r.riskScore,
    status: r.status,
    requestedDate: r.requestedDate,
    estimatedDuration: r.estimatedDuration,
    requiredResources: r.requiredResources,
    currentCondition: r.currentCondition,
    affectedTrains: r.affectedTrains,
    historicalFailures: r.historicalFailures,
  }));

  return ok({ requests: tracking });
}
