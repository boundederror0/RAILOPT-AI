import { ok, fail, parseJson } from "@/lib/server-utils";
import { setSessionCookie } from "@/lib/auth/server-auth";
import { DEMO_PASSWORD } from "@/lib/auth/auth-config";
import { getPosting, postingToUser } from "@/lib/rbac";
import {
  getZone,
  getDivision,
  ZONAL_AUTHORITY_DIVISION_ID,
  isScopeProvisioned,
  zoneDisplayName,
  divisionDisplayName,
} from "@/lib/rbac/organizational-data";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await parseJson<{ postingId?: unknown; password?: unknown; zoneId?: unknown; divisionId?: unknown }>(req);
  if (!body || typeof body.postingId !== "string" || body.postingId.trim() === "") {
    return fail("postingId is required.", 400);
  }
  if (typeof body.password !== "string" || body.password === "") {
    return fail("password is required.", 400);
  }
  if (typeof body.zoneId !== "string" || body.zoneId.trim() === "") {
    return fail("zoneId is required.", 400);
  }
  if (typeof body.divisionId !== "string" || body.divisionId.trim() === "") {
    return fail("divisionId is required.", 400);
  }

  const posting = getPosting(body.postingId);
  // Single generic error to avoid leaking which identifier (if any) was wrong.
  if (!posting || body.password !== DEMO_PASSWORD) {
    return fail("Invalid posting or password.", 401);
  }

  const zone = getZone(body.zoneId);
  if (!zone || !zone.available) {
    return fail("Invalid or unsupported zone.", 403);
  }

  const division = getDivision(body.zoneId, body.divisionId);
  if (!division) {
    return fail("Invalid division for the selected zone.", 403);
  }

  const isZonalPosting = posting.organizationalLevel === "ZONAL";
  const selectedZonalAuthority = body.divisionId === ZONAL_AUTHORITY_DIVISION_ID;

  // Zone compatibility — the posting's zone is stored as a display name.
  if (posting.zone !== zoneDisplayName(body.zoneId)) {
    return fail("Posting zone does not match the selected zone.", 403);
  }

  if (isZonalPosting) {
    // Zonal authorities act on the whole zone, never on a single division.
    if (!selectedZonalAuthority) {
      return fail("Zonal postings require zonal authority scope.", 403);
    }
  } else {
    // Divisional postings require their exact division.
    if (selectedZonalAuthority) {
      return fail("Divisional postings require a specific division.", 403);
    }
    if (posting.division !== divisionDisplayName(body.zoneId, body.divisionId)) {
      return fail("Posting division does not match the selected division.", 403);
    }
  }

  if (!isScopeProvisioned(body.zoneId, body.divisionId)) {
    return fail("This zone/division combination is not yet provisioned.", 403);
  }

  const user = postingToUser(posting);
  const response = ok({ user });
  return setSessionCookie(response, posting.id);
}