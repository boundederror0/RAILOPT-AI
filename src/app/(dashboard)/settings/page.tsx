"use client";

import React, { useEffect, useState } from "react";
import {
  Save,
  Server,
  Cpu,
  ShieldCheck,
  Database,
  RotateCcw,
  User,
  CheckCircle2,
} from "lucide-react";
import type { SimulationParams, AuditLog } from "@/lib/types";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { cn, formatDateTime } from "@/lib/utils";
import { AccessGuard } from "@/components/shared/access-guard";

interface SystemStatus {
  healthy: boolean;
  label: string;
  pendingRecommendations: number;
  activeIncidents: number;
  services: { name: string; status: string; uptime: string }[];
}

interface SimParamsResponse {
  params: SimulationParams;
  defaults: SimulationParams;
  config: {
    maxSimultaneousBlocksPerLocation: number;
    defaultMaxTeams: number;
    trainPriorityWeight: number;
    nightWindowStart: number;
    nightWindowEnd: number;
    maxTrainsPerDelayBand: number;
    simulationEnabled: boolean;
  };
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sim, setSim] = useState<SimulationParams | null>(null);
  const [defaults, setDefaults] = useState<SimulationParams | null>(null);
  const [sys, setSys] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);

const load = async () => {
    try {
      const [simRes, sysRes] = await Promise.all([
        api.getSimulationParams<SimParamsResponse>(),
        api.getSystemStatus<SystemStatus>(),
      ]);
      setSim(simRes.params);
      setDefaults(simRes.defaults);
      setSys(sysRes);
    } catch (e) {
      toast("Failed to load settings", { description: e instanceof Error ? e.message : "Try again", variant: "error" });
    } finally {
      setLoading(false);
    }
    try {
      const logsRes = await api.getAuditLogs<{ logs: AuditLog[] }>();
      setLogs(logsRes.logs);
    } catch {
      setLogs([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    setSim((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = async () => {
    if (!sim) return;
    setSaving(true);
    try {
      await api.saveSimulationParams(sim);
      setSavedFlash(true);
      toast("Simulation parameters saved", { description: "All new optimizations will use these settings.", variant: "success" });
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      toast("Save failed", { description: e instanceof Error ? e.message : "Try again", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!defaults) return;
    setSim(defaults);
    toast("Reset to defaults", { description: "Parameters reset. Click Save to persist.", variant: "info" });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Settings" subtitle="System configuration & artificial intelligence parameters" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <div className="space-y-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-56" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AccessGuard requiredPermission="settings.view">
      <div>
        <PageHeader
          title="Settings"
          subtitle="Simulation, operator and artificial intelligence configuration"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4" /> Reset defaults
              </Button>
              <Button onClick={save} disabled={!sim || saving}>
                {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : savedFlash ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {savedFlash ? "Saved" : "Save changes"}
              </Button>
            </div>
          }
        />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Simulation params */}
        <div className="lg:col-span-7">
          <Panel title="Block optimizer parameters" description="Global defaults used by RAILOPT AI">
            {sim && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Block start offset (h)" hint={`Shift blocks by ${sim.blockStartOffset}h from requested time`}>
                  <Input type="number" step={1} min={-4} max={8} value={sim.blockStartOffset} onChange={(e) => set("blockStartOffset", Number(e.target.value))} aria-label="Block start offset hours" />
                </Field>
                <Field label="Block duration (h)" hint="Default planning window per block">
                  <Input type="number" step={0.5} min={0.5} max={2.5} value={sim.blockDuration} onChange={(e) => set("blockDuration", Number(e.target.value))} aria-label="Block duration hours" />
                </Field>
                <Field label="Maintenance priority" hint="How requests are prioritised when slots conflict">
                  <Select value={sim.maintenancePriority} onValueChange={(v) => set("maintenancePriority", v)}>
                    <SelectTrigger aria-label="Maintenance priority">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (risk-based)</SelectItem>
                      <SelectItem value="Critical">Critical first</SelectItem>
                      <SelectItem value="High">High first</SelectItem>
                      <SelectItem value="Medium">Medium first</SelectItem>
                      <SelectItem value="Low">Low first</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Max teams in parallel" hint="Maximum concurrent maintenance possessions">
                  <Input type="number" step={1} min={1} max={8} value={sim.maxTeams} onChange={(e) => set("maxTeams", Number(e.target.value))} aria-label="Max teams in parallel" />
                </Field>
                <Field label="Train priority weight" hint="Impact multiplier for high-priority trains">
                  <Input type="number" step={0.1} min={0.5} max={2} value={sim.trainPriorityWeight} onChange={(e) => set("trainPriorityWeight", Number(e.target.value))} aria-label="Train priority weight" />
                </Field>
                <Field label="Simultaneous blocks" hint="Blocks allowed on the same section at the same time">
                  <Input type="number" step={1} min={1} max={4} value={sim.simultaneousBlocks} onChange={(e) => set("simultaneousBlocks", Number(e.target.value))} aria-label="Simultaneous blocks" />
                </Field>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-4 lg:col-span-5">
          {/* Operator */}
          <Panel title="Signed-in operator" description="Human decision-maker on this console">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
                <User className="h-5 w-5" />
              </span>
<div>
                <p className="text-sm font-semibold text-slate-900">{user?.name ?? "—"}</p>
                <p className="text-xs text-slate-500">{user?.designation ?? "No requirement signed in"}</p>
                <p className="text-[11px] text-slate-400">{user?.scope ?? ""}</p>
              </div>
              <Badge variant="green" className="ml-auto">Authorised</Badge>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
              All AI actions pass through this operator&apos;s approval. Signed actions are appended to the audit trail.
            </p>
          </Panel>

          {/* AI runtime */}
          <Panel title="AI service status" description="Deterministic reference services running in-process">
            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <Server className="h-3.5 w-3.5 text-emerald-600" /> {sys?.label ?? "…"}
              </p>
              {sys?.healthy !== undefined && (
                <Badge variant={sys.healthy ? "green" : "red"}>{sys.healthy ? "Healthy" : "Attention"}</Badge>
              )}
            </div>
            <div className="mt-3 space-y-1.5">
              {sys?.services.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Cpu className="h-3 w-3 text-slate-300" /> {s.name}
                  </span>
                  <span className={cn("font-medium", s.status === "Healthy" ? "text-emerald-600" : "text-amber-600")}>
                    {s.status} · {s.uptime}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Data */}
          <Panel title="Data layer" description="Storage & demo mode">
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Database className="h-3.5 w-3.5 text-slate-300" /> Storage
                </span>
                <span className="font-medium text-slate-700">In-memory demo store</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Persistent database</span>
                <span className="font-medium text-slate-400">Not configured</span>
              </div>
              <div className="flex items-center justify-between">
                <span>All operational data</span>
                <Badge variant="amber">DEMO</Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Restarting the server re-seeds from RAILOPT&apos;s bundled Madurai Division dataset. Wire the store to a real
                signalling/ERP feed in production.
              </p>
            </div>
          </Panel>
        </div>
      </div>

{/* Recent audit */}
      <Panel title="Recent audit activity" description="Latest 8 recorded actions — restricted to administration access" className="mt-4" contentClassName="p-0">
        <div className="divide-y divide-slate-100">
          {logs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-700">{log.action} — {log.details}</p>
                <p className="text-[11px] text-slate-400">{log.entity} {log.entityId} · by {log.performedBy}</p>
              </div>
              <span className="shrink-0 text-[11px] text-slate-400">{formatDateTime(log.timestamp)}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="p-4 text-xs text-slate-400">No audit entries yet — audit logs are visible to System Administrators only.</p>}
        </div>
      </Panel>
    </div>
    </AccessGuard>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-700">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
