import type {
  Approval,
  Asset,
  AssetType,
  AuditLog,
  Block,
  Incident,
  MaintenanceRequest,
  MaintenanceTeam,
  TrainSchedule,
} from "./types";

/**
 * DEMONSTRATION DATA
 * All assets, times and figures in this file are fictional simulated data used to
 * demonstrate the RAILOPT AI platform. They do not represent actual railway operations.
 */

export const SYSTEM_DATE = new Date("2026-09-12T06:00:00");

const TODAY = "2026-09-12";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(424242);

export const ASSET_LOCATIONS: {
  section: string;
  assets: { name: string; type: AssetType; location: string }[];
}[] = [
  {
    section: "Madurai–Melur",
    assets: [
      { name: "Track Circuit TC-01/12.4 km", type: "Track Circuit", location: "Madurai" },
      { name: "Signal SIG-GlN-24", type: "Signal", location: "Madurai" },
      { name: "Point Machine PM-21/22B", type: "Point Machine", location: "Madurai" },
      { name: "Level Crossing LC-31", type: "Level Crossing", location: "Madurai" },
      { name: "OHE Mast 84A/3", type: "OHE Mast", location: "Madurai" },
    ],
  },
  {
    section: "Madurai–Dindigul",
    assets: [
      { name: "Track Circuit TC-05/8.2 km", type: "Track Circuit", location: "Dindigul" },
      { name: "Signal SIG-MDU-12", type: "Signal", location: "Dindigul" },
      { name: "Bridge BR-47 (Kodai Road)", type: "Bridge", location: "Kodaikanal Road" },
      { name: "Point Machine PM-14/15A", type: "Point Machine", location: "Dindigul" },
      { name: "OHE Mast 62B/1", type: "OHE Mast", location: "Dindigul" },
    ],
  },
  {
    section: "Dindigul–Tiruchirappalli",
    assets: [
      { name: "Track Circuit TC-09/14.7 km", type: "Track Circuit", location: "Tiruchirappalli" },
      { name: "Signal SIG-TRY-04", type: "Signal", location: "Tiruchirappalli" },
      { name: "Point Machine PM-33/34B", type: "Point Machine", location: "Tiruchirappalli" },
      { name: "Traction Substation TSS-Kizh", type: "Traction Substation", location: "Tiruchirappalli" },
      { name: "Bridge BR-12 (Coleroon)", type: "Bridge", location: "Tiruchirappalli" },
    ],
  },
  {
    section: "Madurai–Virudhunagar",
    assets: [
      { name: "Track Circuit TC-15/6.9 km", type: "Track Circuit", location: "Virudhunagar" },
      { name: "Signal SIG-VDN-02", type: "Signal", location: "Virudhunagar" },
      { name: "Level Crossing LC-57", type: "Level Crossing", location: "Virudhunagar" },
      { name: "Point Machine PM-08/09A", type: "Point Machine", location: "Virudhunagar" },
    ],
  },
  {
    section: "Rameswaram Line",
    assets: [
      { name: "Pamban Bridge Pier 18", type: "Bridge", location: "Rameswaram" },
      { name: "Track Circuit TC-22/3.1 km", type: "Track Circuit", location: "Rameswaram" },
      { name: "Signal SIG-RMM-07", type: "Signal", location: "Rameswaram" },
      { name: "Level Crossing LC-72", type: "Level Crossing", location: "Mandapam" },
    ],
  },
  {
    section: "Madurai–Coimbatore",
    assets: [
      { name: "OHE Mast 118C/2", type: "OHE Mast", location: "Pollachi" },
      { name: "Track Circuit TC-31/11.3 km", type: "Track Circuit", location: "Coimbatore" },
      { name: "Traction Substation TSS-OD", type: "Traction Substation", location: "Coimbatore" },
      { name: "Point Machine PM-45/46B", type: "Point Machine", location: "Coimbatore" },
      { name: "Signal SIG-CBE-09", type: "Signal", location: "Coimbatore" },
    ],
  },
  {
    section: "Chennai–Madurai (Chord)",
    assets: [
      { name: "Traction Substation TSS-TPJ", type: "Traction Substation", location: "Karaikudi" },
      { name: "Track Circuit TC-44/9.8 km", type: "Track Circuit", location: "Ariyalur" },
      { name: "Signal SIG-KRD-11", type: "Signal", location: "Karaikudi" },
      { name: "Bridge BR-78 (Vellar)", type: "Bridge", location: "Ariyalur" },
    ],
  },
  {
    section: "Madurai–Tenkasi",
    assets: [
      { name: "Track Circuit TC-51/5.4 km", type: "Track Circuit", location: "Tenkasi" },
      { name: "Point Machine PM-19/20A", type: "Point Machine", location: "Tenkasi" },
      { name: "Signal SIG-TEN-03", type: "Signal", location: "Tenkasi" },
    ],
  },
];

