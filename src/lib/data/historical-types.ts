export const HISTORICAL_SOURCE = "KAGGLE_HISTORICAL" as const;
export type HistoricalDataSource = typeof HISTORICAL_SOURCE;

export const HISTORICAL_DISCLAIMER = {
  label: "HISTORICAL DATA",
  sourceLabel: "Source: Public Kaggle dataset",
  note: "Not live railway telemetry",
} as const;

export interface HistoricalJourney {
  trainNumber: string;
  trainType: string;
  departureDate: string; // YYYY-MM-DD
  departureHour: number; // 0-23 scheduled hour
  scheduledTravelHours: number | null;
  delayMinutes: number;
  isDelayed: 0 | 1;
  primaryDelayCause: string;
  zone: string;
  zoneAbbr: string;
  sourceStationCategory: string;
  destinationStationCategory: string;
  source: HistoricalDataSource;
}

export interface HistoricalJourneyRecord {
  trainNumber: string;
  departureDate: string; // YYYY-MM-DD
  departureHour: number;
  delayMinutes: number;
  primaryDelayCause: string;
  source: HistoricalDataSource;
}

export interface DelayCauseCount {
  cause: string;
  count: number;
}

export interface HistoricalTrainStats {
  trainNumber: string;
  trainType: string;
  zoneAbbr: string;
  sourceStationCategory: string | null;
  destinationStationCategory: string | null;
  distanceKm: number | null;
  numScheduledStops: number | null;
  scheduledTravelHours: number | null;
  firstJourneyDate: string;
  lastJourneyDate: string;
  journeyCount: number;
  avgDelay: number;
  medianDelay: number;
  p90Delay: number;
  maxDelay: number;
  delayedRate: number;
  severeDelayRate: number;
  onTimeRate: number;
  delayCauseDistribution: DelayCauseCount[];
}

export interface DelayBucket {
  bucket: string;
  journeys: number;
  share: number;
}

export interface HistoricalOverallStats {
  journeys: number;
  avgDelay: number;
  medianDelay: number;
  p90Delay: number;
  maxDelay: number;
  delayedRate: number;
  severeDelayRate: number;
  onTimeRate: number;
  delayBuckets: DelayBucket[];
  yearly: { year: number; journeys: number }[];
  monthly: { month: number; journeys: number }[];
}

export interface HistoricalZoneStats {
  zoneAbbr: string;
  zone: string;
  journeys: number;
  avgDelay: number;
  medianDelay: number;
  p90Delay: number;
  maxDelay: number;
  delayedRate: number;
  severeDelayRate: number;
  onTimeRate: number;
  topDelayCause: string;
}

export interface HistoricalDelayCauseStat {
  cause: string;
  journeys: number;
  share: number;
}

export interface HistoricalTrainTypeStat {
  trainType: string;
  journeys: number;
}

export interface HistoricalSummary {
  generatedAt: string;
  source: HistoricalDataSource;
  sourceLabel: string;
  disclaimer: string;
  onTimeThresholdMinutes: number;
  severeThresholdMinutes: number;
  overall: HistoricalOverallStats;
  zones: HistoricalZoneStats[];
  delayCauses: HistoricalDelayCauseStat[];
  trainTypes: HistoricalTrainTypeStat[];
}

export interface CompactSouthernJourney {
  t: string; // train number
  d: number; // departure date YYYYMMDD
  h: number; // departure hour
  dm: number; // delay minutes
  c: number; // index into causes[]
}

export interface SouthernRailwayHistoryFile {
  generatedAt: string;
  source: HistoricalDataSource;
  zoneAbbr: string;
  zone: string;
  journeyCount: number;
  causes: string[];
  journeys: CompactSouthernJourney[];
}

export interface HistoricalManifest {
  generatedAt: string;
  inputFile: string;
  inputRows: number;
  validRows: number;
  duplicateJourneys: number;
  invalidRows: number;
  invalidReasons: Record<string, number>;
  columnsUsed: string[];
  columnsIgnored: string[];
  outputFiles: Record<string, { bytes: number; records: number | null }>;
  southZone: string;
}

export const HISTORICAL_ON_TIME_THRESHOLD = 15;
export const HISTORICAL_SEVERE_THRESHOLD = 60;