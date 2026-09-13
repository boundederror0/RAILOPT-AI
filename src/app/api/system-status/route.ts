import { getStore } from "@/lib/store";
import { ok } from "@/lib/server-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStore();
  const incidents = store.getIncidents();
  const pending = store.getApprovals().filter((a) => a.status === "Pending").length;
  const activeIncidents = incidents.filter((i) => i.status !== "Resolved").length;

  const healthy = pending < 10 && activeIncidents < 6;
  return ok({
    healthy,
    label: healthy ? "All systems nominal" : "Attention required",
    pendingRecommendations: pending,
    activeIncidents,
    services: [
      { name: "Risk Scoring Engine", status: "Healthy", uptime: "99.98%" },
      { name: "Block Optimizer", status: "Healthy", uptime: "99.95%" },
      { name: "Train Impact Model", status: "Healthy", uptime: "99.91%" },
      { name: "Emergency Replanner", status: "Healthy", uptime: "99.88%" },
      { name: "Simulation Engine", status: "Healthy", uptime: "99.93%" },
      { name: "Data Feed (simulated)", status: "DEMO", uptime: "N/A" },
    ],
  });
}