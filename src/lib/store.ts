import {
  APPROVALS,
  ASSETS,
  AUDIT_LOGS,
  INCIDENTS,
  MAINTENANCE_REQUESTS,
  MAINTENANCE_TEAMS,
  TRAINS,
  initialBlocks,
} from "./seed";
import type {
  Approval,
  Asset,
  AuditLog,
  Block,
  BlockPlan,
  Incident,
  MaintenanceRequest,
  MaintenanceTeam,
  SimulationParams,
  TrainSchedule,
} from "./types";

interface OpsConfig {
  maxSimultaneousBlocksPerLocation: number;
  defaultMaxTeams: number;
  trainPriorityWeight: number;
  nightWindowStart: number;
  nightWindowEnd: number;
  maxTrainsPerDelayBand: number;
  simulationEnabled: boolean;
}

export const DEFAULT_SIM_PARAMS: SimulationParams = {
  blockStartOffset: 0,
  blockDuration: 1,
  maintenancePriority: "auto",
  maxTeams: 4,
  trainPriorityWeight: 1,
  simultaneousBlocks: 1,
};

const opsConfig: OpsConfig = {
  maxSimultaneousBlocksPerLocation: 1,
  defaultMaxTeams: 4,
  trainPriorityWeight: 1,
  nightWindowStart: 1,
  nightWindowEnd: 4,
  maxTrainsPerDelayBand: 6,
  simulationEnabled: true,
};

const SCHEDULABLE_STATUSES = ["Open", "In Review", "Approved"];

class Store {
  private assets: Asset[];
  private requests: MaintenanceRequest[];
  private teams: MaintenanceTeam[];
  private trains: TrainSchedule[];
  private blocks: Block[];
  private blockPlans: BlockPlan[];
  private incidents: Incident[];
  private approvals: Approval[];
  private auditLogs: AuditLog[];
  private config: OpsConfig = opsConfig;
  simParams: SimulationParams = { ...DEFAULT_SIM_PARAMS };

  constructor() {
    this.assets = ASSETS.map((a) => ({ ...a }));
    this.requests = MAINTENANCE_REQUESTS.map((r) => ({ ...r, affectedTrains: [...r.affectedTrains] }));
    this.teams = MAINTENANCE_TEAMS.map((t) => ({ ...t }));
    this.trains = TRAINS.map((t) => ({ ...t, stops: t.stops.map((s) => ({ ...s })) }));
    this.blocks = [];
    this.blockPlans = [];
    this.incidents = INCIDENTS.map((i) => ({ ...i, affectedTrains: [...i.affectedTrains], recommendedActions: [...i.recommendedActions] }));
    this.approvals = APPROVALS.map((a) => ({ ...a }));
    this.auditLogs = AUDIT_LOGS.map((l) => ({ ...l }));
    for (const blk of initialBlocks()) {
      this.addBlock(blk);
    }
  }

  // ----- Assets -----
  getAssets(): Asset[] {
    return this.assets;
  }

  getAsset(id: string): Asset | undefined {
    return this.assets.find((a) => a.id === id);
  }

  // ----- Requests -----
  getRequests(): MaintenanceRequest[] {
    return this.requests;
  }

  getRequest(id: string): MaintenanceRequest | undefined {
    return this.requests.find((r) => r.id === id);
  }

  addRequest(request: MaintenanceRequest): MaintenanceRequest {
    this.requests.unshift(request);
    this.log({
      action: "CREATE",
      entity: "Maintenance Request",
      entityId: request.id,
      details: `Created request for ${request.assetName} (${request.priority}).`,
    });
    return request;
  }

  updateRequest(id: string, patch: Partial<MaintenanceRequest>): MaintenanceRequest | undefined {
    const idx = this.requests.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    this.requests[idx] = { ...this.requests[idx], ...patch };
    this.log({
      action: "UPDATE",
      entity: "Maintenance Request",
      entityId: id,
      details: `Updated request ${id}.`,
    });
    return this.requests[idx];
  }

  // ----- Teams -----
  getTeams(): MaintenanceTeam[] {
    return this.teams;
  }

  // ----- Trains -----
  getTrains(): TrainSchedule[] {
    return this.trains;
  }

  // ----- Blocks & Plans -----
  getBlocks(): Block[] {
    return this.blocks;
  }

  addBlock(block: Block): Block {
    this.blocks.push(block);
    if (block.status === "Approved") {
      const relevant = this.requests.find((r) => r.id === block.requestId);
      if (relevant && SCHEDULABLE_STATUSES.includes(relevant.status)) {
        this.updateRequest(relevant.id, { status: "Scheduled" });
      }
    }
    return block;
  }

  getPlans(): BlockPlan[] {
    return this.blockPlans;
  }

  addPlan(plan: BlockPlan): BlockPlan {
    this.blockPlans.unshift(plan);
    return plan;
  }

