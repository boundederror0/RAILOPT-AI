export type AssetType =
  | "Track Circuit"
  | "Signal"
  | "Point Machine"
  | "Bridge"
  | "Traction Substation"
  | "OHE Mast"
  | "Level Crossing"
  | "Station Building"
  | "Platform"
  | "Telecom Tower";

export type AssetCondition = "Excellent" | "Good" | "Fair" | "Poor" | "Critical";

export type Priority = "Critical" | "High" | "Medium" | "Low";

export type RequestStatus =
  | "Open"
  | "In Review"
  | "Approved"
  | "Scheduled"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "Rejected";

export type TrainStatus =
  | "Running"
  | "Delayed"
  | "At Station"
  | "Departed"
  | "Arrived"
  | "Cancelled"
  | "Held";

export type IncidentSeverity = "Low" | "Moderate" | "High" | "Critical";

export type ApprovalStatus = "Pending" | "Approved" | "Rejected" | "Modified";

export type BlockStatus = "Proposed" | "Approved" | "Active" | "Completed" | "Cancelled";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  location: string;
  section: string;
  zone: string;
  ageYears: number;
  lastMaintenanceDate: string;
  condition: AssetCondition;
  failureFrequency: number;
  incidents: number;
  usageIntensity: number;
  maintenanceBacklog: number;
  utilization: number;
  status: "Operational" | "Under Maintenance" | "Degraded" | "Out of Service";
}

export interface MaintenanceRequest {
  id: string;
  assetId: string;
  assetName: string;
  assetType: AssetType;
  location: string;
  section: string;
  department: string;
  issue: string;
  description: string;
  priority: Priority;
  riskScore: number;
  requestedDate: string;
  status: RequestStatus;
  estimatedDuration: number;
  requiredResources: string[];
  affectedTrains: string[];
  historicalFailures: number;
  currentCondition: string;
}

export interface MaintenanceTeam {
  id: string;
  name: string;
  specialization: string;
  location: string;
  size: number;
  currentLoad: number;
  maxCapacity: number;
  available: boolean;
}

export interface TrainSchedule {
  id: string;
  number: string;
  name: string;
  route: string;
  type: "Express" | "Superfast" | "Passenger" | "Freight" | "EMU" | "MEMU";
  priority: Priority;
  departureTime: string;
  arrivalTime: string;
  currentStatus: TrainStatus;
  delay: number;
  stops: TrainStop[];
}

export interface TrainStop {
  station: string;
  arrivalTime: string;
  departureTime: string;
  platform: number;
  distance: number;
}

export interface Block {
  id: string;
  requestId: string;
  location: string;
  section: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  teamId: string;
  teamName: string;
  affectedTrainIds: string[];
  expectedDelay: number;
  priority: Priority;
  riskReduction: number;
  status: BlockStatus;
  riskScore: number;
}

export interface BlockPlan {
  id: string;
  blocks: Block[];
  totalRequestsScheduled: number;
  totalBlockDuration: number;
  trainsAffected: number;
  estimatedDelay: number;
  delayReduction: number;
  assetAvailabilityImprovement: number;
  riskReduction: number;
  optimizationScore: number;
  explanationFactors: string[];
  createdAt: string;
}

export interface Incident {
  id: string;
  type: string;
  assetId: string | null;
  location: string;
  section: string;
  severity: IncidentSeverity;
  detectedAt: string;
  status: "Detected" | "Acknowledged" | "Mitigating" | "Resolved" | "Escalated";
  affectedTrains: string[];
  description: string;
  recommendedActions: string[];
  recommendedBlock?: Block | null;
}

export interface AiPrediction {
  id: string;
  assetId: string;
  assetName: string;
  riskScore: number;
  riskCategory: string;
  confidence: number;
  factors: { factor: string; impact: number; description: string }[];
  recommendedAction: string;
  createdAt: string;
  model: string;
}

export interface Approval {
  id: string;
  type: string;
  refId: string;
  title: string;
  description: string;
  benefit: string;
  impact: string;
  confidence: number;
  createdBy: string;
  /** Posting id of the human who created this recommendation (self-approval guard). */
  createdByUserId?: string;
  createdAt: string;
  status: ApprovalStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  riskReduction?: number;
  estimatedDelay?: number;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  performedBy: string;
  timestamp: string;
  details: string;
}

export interface SimulationParams {
  blockStartOffset: number;
  blockDuration: number;
  maintenancePriority: string;
  maxTeams: number;
  trainPriorityWeight: number;
  simultaneousBlocks: number;
}

export interface SimulationResult {
  expectedDelay: number;
  affectedTrains: number;
  operationalConflicts: number;
  riskReduction: number;
  assetAvailability: number;
  optimizationScore: number;
  before: {
    expectedDelay: number;
    affectedTrains: number;
    riskReduction: number;
  };
}

export interface DashboardData {
  activeMaintenanceRequests: number;
  assetsUnderMaintenance: number;
  blocksPlannedToday: number;
  trainsAffected: number;
  averageDelayRisk: number;
  assetAvailability: number;
  assetHealthOverview: { name: string; count: number; color: string }[];
  priorityDistribution: { name: string; value: number; color: string }[];
  trainDelayTrend: { date: string; delay: number; onTime: number }[];
  recentRequests: MaintenanceRequest[];
  criticalAlerts: { id: string; message: string; severity: string; time: string }[];
  systemHealth: { component: string; status: string; uptime: string }[];
}