function pickDepartment(type: AssetType): string {
  switch (type) {
    case "Track Circuit":
    case "Signal":
      return "Signalling";
    case "Point Machine":
      return "S&T";
    case "Bridge":
    case "Station Building":
    case "Platform":
      return "Bridge";
    case "Traction Substation":
    case "OHE Mast":
      return "Electrical";
    case "Level Crossing":
      return "Civil";
    default:
      return "Track";
  }
}

const ISSUES: Record<AssetType, string[]> = {
  "Track Circuit": [
    "Repeat track circuit failures",
    "Low ballast resistance detected",
    "Bond wire corrosion",
    "Sleepers deteriorating near joints",
  ],
  Signal: [
    "Signal lamp burning out repeatedly",
    "Aspect not confirming",
    "Generator battery low",
    "Fouling circuit fault",
  ],
  "Point Machine": [
    "Point detection failures",
    "Motor overheating",
    "Blade gap out of tolerance",
    "Loose locking lug",
  ],
  Bridge: [
    "Girder corrosion detected",
    "Pier settlement observed",
    "Expansion joint damaged",
    "Rust on structural members",
  ],
  "Traction Substation": [
    "Transformer oil leak",
    "Relay panel fault",
    "Overheating busbar",
    "Bus section failure",
  ],
  "OHE Mast": [
    "Stay wire slack",
    "Insulator cracked",
    "Contact wire stagger error",
    "Register arm damage",
  ],
  "Level Crossing": [
    "Gate motor failure",
    "Boom barrier not lowering",
    "Warning buzzer intermittent",
    "Road surface damage",
  ],
  "Station Building": ["Chunk failure", "Plaster peeling"],
  Platform: ["Surface cracking", "Edging damage"],
  "Telecom Tower": ["Antenna misalignment", "Cable sheath damaged"],
};

export const ASSETS: Asset[] = [];

{
  let idx = 0;
  for (const sec of ASSET_LOCATIONS) {
    for (const a of sec.assets) {
      const ageYears = Math.round((rnd() * 24 + 4) * 10) / 10;
      const conditionRoll = rnd();
      const condition =
        conditionRoll > 0.9
          ? "Critical"
          : conditionRoll > 0.75
            ? "Poor"
            : conditionRoll > 0.45
              ? "Fair"
              : conditionRoll > 0.2
                ? "Good"
                : "Excellent";
      const failureFrequency = Math.round(rnd() * 8 + (condition === "Critical" ? 6 : condition === "Poor" ? 3 : 0.5));
      ASSETS.push({
        id: `AST-${String(idx + 1).padStart(3, "0")}`,
        name: a.name,
        type: a.type,
        location: a.location,
        section: sec.section,
        zone: "Southern Railway (Madurai Division)",
        ageYears,
        lastMaintenanceDate: `${2026 - Math.floor(rnd() * 3)}-0${Math.floor(rnd() * 9) + 1}-1${Math.floor(rnd() * 9)}`,
        condition,
        failureFrequency,
        incidents: Math.floor(rnd() * 5) + (condition === "Critical" ? 3 : 0),
        usageIntensity: Math.round(rnd() * 95 + 5),
        maintenanceBacklog: condition === "Critical" ? 2 : condition === "Poor" ? 1 : 0,
        utilization: Math.round(rnd() * 90 + 10),
        status:
          condition === "Critical"
            ? "Degraded"
            : condition === "Poor"
              ? "Degraded"
              : "Operational",
      });
      idx++;
    }
  }
}

