// Organizational master data — Indian Railways zones and divisions.
// Only provisioned scopes (currently Southern Railway → Madurai Division)
// accept logins; all other zones/divisions render as "Coming soon".

export interface OrganizationDivision {
  id: string;
  name: string;
  /** When false the division exists but is not yet provisioned for logins. */
  available: boolean;
}

export interface OrganizationZone {
  id: string;
  name: string;
  shortCode: string;
  /** Zonal headquarters location. */
  hq: string;
  /** When false the whole zone renders disabled ("Coming soon"). */
  available: boolean;
  divisions: OrganizationDivision[];
}

export const ZONAL_AUTHORITY_DIVISION_ID = "ZONE";
export const ZONAL_AUTHORITY_DIVISION_NAME = "All Divisions — Zonal Authority";

export const KRCL_DIVISION_ID = "KRCL_NA";
export const KRCL_DIVISION_NAME = "Not Applicable — KRCL";

export const ACTIVE_ZONE_ID = "SR";
export const ACTIVE_DIVISION_ID = "MDU";

export const ZONES: OrganizationZone[] = [
  {
    id: "CR",
    name: "Central Railway",
    shortCode: "CR",
    hq: "Mumbai",
    available: false,
    divisions: ["Mumbai", "Bhusawal", "Pune", "Solapur", "Nagpur", "Secunderabad"].map((d, i) => ({
      id: `CR-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "ER",
    name: "Eastern Railway",
    shortCode: "ER",
    hq: "Kolkata",
    available: false,
    divisions: ["Howrah", "Sealdah", "Asansol", "Malda"].map((d, i) => ({
      id: `ER-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "ECR",
    name: "East Central Railway",
    shortCode: "ECR",
    hq: "Hajipur",
    available: false,
    divisions: ["Danapur", "Pt. Deen Dayal Upadhyaya", "Dhanbad", "Samastipur", "Sonpur"].map((d, i) => ({
      id: `ECR-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "ECoR",
    name: "East Coast Railway",
    shortCode: "ECoR",
    hq: "Bhubaneswar",
    available: false,
    divisions: ["Khurda Road", "Waltair", "Sambalpur"].map((d, i) => ({
      id: `ECoR-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "NR",
    name: "Northern Railway",
    shortCode: "NR",
    hq: "Delhi",
    available: false,
    divisions: ["Delhi", "Ambala", "Firozpur", "Lucknow", "Moradabad", "Jammu"].map((d, i) => ({
      id: `NR-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "NCR",
    name: "North Central Railway",
    shortCode: "NCR",
    hq: "Prayagraj",
    available: false,
    divisions: ["Prayagraj", "Agra", "Jhansi"].map((d, i) => ({
      id: `NCR-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "NER",
    name: "North Eastern Railway",
    shortCode: "NER",
    hq: "Gorakhpur",
    available: false,
    divisions: ["Izzatnagar", "Lucknow", "Varanasi", "Kathihar"].map((d, i) => ({
      id: `NER-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "NFR",
    name: "Northeast Frontier Railway",
    shortCode: "NFR",
    hq: "Guwahati",
    available: false,
    divisions: ["Katihar", "Alipurduar", "Lumding", "Rangiya", "Tinsukia"].map((d, i) => ({
      id: `NFR-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "NWR",
    name: "North Western Railway",
    shortCode: "NWR",
    hq: "Jaipur",
    available: false,
    divisions: ["Jaipur", "Ajmer", "Bikaner", "Jodhpur"].map((d, i) => ({
      id: `NWR-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "SR",
    name: "Southern Railway",
    shortCode: "SR",
    hq: "Chennai",
    available: true,
    divisions: [
      { id: "MAS", name: "Chennai Division", available: false },
      { id: "MDU", name: "Madurai Division", available: true },
      { id: "PGT", name: "Palakkad Division", available: false },
      { id: "SA", name: "Salem Division", available: false },
      { id: "TPJ", name: "Tiruchirappalli Division", available: false },
      { id: "TVC", name: "Thiruvananthapuram Division", available: false },
    ],
  },
  {
    id: "SCR",
    name: "South Central Railway",
    shortCode: "SCR",
    hq: "Secunderabad",
    available: false,
    divisions: ["Secunderabad", "Hyderabad", "Vijayawada", "Guntakal", "Guntur", "Nanded"].map((d, i) => ({
      id: `SCR-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "SER",
    name: "South Eastern Railway",
    shortCode: "SER",
    hq: "Kolkata",
    available: false,
    divisions: ["Kharagpur", "Adra", "Chakradharpur", "Ranchi"].map((d, i) => ({
      id: `SER-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "SECR",
    name: "South East Central Railway",
    shortCode: "SECR",
    hq: "Bilaspur",
    available: false,
    divisions: ["Bilaspur", "Raipur", "Nagpur"].map((d, i) => ({
      id: `SECR-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "SWR",
    name: "South Western Railway",
    shortCode: "SWR",
    hq: "Hubballi",
    available: false,
    divisions: ["Bengaluru", "Mysuru", "Hubballi"].map((d, i) => ({
      id: `SWR-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "WR",
    name: "Western Railway",
    shortCode: "WR",
    hq: "Mumbai",
    available: false,
    divisions: ["Mumbai Central", "Vadodara", "Ahmedabad", "Rajkot", "Bhavnagar", "Ratlam"].map((d, i) => ({
      id: `WR-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "WCR",
    name: "West Central Railway",
    shortCode: "WCR",
    hq: "Jabalpur",
    available: false,
    divisions: ["Bhopal", "Jabalpur", "Kota"].map((d, i) => ({
      id: `WCR-${i + 1}`,
      name: d,
      available: false,
    })),
  },
  {
    id: "METRO",
    name: "Kolkata Metro Railway",
    shortCode: "METRO",
    hq: "Kolkata",
    available: false,
    divisions: [{ id: "METRO_NA", name: "No Divisions — Kolkata Metro", available: false }],
  },
  {
    id: "KRCL",
    name: "Konkan Railway Corporation",
    shortCode: "KRCL",
    hq: "Belapur (Navi Mumbai)",
    available: false,
    divisions: [{ id: KRCL_DIVISION_ID, name: KRCL_DIVISION_NAME, available: false }],
  },
];

export function getZone(zoneId: string): OrganizationZone | null {
  return ZONES.find((z) => z.id === zoneId) ?? null;
}

export function getDivision(zoneId: string, divisionId: string): OrganizationDivision | null {
  const zone = getZone(zoneId);
  if (!zone) return null;
  if (divisionId === ZONAL_AUTHORITY_DIVISION_ID) {
    return { id: ZONAL_AUTHORITY_DIVISION_ID, name: ZONAL_AUTHORITY_DIVISION_NAME, available: true };
  }
  return zone.divisions.find((d) => d.id === divisionId) ?? null;
}

export function isDivisionCode(zoneId: string, divisionId: string): boolean {
  const zone = getZone(zoneId);
  if (!zone) return false;
  return zone.divisions.some((d) => d.id === divisionId);
}

/** True only for provisioned scopes (Southern Railway → Madurai Division). */
export function isScopeProvisioned(zoneId: string, divisionId: string): boolean {
  if (zoneId !== ACTIVE_ZONE_ID) return false;
  if (divisionId === ZONAL_AUTHORITY_DIVISION_ID) return true;
  return divisionId === ACTIVE_DIVISION_ID;
}

export function zoneDisplayName(zoneId: string): string {
  return getZone(zoneId)?.name ?? zoneId;
}

export function divisionDisplayName(zoneId: string, divisionId: string): string {
  if (divisionId === ZONAL_AUTHORITY_DIVISION_ID) return ZONAL_AUTHORITY_DIVISION_NAME;
  if (divisionId === KRCL_DIVISION_ID) return KRCL_DIVISION_NAME;
  const zone = getZone(zoneId);
  return zone?.divisions.find((d) => d.id === divisionId)?.name ?? divisionId;
}