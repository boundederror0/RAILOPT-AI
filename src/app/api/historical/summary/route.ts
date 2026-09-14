import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/server-auth";
import {
  isHistoricalDataAvailable,
  getHistoricalManifest,
  getHistoricalSummary,
  getOverallDelayStats,
  getZoneDelayStats,
  getDelayCauseStats,
  getTrainTypeStats,
  getTrainStatsByNumber,
  getTrainDelayHistory,
  getHistoricalLabel,
} from "@/lib/data/historical-railway";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = requirePermission("historical.view");
  if ("error" in guard) return guard.error;

  const trainNumber = request.nextUrl.searchParams.get("train")?.trim() || null;
  if (trainNumber && trainNumber.length > 30) {
    return NextResponse.json({ error: "train parameter must be 30 characters or fewer." }, { status: 400 });
  }

  const available = isHistoricalDataAvailable();
  const summary = getHistoricalSummary();
  const manifest = getHistoricalManifest();

  const body = {
    available,
    ...getHistoricalLabel(),
    disclaimer: "Historical intelligence only. This is a public Kaggle dataset, not live railway telemetry.",
    onTimeThresholdMinutes: summary?.onTimeThresholdMinutes ?? null,
    severeThresholdMinutes: summary?.severeThresholdMinutes ?? null,
    generatedAt: summary?.generatedAt ?? null,
    inputFile: manifest?.inputFile ?? null,
    inputRows: manifest?.inputRows ?? null,
    validRows: manifest?.validRows ?? null,
    duplicateJourneys: manifest?.duplicateJourneys ?? null,
    invalidRows: manifest?.invalidRows ?? null,
    outputFiles: manifest?.outputFiles ?? null,
    overall: getOverallDelayStats(),
    zones: getZoneDelayStats() ?? [],
    delayCauses: getDelayCauseStats() ?? [],
    trainTypes: getTrainTypeStats() ?? [],
    train: null as
      | {
          trainNumber: string;
          stats: ReturnType<typeof getTrainStatsByNumber>;
          delayHistory: ReturnType<typeof getTrainDelayHistory>;
        }
      | null,
  };

  if (trainNumber) {
    body.train = {
      trainNumber,
      stats: getTrainStatsByNumber(trainNumber),
      delayHistory: getTrainDelayHistory(trainNumber, 200),
    };
  }

  return NextResponse.json(body);
}