const HIGH_RISK_ASSETS = ASSETS.filter(
  (a) => a.condition === "Critical" || a.condition === "Poor"
);

export const MAINTENANCE_REQUESTS: MaintenanceRequest[] = [];

{
  const used = new Set<string>();
  for (const asset of HIGH_RISK_ASSETS) {
    used.add(asset.id);
    const issuePool = ISSUES[asset.type];
    const priority: MaintenanceRequest["priority"] =
      asset.condition === "Critical" ? "Critical" : asset.condition === "Poor" ? "High" : "Medium";
    MAINTENANCE_REQUESTS.push({
      id: `MR-2026-${String(MAINTENANCE_REQUESTS.length + 1).padStart(4, "0")}`,
      assetId: asset.id,
      assetName: asset.name,
      assetType: asset.type,
      location: asset.location,
      section: asset.section,
      department: pickDepartment(asset.type),
      issue: issuePool[Math.floor(rnd() * issuePool.length)],
      description: `Reported during weekly inspection of ${asset.section} section. Immediate attention recommended to prevent service disruption.`,
      priority,
      riskScore: 55 + Math.floor(rnd() * 40),
      requestedDate: `2026-09-${String(Math.floor(rnd() * 9) + 3).padStart(2, "0")}`,
      status: "Open",
      estimatedDuration: 90 + Math.floor(rnd() * 240),
      requiredResources: asset.type === "Traction Substation" ? ["Traction crew", "Isolating transformer"] : asset.type === "Bridge" ? ["Gang of 8", "Crane"] : ["Gang of 4", "Inspection vehicle"],
      affectedTrains: ["12635", "16101", "16321"].slice(0, 1 + Math.floor(rnd() * 3)),
      historicalFailures: asset.incidents,
      currentCondition: asset.condition,
    });
  }
  for (let i = MAINTENANCE_REQUESTS.length; i < 34; i++) {
    const asset = ASSETS[Math.floor(rnd() * ASSETS.length)];
    if (used.has(asset.id)) continue;
    used.add(asset.id);
    const issuePool = ISSUES[asset.type];
    MAINTENANCE_REQUESTS.push({
      id: `MR-2026-${String(MAINTENANCE_REQUESTS.length + 1).padStart(4, "0")}`,
      assetId: asset.id,
      assetName: asset.name,
      assetType: asset.type,
      location: asset.location,
      section: asset.section,
      department: pickDepartment(asset.type),
      issue: issuePool[Math.floor(rnd() * issuePool.length)],
      description: `Routine inspection identified ${asset.type.toLowerCase()} anomaly along ${asset.section}. Preventive maintenance advised.`,
      priority: rnd() > 0.6 ? "Medium" : rnd() > 0.3 ? "Low" : "High",
      riskScore: 25 + Math.floor(rnd() * 55),
      requestedDate: `2026-09-${String(Math.floor(rnd() * 10) + 1).padStart(2, "0")}`,
      status: "Open",
      estimatedDuration: 60 + Math.floor(rnd() * 180),
      requiredResources: ["Gang of 4", "Inspection vehicle"],
      affectedTrains: ["12666"],
      historicalFailures: asset.incidents,
      currentCondition: asset.condition,
    });
  }
}

