"use client";

import { useMemo, useState } from "react";
import { useFetch } from "@/lib/use-fetch";
import { api } from "@/lib/api";
import type { TrainSchedule } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const STATION = "Madurai";

type Kind = "departures" | "arrivals";
type BoardStatus = "EXPECTED" | "ARRIVED" | "BOARDING" | "DEPARTED" | "DELAYED" | "ON TIME";

const STATUS_CLASSES: Record<BoardStatus, string> = {
  EXPECTED: "border-blue-200 bg-blue-100 text-blue-700",
  ARRIVED: "border-green-200 bg-green-100 text-green-700",
  BOARDING: "border-amber-200 bg-amber-100 text-amber-700",
  DEPARTED: "border-slate-200 bg-slate-100 text-slate-600",
  DELAYED: "border-red-200 bg-red-100 text-red-700",
  "ON TIME": "border-green-200 bg-green-100 text-green-700",
};

interface BoardRow {
  id: string;
  number: string;
  name: string;
  type: string;
  platform: number;
  arrival: string;
  departure: string;
  destination: string;
  currentStatus: string;
  delay: number;
}

function hhmm(iso: string): string {
  if (!iso || iso.length < 16 || iso.includes("T-1")) return "";
  const t = iso.slice(11, 16);
  return /^\d{2}:\d{2}$/.test(t) ? t : "";
}

function boardStatus(row: BoardRow, kind: Kind): BoardStatus {
  if (row.currentStatus === "At Station") {
    return kind === "departures" ? "BOARDING" : "ARRIVED";
  }
  if (row.currentStatus === "Arrived") return "ARRIVED";
  if (row.currentStatus === "Departed") return "DEPARTED";
  if (row.delay > 0) return "DELAYED";
  return kind === "departures" ? "ON TIME" : "EXPECTED";
}

export function StationBoard() {
  const { data, loading, error } = useFetch<{ trains: TrainSchedule[] }>(() =>
    api.getTrains()
  );
  const [tab, setTab] = useState<Kind>("departures");

  const rows = useMemo(() => {
    const list: BoardRow[] = [];
    for (const t of data?.trains ?? []) {
      const stop = t.stops.find((s) => s.station === STATION);
      if (!stop) continue;
      const arrival = hhmm(stop.arrivalTime);
      const departure = hhmm(stop.departureTime);
      if (!arrival && !departure) continue;
      list.push({
        id: t.id,
        number: t.number,
        name: t.name,
        type: t.type,
        platform: stop.platform,
        arrival,
        departure,
        destination: t.stops[t.stops.length - 1]?.station ?? "—",
        currentStatus: t.currentStatus,
        delay: t.delay,
      });
    }
    const sortBy = (key: "arrival" | "departure") =>
      [...list].filter((r) => r[key] !== "").sort((a, b) => a[key].localeCompare(b[key]));
    return { arrivals: sortBy("arrival"), departures: sortBy("departure") };
  }, [data]);

  const visible = tab === "arrivals" ? rows.arrivals : rows.departures;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">MADURAI JUNCTION (MDU)</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Station Operations · Southern Railway, Madurai Division
          </p>
        </div>
        <Badge
          variant="outline"
          className="py-1 text-[10px] uppercase tracking-wide text-slate-500"
        >
          DEMO DATA · simulated timetable — not a live feed
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Kind)}>
        <div className="px-4 pt-3">
          <TabsList>
            <TabsTrigger value="departures">Departures</TabsTrigger>
            <TabsTrigger value="arrivals">Arrivals</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={tab}>
          {loading ? (
            <div className="space-y-2 px-4 pb-4 pt-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="px-4 pb-4 pt-2 text-center text-xs text-red-600">
              Failed to load the station timetable: {error}
            </div>
          ) : visible.length === 0 ? (
            <div className="px-4 pb-4 pt-2 text-center text-xs text-slate-400">
              No {tab === "arrivals" ? "arrivals" : "departures"} in the demonstration
              timetable at {STATION}.
            </div>
          ) : (
            <div className="px-4 pb-1">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-slate-200 bg-slate-50/70 text-left text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-2 font-medium">Train No.</th>
                      <th className="px-4 py-2 font-medium">Train Name</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 text-center font-medium">PF</th>
                      <th className="px-4 py-2 font-medium">Arrival</th>
                      <th className="px-4 py-2 font-medium">Departure</th>
                      <th className="px-4 py-2 font-medium">Destination</th>
                      <th className="px-4 py-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr
                        key={`${tab}-${r.id}`}
                        className={cn(
                          "border-b border-slate-100 last:border-0",
                          r.delay > 0 && "bg-red-50/40"
                        )}
                      >
                        <td className="px-4 py-1.5 font-mono text-xs font-semibold text-slate-700">
                          {r.number}
                        </td>
                        <td className="px-4 py-1.5 font-medium text-slate-800">{r.name}</td>
                        <td className="px-4 py-1.5 text-xs text-slate-500">{r.type}</td>
                        <td className="px-4 py-1.5 text-center">
                          {r.platform > 0 ? (
                            <span className="inline-flex min-w-[44px] items-center justify-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                              PF {r.platform}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-1.5 font-mono text-xs text-slate-700">
                          {r.arrival || "—"}
                        </td>
                        <td className="px-4 py-1.5 font-mono text-xs text-slate-700">
                          {r.departure || "—"}
                        </td>
                        <td className="px-4 py-1.5 text-xs text-slate-500">{r.destination}</td>
                        <td className="px-4 py-1.5 text-right">
                          <Badge
                            className={cn(
                              "px-1.5 py-0.5 font-semibold",
                              STATUS_CLASSES[boardStatus(r, tab)]
                            )}
                          >
                            {boardStatus(r, tab)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="py-2 text-[11px] text-slate-400">
                Timetable derived from the RAILOPT demonstration dataset. Statuses are
                simulated — this is not live railway telemetry.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}