  clearProposedBlocks(): void {
    this.blocks = this.blocks.filter((b) => b.status !== "Proposed");
  }

  // ----- Incidents -----
  getIncidents(): Incident[] {
    return this.incidents;
  }

  addIncident(incident: Incident): Incident {
    this.incidents.unshift(incident);
    return incident;
  }

  updateIncident(id: string, patch: Partial<Incident>): Incident | undefined {
    const idx = this.incidents.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    this.incidents[idx] = { ...this.incidents[idx], ...patch, affectedTrains: [...(patch.affectedTrains ?? this.incidents[idx].affectedTrains)], recommendedActions: [...(patch.recommendedActions ?? this.incidents[idx].recommendedActions)] };
    return this.incidents[idx];
  }

  // ----- Approvals -----
  getApprovals(): Approval[] {
    return this.approvals;
  }

  addApproval(approval: Omit<Approval, "id" | "createdAt" | "status" | "decidedBy" | "decidedAt" | "confidence"> & { confidence?: number }): Approval {
    const record: Approval = {
      id: `APR-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      createdAt: new Date().toISOString(),
      status: "Pending",
      decidedBy: null,
      decidedAt: null,
      confidence: approval.confidence ?? 85,
      ...approval,
    };
    this.approvals.unshift(record);
    this.log({
      action: "CREATE_RECOMMENDATION",
      entity: approval.type,
      entityId: record.id,
      details: `AI created recommendation: ${approval.title}.`,
    });
    return record;
  }

  decideApproval(id: string, decision: "Approved" | "Rejected" | "Modified", performedBy: string, modifyNote?: string): Approval | undefined {
    const a = this.approvals.find((x) => x.id === id);
    if (!a) return undefined;
    a.status = decision;
    a.decidedBy = performedBy;
    a.decidedAt = new Date().toISOString();
    this.log({
      action: decision.toUpperCase(),
      entity: a.type,
      entityId: a.id,
      details: `${performedBy} ${decision.toLowerCase()} "${a.title}"${modifyNote ? ` — ${modifyNote}` : ""}.`,
    });
    if (a.type === "Block Plan" && decision === "Approved") {
      const plan = this.blockPlans.find((p) => p.id === a.refId);
      if (plan) {
        for (const block of plan.blocks) {
          block.status = "Approved";
          const existing = this.blocks.find((b) => b.id === block.id);
          if (existing) existing.status = "Approved";
          else this.addBlock(block);
          const relevant = this.requests.find((r) => r.id === block.requestId);
          if (relevant && SCHEDULABLE_STATUSES.includes(relevant.status)) {
            this.updateRequest(relevant.id, { status: "Scheduled" });
          }
        }
      }
    }
    if (a.type === "Emergency Replan" && decision === "Approved") {
      const incident = this.incidents.find((i) => i.id === a.refId);
      const rb = incident?.recommendedBlock;
      if (rb) {
        rb.status = "Approved";
        const existing = this.blocks.find((b) => b.id === rb.id);
        if (existing) existing.status = "Approved";
        else this.addBlock(rb);
        const relevant = this.requests.find((r) => r.id === rb.requestId);
        if (relevant && SCHEDULABLE_STATUSES.includes(relevant.status)) {
          this.updateRequest(relevant.id, { status: "Scheduled" });
        }
      }
    }
    return a;
  }

  getApprovalByRef(refId: string): Approval | undefined {
    return this.approvals.find((a) => a.refId === refId);
  }

  // ----- Audit -----
  getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }

  log(entry: Omit<AuditLog, "id" | "timestamp" | "performedBy"> & { performedBy?: string }): AuditLog {
    const record: AuditLog = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      performedBy: entry.performedBy ?? "RAILOPT AI",
      ...entry,
    };
    this.auditLogs.unshift(record);
    return record;
  }

  // ----- Config -----
  getConfig(): OpsConfig {
    return this.config;
  }

  updateConfig(patch: Partial<OpsConfig>): OpsConfig {
    this.config = { ...this.config, ...patch };
    return this.config;
  }

  reset(): void {
    const fresh = new Store();
    this.assets = fresh.assets;
    this.requests = fresh.requests;
    this.teams = fresh.teams;
    this.trains = fresh.trains;
    this.blocks = fresh.blocks;
    this.blockPlans = fresh.blockPlans;
    this.incidents = fresh.incidents;
    this.approvals = fresh.approvals;
    this.auditLogs = fresh.auditLogs;
    this.config = fresh.config;
    this.simParams = fresh.simParams;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __railoptStore: Store | undefined;
}

export function getStore(): Store {
  if (typeof window === "undefined") {
    if (!global.__railoptStore) {
      global.__railoptStore = new Store();
    }
    return global.__railoptStore;
  }
  return new Store();
}

export const OPERATOR_NAME = "S. Rajan";
export const OPERATOR_ROLE = "Divisional Operations Controller";