export const MAINTENANCE_TEAMS: MaintenanceTeam[] = [
  { id: "TM-01", name: "Madurai EMU Crew A", specialization: "Electrical/OHE", location: "Madurai", size: 6, currentLoad: 0, maxCapacity: 8, available: true },
  { id: "TM-02", name: "Madurai S&T Team B", specialization: "Signalling", location: "Madurai", size: 5, currentLoad: 0, maxCapacity: 6, available: true },
  { id: "TM-03", name: "Dindigul Track Gang", specialization: "Track", location: "Dindigul", size: 8, currentLoad: 0, maxCapacity: 10, available: true },
  { id: "TM-04", name: "Trichy Civil Crew", specialization: "Civil/Bridge", location: "Tiruchirappalli", size: 7, currentLoad: 0, maxCapacity: 8, available: true },
  { id: "TM-05", name: "Rameswaram Bridge Unit", specialization: "Bridge", location: "Rameswaram", size: 5, currentLoad: 0, maxCapacity: 6, available: true },
  { id: "TM-06", name: "Virudhunagar S&T Team", specialization: "Signalling", location: "Virudhunagar", size: 4, currentLoad: 0, maxCapacity: 5, available: true },
  { id: "TM-07", name: "Coimbatore Traction Team", specialization: "Electrical", location: "Coimbatore", size: 6, currentLoad: 0, maxCapacity: 7, available: true },
  { id: "TM-08", name: "Karaikudi Mobile Unit", specialization: "Track", location: "Karaikudi", size: 5, currentLoad: 0, maxCapacity: 6, available: true },
];

