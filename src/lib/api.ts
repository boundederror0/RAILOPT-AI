export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit & { signal?: AbortSignal }): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export const api = {
  login: <T>(postingId: string, password: string, zoneId: string, divisionId: string) =>
    request<T>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ postingId, password, zoneId, divisionId }),
    }),
  me: <T>() => request<T>("/api/auth/me"),
  logout: <T>() => request<T>("/api/auth/logout", { method: "POST", body: JSON.stringify({}) }),
  getDashboard: <T>() => request<T>("/api/dashboard"),
  getRequests: <T>() => request<T>("/api/maintenance-requests"),
  createRequest: <T>(body: unknown) =>
    request<T>("/api/maintenance-requests", { method: "POST", body: JSON.stringify(body) }),
  updateRequest: <T>(id: string, body: unknown) =>
    request<T>(`/api/maintenance-requests/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  getAssets: <T>() => request<T>("/api/assets"),
  getTrains: <T>() => request<T>("/api/trains"),
  getBlocks: <T>() => request<T>("/api/blocks"),
  getTeams: <T>() => request<T>("/api/teams"),
  getIncidents: <T>() => request<T>("/api/incidents"),
  analyzeRisk: <T>(assetId: string) =>
    request<T>("/api/risk-analysis", { method: "POST", body: JSON.stringify({ assetId }) }),
  optimizeBlock: <T>(body: unknown) =>
    request<T>("/api/optimize", { method: "POST", body: JSON.stringify(body) }),
  calculateImpact: <T>(body: unknown) =>
    request<T>("/api/train-impact", { method: "POST", body: JSON.stringify(body) }),
  getSimulationParams: <T>() => request<T>("/api/simulation"),
  saveSimulationParams: <T>(body: unknown) =>
    request<T>("/api/simulation", { method: "POST", body: JSON.stringify(body) }),
  runSimulation: <T>(body: unknown, signal?: AbortSignal) =>
    request<T>("/api/simulation", { method: "POST", body: JSON.stringify(body), signal }),
  emergencyReplan: <T>(body: unknown) =>
    request<T>("/api/emergency-replan", { method: "POST", body: JSON.stringify(body) }),
  getAnalytics: <T>(range: string) => request<T>(`/api/analytics?range=${range}`),
  getApprovals: <T>() => request<T>("/api/approvals"),
  getRequestTracking: <T>() => request<T>("/api/request-tracking"),
  decideApproval: <T>(id: string, body: unknown) =>
    request<T>(`/api/approvals/${id}/decision`, { method: "POST", body: JSON.stringify(body) }),
  getAuditLogs: <T>() => request<T>("/api/audit-logs"),
  getSystemStatus: <T>() => request<T>("/api/system-status"),
  getHistoricalSummary: <T>(train?: string | number) =>
    request<T>(
      train !== undefined && train !== null && String(train).trim() !== ""
        ? `/api/historical/summary?train=${encodeURIComponent(String(train).trim())}`
        : "/api/historical/summary"
    ),
};