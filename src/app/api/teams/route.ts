import { getStore } from "@/lib/store";
import { ok } from "@/lib/server-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStore();
  return ok({ teams: store.getTeams() });
}