export const TRAINS: TrainSchedule[] = [
  {
    id: "TR-001",
    number: "12635",
    name: "Vaigai SF Express",
    route: "Chennai Egmore – Madurai",
    type: "Express",
    priority: "High",
    departureTime: `${TODAY}T06:20`,
    arrivalTime: `${TODAY}T13:15`,
    currentStatus: "Running",
    delay: 0,
    stops: [
      { station: "Chennai Egmore", arrivalTime: `${TODAY}T-1`, departureTime: `${TODAY}T06:20`, platform: 8, distance: 0 },
      { station: "Tiruchirappalli", arrivalTime: `${TODAY}T09:45`, departureTime: `${TODAY}T09:50`, platform: 4, distance: 305 },
      { station: "Dindigul", arrivalTime: `${TODAY}T11:20`, departureTime: `${TODAY}T11:25`, platform: 2, distance: 435 },
      { station: "Madurai", arrivalTime: `${TODAY}T13:15`, departureTime: `${TODAY}T13:15`, platform: 1, distance: 497 },
    ],
  },
  {
    id: "TR-002",
    number: "12636",
    name: "Vaigai SF Express (Return)",
    route: "Madurai – Chennai Egmore",
    type: "Express",
    priority: "High",
    departureTime: `${TODAY}T14:10`,
    arrivalTime: `${TODAY}T21:05`,
    currentStatus: "At Station",
    delay: 0,
    stops: [
      { station: "Madurai", arrivalTime: `${TODAY}T14:10`, departureTime: `${TODAY}T14:10`, platform: 1, distance: 0 },
      { station: "Dindigul", arrivalTime: `${TODAY}T15:20`, departureTime: `${TODAY}T15:25`, platform: 2, distance: 62 },
      { station: "Tiruchirappalli", arrivalTime: `${TODAY}T17:00`, departureTime: `${TODAY}T17:05`, platform: 3, distance: 192 },
      { station: "Chennai Egmore", arrivalTime: `${TODAY}T21:05`, departureTime: ``, platform: 8, distance: 497 },
    ],
  },
  {
    id: "TR-003",
    number: "16101",
    name: "Kollam – Chennai Express",
    route: "Kollam – Chennai Egmore",
    type: "Express",
    priority: "Medium",
    departureTime: `${TODAY}T05:40`,
    arrivalTime: `${TODAY}T22:30`,
    currentStatus: "Running",
    delay: 12,
    stops: [
      { station: "Kollam", arrivalTime: `${TODAY}T-1`, departureTime: `${TODAY}T05:40`, platform: 1, distance: 0 },
      { station: "Madurai", arrivalTime: `${TODAY}T12:05`, departureTime: `${TODAY}T12:15`, platform: 2, distance: 297 },
      { station: "Tiruchirappalli", arrivalTime: `${TODAY}T15:20`, departureTime: `${TODAY}T15:25`, platform: 3, distance: 489 },
      { station: "Chennai Egmore", arrivalTime: `${TODAY}T22:30`, departureTime: ``, platform: 6, distance: 794 },
    ],
  },
  {
    id: "TR-004",
    number: "16321",
    name: "Kanniyakumari – Chennai Express",
    route: "Kanniyakumari – Chennai Egmore",
    type: "Express",
    priority: "Medium",
    departureTime: `${TODAY}T09:10`,
    arrivalTime: `${TODAY}T01:45`,
    currentStatus: "Running",
    delay: 5,
    stops: [
      { station: "Kanniyakumari", arrivalTime: `${TODAY}T-1`, departureTime: `${TODAY}T09:10`, platform: 1, distance: 0 },
      { station: "Madurai", arrivalTime: `${TODAY}T14:30`, departureTime: `${TODAY}T14:40`, platform: 3, distance: 246 },
      { station: "Ariyalur", arrivalTime: `${TODAY}T18:10`, departureTime: `${TODAY}T18:12`, platform: 1, distance: 482 },
      { station: "Chennai Egmore", arrivalTime: `${TODAY}T01:45`, departureTime: ``, platform: 9, distance: 762 },
    ],
  },
  {
    id: "TR-005",
    number: "12666",
    name: "Howrah – Tuticorin Express",
    route: "Howrah – Tuticorin",
    type: "Express",
    priority: "High",
    departureTime: `${TODAY}T01:30`,
    arrivalTime: `${TODAY}T14:00`,
    currentStatus: "Running",
    delay: 8,
    stops: [
      { station: "Howrah", arrivalTime: `${TODAY}T-1`, departureTime: `${TODAY}T01:30`, platform: 9, distance: 0 },
      { station: "Tiruchirappalli", arrivalTime: `${TODAY}T08:40`, departureTime: `${TODAY}T08:50`, platform: 1, distance: 1742 },
      { station: "Madurai", arrivalTime: `${TODAY}T11:20`, departureTime: `${TODAY}T11:30`, platform: 4, distance: 1934 },
      { station: "Virudhunagar", arrivalTime: `${TODAY}T13:10`, departureTime: `${TODAY}T13:15`, platform: 1, distance: 2031 },
      { station: "Tuticorin", arrivalTime: `${TODAY}T14:00`, departureTime: ``, platform: 2, distance: 2100 },
    ],
  },
  {
    id: "TR-006",
    number: "06836",
    name: "Madurai – Dindigul DEMU",
    route: "Madurai – Dindigul",
    type: "MEMU",
    priority: "Low",
    departureTime: `${TODAY}T07:30`,
    arrivalTime: `${TODAY}T09:10`,
    currentStatus: "Running",
    delay: 0,
    stops: [
      { station: "Madurai", arrivalTime: `${TODAY}T07:30`, departureTime: `${TODAY}T07:30`, platform: 5, distance: 0 },
      { station: "Kodaikanal Road", arrivalTime: `${TODAY}T08:30`, departureTime: `${TODAY}T08:32`, platform: 1, distance: 56 },
      { station: "Dindigul", arrivalTime: `${TODAY}T09:10`, departureTime: ``, platform: 2, distance: 92 },
    ],
  },
  {
    id: "TR-007",
    number: "12679",
    name: "Chennai – Coimbatore Intercity",
    route: "Chennai Central – Coimbatore",
    type: "Superfast",
    priority: "High",
    departureTime: `${TODAY}T06:00`,
    arrivalTime: `${TODAY}T12:30`,
    currentStatus: "Running",
    delay: 0,
    stops: [
      { station: "Chennai Central", arrivalTime: `${TODAY}T-1`, departureTime: `${TODAY}T06:00`, platform: 4, distance: 0 },
      { station: "Coimbatore", arrivalTime: `${TODAY}T12:30`, departureTime: ``, platform: 3, distance: 495 },
    ],
  },
  {
    id: "TR-008",
    number: "56825",
    name: "Madurai – Pamban Passenger",
    route: "Madurai – Rameswaram",
    type: "Passenger",
    priority: "Medium",
    departureTime: `${TODAY}T06:15`,
    arrivalTime: `${TODAY}T18:45`,
    currentStatus: "Running",
    delay: 0,
    stops: [
      { station: "Madurai", arrivalTime: `${TODAY}T06:15`, departureTime: `${TODAY}T06:15`, platform: 6, distance: 0 },
      { station: "Mandapam", arrivalTime: `${TODAY}T16:30`, departureTime: `${TODAY}T16:45`, platform: 1, distance: 160 },
      { station: "Rameswaram", arrivalTime: `${TODAY}T18:45`, departureTime: ``, platform: 2, distance: 194 },
    ],
  },
  {
    id: "TR-009",
    number: "12694",
    name: "Tuticorin – Chennai Express",
    route: "Tuticorin – Chennai Egmore",
    type: "Express",
    priority: "Medium",
    departureTime: `${TODAY}T07:30`,
    arrivalTime: `${TODAY}T21:25`,
    currentStatus: "Running",
    delay: 0,
    stops: [
      { station: "Tuticorin", arrivalTime: `${TODAY}T07:30`, departureTime: `${TODAY}T07:30`, platform: 1, distance: 0 },
      { station: "Virudhunagar", arrivalTime: `${TODAY}T09:30`, departureTime: `${TODAY}T09:35`, platform: 2, distance: 101 },
      { station: "Madurai", arrivalTime: `${TODAY}T11:05`, departureTime: `${TODAY}T11:15`, platform: 2, distance: 166 },
      { station: "Tiruchirappalli", arrivalTime: `${TODAY}T14:00`, departureTime: `${TODAY}T14:05`, platform: 5, distance: 358 },
      { station: "Chennai Egmore", arrivalTime: `${TODAY}T21:25`, departureTime: ``, platform: 7, distance: 663 },
    ],
  },
  {
    id: "TR-010",
    number: "06451",
    name: "Madurai – Tenkasi MEMU",
    route: "Madurai – Tenkasi",
    type: "MEMU",
    priority: "Low",
    departureTime: `${TODAY}T08:10`,
    arrivalTime: `${TODAY}T12:25`,
    currentStatus: "Running",
    delay: 0,
    stops: [
      { station: "Madurai", arrivalTime: `${TODAY}T08:10`, departureTime: `${TODAY}T08:10`, platform: 4, distance: 0 },
      { station: "Virudhunagar", arrivalTime: `${TODAY}T09:40`, departureTime: `${TODAY}T09:45`, platform: 1, distance: 58 },
      { station: "Tenkasi", arrivalTime: `${TODAY}T12:25`, departureTime: ``, platform: 1, distance: 175 },
    ],
  },
  {
    id: "TR-011",
    number: "57821",
    name: "Freight (Coal) 21",
    route: "Tuticorin – Tiruchirappalli",
    type: "Freight",
    priority: "Low",
    departureTime: `${TODAY}T09:45`,
    arrivalTime: `${TODAY}T14:20`,
    currentStatus: "Held",
    delay: 15,
    stops: [
      { station: "Tuticorin", arrivalTime: `${TODAY}T09:45`, departureTime: `${TODAY}T09:45`, platform: 0, distance: 0 },
      { station: "Tiruchirappalli", arrivalTime: `${TODAY}T14:20`, departureTime: ``, platform: 0, distance: 336 },
    ],
  },
  {
    id: "TR-012",
    number: "12668",
    name: "Chennai – Tuticorin Exp",
    route: "Chennai Egmore – Tuticorin",
    type: "Express",
    priority: "High",
    departureTime: `${TODAY}T18:40`,
    arrivalTime: `${TODAY}T01:55`,
    currentStatus: "At Station",
    delay: 0,
    stops: [
      { station: "Chennai Egmore", arrivalTime: `${TODAY}T18:40`, departureTime: `${TODAY}T18:40`, platform: 2, distance: 0 },
      { station: "Tiruchirappalli", arrivalTime: `${TODAY}T22:30`, departureTime: `${TODAY}T22:35`, platform: 2, distance: 305 },
      { station: "Madurai", arrivalTime: `${TODAY}T00:40`, departureTime: `${TODAY}T00:50`, platform: 5, distance: 497 },
      { station: "Tuticorin", arrivalTime: `${TODAY}T01:55`, departureTime: ``, platform: 1, distance: 631 },
    ],
  },
];

