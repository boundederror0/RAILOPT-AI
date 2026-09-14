"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Radio,
  Clock,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { api } from "@/lib/api";
import type { Asset, Block, MaintenanceTeam, TrainSchedule } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { WorkflowBar } from "@/components/shared/workflow-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, priorityColor } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { AccessGuard } from "@/components/shared/access-guard";

export default function LiveOperationsPage() {
  const { user } = useAuth();
  const { data, loading, reload } = useFetch<{ trains: TrainSchedule[]; blocks: Block[]; teams: MaintenanceTeam[]; assets: Asset[] }>(() =>
    Promise.all([
      api.getTrains<{ trains: TrainSchedule[] }>(),
      api.getBlocks<{ blocks: Block[] }>(),
      api.getTeams<{ teams: MaintenanceTeam[] }>(),
      api.getAssets<{ assets: Asset[] }>(),
    ]).then(([t, b, tm, a]) => ({ trains: t.trains, blocks: b.blocks, teams: tm.teams, assets: a.assets }))
  );

  const [clock, setClock] = useState(() => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
  const [simTime, setSimTime] = useState(() => new Date("2026-09-12T06:00:00"));
  const [liveTrains, setLiveTrains] = useState<TrainSchedule[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!data) return;
    setLiveTrains(data.trains);
    const tick = setInterval(() => {
      setSimTime((prev) => {
        const d = new Date(prev);
        d.setMinutes(d.getMinutes() + 5);
        return d;
      });
      setLiveTrains((prev) =>
        prev.map((t) => {
          const delayDelta = Math.random() > 0.75 ? 1 : 0;
          return { ...t, delay: t.delay + delayDelta };
        })
      );
    }, 4000);
    return () => clearInterval(tick);
  }, [data]);

  const runningTrains = liveTrains.filter((t) => t.currentStatus === "Running");
  const heldTrains = liveTrains.filter((t) => t.currentStatus === "Held" || t.currentStatus === "Delayed");

  const activeBlocks = (data?.blocks ?? []).filter((b) => ["Approved", "Active"].includes(b.status));
  const degradedAssets = (data?.assets ?? []).filter((a) => a.condition === "Critical" || a.condition === "Poor");
  const degradedTeams = (data?.teams ?? []).filter((t) => !t.available);
  const availableTeams = (data?.teams ?? []).filter((t) => t.available);

  const alerts = useMemo(() => {
    const list: { id: string; severity: string; message: string; time: string }[] = [];
    if (heldTrains.length > 0)
      list.push({
        id: "ht",
        severity: "High",
        message: `${heldTrains.length} train${heldTrains.length > 1 ? "s" : ""} held: ${heldTrains.map((t) => t.number).join(", ")}`,
        time: "live",
      });
    if (degradedAssets.length > 0)
      list.push({
        id: "da",
        severity: "Critical",
        message: `${degradedAssets.length} asset${degradedAssets.length > 1 ? "s" : ""} degraded`,
        time: "live",
      });
    if (degradedTeams.length > 0)
      list.push({
        id: "dt",
        severity: "Moderate",
        message: `${degradedTeams.length} team${degradedTeams.length > 1 ? "s" : ""} unavailable`,
        time: "live",
      });
    if (activeBlocks.length > 0)
      list.push({
        id: "ab",
        severity: "Moderate",
        message: `${activeBlocks.length} active block${activeBlocks.length > 1 ? "s" : ""} protecting possessions`,
        time: "live",
      });
    return list;
  }, [heldTrains, degradedAssets, degradedTeams, activeBlocks]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Live Operations" subtitle="Real-time railway control room — simulated feed" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <AccessGuard requiredPermission="live-operations.view">
      <div>
        <PageHeader
          title="Live Operations"
          subtitle="Simulated real-time railway status. All data below is demonstration only."
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 py-1">
                <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-600" />
                DEMO DATA
              </Badge>
              <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-mono text-slate-700">
                <Clock className="h-4 w-4 text-slate-400" />
                {clock}
              </div>
              <Button variant="ghost" size="sm" onClick={reload}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          }
        />

      <WorkflowBar current={6} />

      <div className="mb-3 flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-700">
        <Layers className="h-3.5 w-3.5" />
        <span className="font-medium">Operational window: </span>
        <span>SIM {simTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })} · Authority: {user?.name ?? "—"}</span>
      </div>

      {/* At-a-glance status strip */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
          <span className="text-xs text-slate-500">Running trains</span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {runningTrains.length}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
          <span className="text-xs text-slate-500">Held / delayed</span>
          <span className={cn("text-xs font-semibold", heldTrains.length > 0 ? "text-red-600" : "text-emerald-600")}>{heldTrains.length}</span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
          <span className="text-xs text-slate-500">Degraded assets</span>
          <span className={cn("text-xs font-semibold", degradedAssets.length > 0 ? "text-red-600" : "text-emerald-600")}>{degradedAssets.length}</span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
          <span className="text-xs text-slate-500">Teams available</span>
          <span className={cn("text-xs font-semibold", availableTeams.length === 0 ? "text-red-600" : "text-slate-800")}>{availableTeams.length} of {availableTeams.length + degradedTeams.length}</span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
          <span className="text-xs text-slate-500">Active blocks</span>
          <span className={cn("text-xs font-semibold", activeBlocks.length > 0 ? "text-amber-600" : "text-slate-800")}>{activeBlocks.length}</span>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Panel title="Operational alerts" description="Auto-updating live feed">
          <div className="flex flex-wrap gap-2">
            {alerts.map((a) => (
              <div key={a.id} className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-xs", a.severity === "Critical" ? "border-red-200 bg-red-50 text-red-700" : a.severity === "High" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Active trains */}
        <Panel title={`Running trains (${runningTrains.length})`} className="lg:col-span-7" contentClassName="p-0">
          <div className="divide-y divide-slate-100">
            {runningTrains.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {t.number} <span className="text-slate-400">·</span> {t.name}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">{t.route} · {t.type}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {t.delay > 0 && (
                    <Badge variant="amber">+{t.delay} min</Badge>
                  )}
                  <Badge className={priorityColor(t.priority)}>{t.priority}</Badge>
                </div>
              </div>
            ))}
            {runningTrains.length === 0 && <p className="p-4 text-sm text-slate-400">No trains currently marked as running.</p>}
          </div>
        </Panel>

        {/* Right panels */}
        <div className="space-y-4 lg:col-span-5">
          <Panel title={`Current blocks (${activeBlocks.length})`}>
            <div className="space-y-2">
              {activeBlocks.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-slate-800">{b.section} · {b.location}</p>
                    <p className="font-mono text-[11px] text-slate-400">{new Date(b.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })} – {new Date(b.endTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={b.status} />
                    <Link
                      href={`/train-impact?block=${b.id}`}
                      className="flex items-center gap-0.5 text-[11px] font-medium text-slate-500 hover:text-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      title={`View impact of ${b.id}`}
                    >
                      Impact <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
              {activeBlocks.length === 0 && <p className="text-xs text-slate-400">No active possessions</p>}
            </div>
          </Panel>

          <Panel title="Maintenance teams" description={`${availableTeams.length} of ${availableTeams.length + degradedTeams.length} available`}>
            <div className="space-y-2">
              {data?.teams.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", t.available ? "bg-emerald-500" : "bg-amber-500")} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{t.name}</p>
                      <p className="truncate text-[10px] text-slate-400">{t.specialization} · {t.location}</p>
                    </div>
                  </div>
                  <StatusBadge status={t.available ? "Operational" : "Under Maintenance"} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
    </AccessGuard>
  );
}