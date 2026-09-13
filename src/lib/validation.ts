import type { Asset, MaintenanceRequest, Priority } from "@/lib/types";

export function isPriority(v: unknown): v is Priority {
  return v === "Critical" || v === "High" || v === "Medium" || v === "Low";
}

export function validateRequestInput(body: unknown): { error?: string; data?: Partial<MaintenanceRequest> } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body." };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.issue !== "string" || b.issue.trim().length < 4) {
    return { error: "Issue description is required (min 4 characters)." };
  }
  if (typeof b.description !== "string" || b.description.trim().length < 8) {
    return { error: "Detailed description is required (min 8 characters)." };
  }
  if (!b.assetId) {
    return { error: "Asset selection is required." };
  }
  if (!isPriority(b.priority)) {
    return { error: "Priority must be one of Critical, High, Medium, Low." };
  }

  return {
    data: {
      assetId: String(b.assetId),
      issue: String(b.issue).trim(),
      description: String(b.description).trim(),
      priority: b.priority,
    },
  };
}

export function validateAssetId(asset: Asset | undefined): string | null {
  if (!asset) return "Selected asset does not exist.";
  return null;
}

export function validateOptimizeRequest(body: unknown): { error?: string; data?: { requestIds: string[]; params?: Record<string, unknown> } } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body." };
  }
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.requestIds) || b.requestIds.length === 0) {
    return { error: "At least one maintenance request must be selected." };
  }
  if (b.requestIds.some((id) => typeof id !== "string")) {
    return { error: "requestIds must be string values." };
  }
  return { data: { requestIds: b.requestIds as string[], params: (b.params as Record<string, unknown>) ?? {} } };
}

export function validateIncidentInput(body: unknown): { error?: string; data?: Record<string, unknown> } {
  if (!body || typeof body !== "object") return { error: "Invalid request body." };
  const b = body as Record<string, unknown>;
  if (typeof b.section !== "string" || b.section.trim() === "") {
    return { error: "Incident section is required." };
  }
  if (typeof b.description !== "string" || b.description.trim().length < 8) {
    return { error: "Incident description is required (min 8 characters)." };
  }
  const severity = String(b.severity ?? "Moderate");
  if (!["Low", "Moderate", "High", "Critical"].includes(severity)) {
    return { error: "Severity must be Low, Moderate, High or Critical." };
  }
  return { data: { ...b, severity } };
}