export const BLOCKS: Block[] = [];

export const INCIDENTS: Incident[] = [
  {
    id: "INC-2026-0001",
    type: "Track Circuit Failure",
    assetId: "AST-006",
    location: "Madurai",
    section: "Madurai–Melur",
    severity: "Critical",
    detectedAt: `${TODAY}T05:12`,
    status: "Detected",
    affectedTrains: ["12635", "16101", "06836"],
    description:
      "Track circuit TC-01/12.4 km failing intermittently at Madurai–Melur block section. Auto signaling dropping at speed, indicating broken bonding.",
    recommendedActions: [
      "Isolate track circuit and protect block section",
      "Deploy S&T team to Madurai–Melur",
      "Divert trains via Virudhunagar chord during repair",
    ],
  },
  {
    id: "INC-2026-0002",
    type: "Point Machine Failure",
    assetId: "AST-014",
    location: "Tiruchirappalli",
    section: "Dindigul–Tiruchirappalli",
    severity: "High",
    detectedAt: `${TODAY}T06:45`,
    status: "Acknowledged",
    affectedTrains: ["12636", "16101"],
    description:
      "Point PM-33/34B detection failure reported during morning through passage. Hand-operated operation required.",
    recommendedActions: ["Clamp points and hand-operate", "Schedule S&T replacement window"],
  },
  {
    id: "INC-2026-0003",
    type: "Level Crossing Fault",
    assetId: "AST-029",
    location: "Mandapam",
    section: "Rameswaram Line",
    severity: "Moderate",
    detectedAt: `${TODAY}T07:30`,
    status: "Detected",
    affectedTrains: ["56825"],
    description: "LC-72 warning gong intermittent near Mandapam.",
    recommendedActions: ["Civil gang to inspect control circuitry"],
  },
];

export const APPROVALS: Approval[] = [
  {
    id: "APR-2026-0001",
    type: "Block Plan",
    refId: "PLN-2026-0091",
    title: "Schedule emergency repair — Track Circuit Madurai–Melur",
    description:
      "AI recommends an emergency maintenance block 09:15–10:00 on Madurai–Melur to replace defective bonding wires on TC-01/12.4 km.",
    benefit: "Removes critical risk (score 87) and restores full signaling reliability.",
    impact: "Delays 12635 by ~12 min and 16101 by ~8 min; 2 trains affected.",
    confidence: 92,
    createdBy: "RAILOPT AI",
    createdAt: `${TODAY}T05:45`,
    status: "Pending",
    decidedBy: null,
    decidedAt: null,
    riskReduction: 54,
    estimatedDelay: 20,
  },
  {
    id: "APR-2026-0002",
    type: "Risk Recommendation",
    refId: "AI-RSK-0045",
    title: "High priority maintenance for Point Machine PM-21/22B",
    description:
      "Risk model scores PM-21/22B at Madurai 82 (Critical). AI recommends scheduling lubrication & replacement of detection contacts within 48 hours.",
    benefit: "Expected to reduce point-failure risk from 82 to 31.",
    impact: "Requires a 45-minute possession of platform 3 lines.",
    confidence: 88,
    createdBy: "RAILOPT AI",
    createdAt: `${TODAY}T06:10`,
    status: "Pending",
    decidedBy: null,
    decidedAt: null,
    riskReduction: 51,
    estimatedDelay: 15,
  },
  {
    id: "APR-2026-0003",
    type: "Block Plan",
    refId: "PLN-2026-0088",
    title: "Night possession — OHE mast maintenance Kodaikanal Road",
    description:
      "AI proposes a 02:00–03:30 block to repair stay wire on OHE Mast 62B/1, grouped with inspection of adjacent masts.",
    benefit: "Removes 2 scheduled maintenance items with zero train conflict.",
    impact: "No daytime trains affected; minor freight re-timing.",
    confidence: 95,
    createdBy: "RAILOPT AI",
    createdAt: `${TODAY}T06:00`,
    status: "Approved",
    decidedBy: "S. Rajan (Controller)",
    decidedAt: `${TODAY}T06:25`,
    riskReduction: 34,
    estimatedDelay: 0,
  },
  {
    id: "APR-2026-0004",
    type: "Emergency Replan",
    refId: "PLN-2026-0090",
    title: "Replan trains around Point Machine failure at Trichy",
    description:
      "After PM-33/34B detection failure, AI recommends routing 16101 via chord line to maintain 12-minute hard-on schedule.",
    benefit: "Keeps 16101 on time, avoids cascading delays across 4 trains.",
    impact: "Adds 6 minutes dwell for 16101 at Tiruchirappalli.",
    confidence: 84,
    createdBy: "RAILOPT AI",
    createdAt: `${TODAY}T06:50`,
    status: "Pending",
    decidedBy: null,
    decidedAt: null,
    riskReduction: 0,
    estimatedDelay: 6,
  },
  {
    id: "APR-2026-0005",
    type: "Risk Recommendation",
    refId: "AI-RSK-0044",
    title: "Add Pamban Bridge to critical watch list",
    description:
      "Risk model indicates elevated corrosion on Pamban Bridge Pier 18 (score 78, High). AI recommends accelerated inspection cycle.",
    benefit: "Pre-empts structural intervention; integrates with monsoon readiness.",
    impact: "Extra inspection pass for bridge unit this month.",
    confidence: 81,
    createdBy: "RAILOPT AI",
    createdAt: `${TODAY}T05:55`,
    status: "Rejected",
    decidedBy: "R. Nandini (Divisional Engineer)",
    decidedAt: `${TODAY}T07:15`,
    riskReduction: 21,
    estimatedDelay: 0,
  },
  {
    id: "APR-2026-0006",
    type: "Block Plan",
    refId: "PLN-2026-0092",
    title: "Grouped day possession — Level Crossing LC-31 & LC-57",
    description:
      "AI groups two level crossing maintenance tasks into a single 08:00–09:00 working window with one civil gang.",
    benefit: "Reduces two possessions to one; cuts total block time 40%.",
    impact: "Affects 2 trains with combined delay under 9 minutes.",
    confidence: 90,
    createdBy: "RAILOPT AI",
    createdAt: `${TODAY}T07:05`,
    status: "Pending",
    decidedBy: null,
    decidedAt: null,
    riskReduction: 26,
    estimatedDelay: 9,
  },
];

export const AUDIT_LOGS: AuditLog[] = [
  {
    id: "AUD-0001",
    action: "APPROVE",
    entity: "Block Plan",
    entityId: "PLN-2026-0088",
    performedBy: "S. Rajan (Controller)",
    timestamp: `${TODAY}T06:25`,
    details: "Approved night possession at Kodaikanal Road, 02:00–03:30.",
  },
  {
    id: "AUD-0002",
    action: "REJECT",
    entity: "Risk Recommendation",
    entityId: "AI-RSK-0044",
    performedBy: "R. Nandini (Divisional Engineer)",
    timestamp: `${TODAY}T07:15`,
    details: "Rejected Pamban watch-list addition — covered by existing monsoon plan.",
  },
];

export function initialBlocks(): Block[] {
  return [
    {
      id: "BLK-001",
      requestId: "MR-2026-0003",
      location: "Madurai",
      section: "Madurai–Melur",
      startTime: `${TODAY}T09:15`,
      endTime: `${TODAY}T10:00`,
      durationMinutes: 45,
      teamId: "TM-02",
      teamName: "Madurai S&T Team B",
      affectedTrainIds: ["12635", "16101"],
      expectedDelay: 12,
      priority: "Critical",
      riskReduction: 54,
      status: "Approved",
      riskScore: 87,
    },
  ];
}