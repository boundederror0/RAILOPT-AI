"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ScrollText,
  Siren,
  Check,
  X,
  Eye,
  ArrowRight,
} from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { api } from "@/lib/api";
import type { Approval, Incident, IncidentSeverity } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn, formatDateTime, minutesToHM } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { AccessGuard, ActionButton } from "@/components/shared/access-guard";

interface Recommendation {
  incidentId: string;
  affectedSection: string;
  severity: string;
  affectedTrains: string[];
  estimatedDisruption: number;
  recommendedResponse: string;
  recommendedBlock: {
    startTime: string;
    endTime: string;
    durationMinutes: number;
    teamName: string;
    expectedDelay: number;
    riskReduction: number;
  } | null;
  alternativePlans: string[];
  description: string;
  revisionReason: string;
}

interface EmergencyResponse {
  incident: Incident;
  recommendation: Recommendation;
}

const SCENARIOS = [
  { label: "Track circuit failure — Madurai Junction", section: "Madurai–Melur", severity: "Critical" as IncidentSeverity, description: "Track circuit TC-01/12.4 km failing intermittently at Madurai–Melur. Auto signalling dropping at speed." },
  { label: "Point machine failure — Tiruchirappalli", section: "Dindigul–Tiruchirappalli", severity: "High" as IncidentSeverity, description: "Point PM-33/34B detection failure during morning through passage. Hand operation needed." },
  { label: "Level crossing fault — Mandapam", section: "Rameswaram Line", severity: "Moderate" as IncidentSeverity, description: "LC-72 warning gong intermittent near Mandapam approach." },
  { label: "Signal failure — Virudhunagar", section: "Madurai–Virudhunagar", severity: "High" as IncidentSeverity, description: "Signal SIG-VDN-02 showing constant authority; fouling circuit under suspicion." },
  { label: "OHE disconnection — Kodaikanal Road", section: "Madurai–Dindigul", severity: "Critical" as IncidentSeverity, description: "Overhead wire sagging near OHE mast 62B/1 after heavy rain." },
];

export default function EmergencyPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data, loading, reload } = useFetch<{ incidents: Incident[] }>(() => api.getIncidents());
  const [scenario, setScenario] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [latest, setLatest] = useState<EmergencyResponse | null>(null);
  const [detailIncident, setDetailIncident] = useState<Incident | null>(null);
  const [decidingIds, setDecidingIds] = useState<Set<string>>(new Set());
  const [approvedId, setApprovedId] = useState<string | null>(null);

  const incidents = data?.incidents ?? [];
  const criticalCount = incidents.filter((i) => i.status !== "Resolved").length;

  useEffect(() => {
    if (!detailIncident) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailIncident(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailIncident]);

  const detectIncident = async () => {
    const s = SCENARIOS[scenario];
    setDetecting(true);
    setLatest(null);
    try {
      const res = await api.emergencyReplan<EmergencyResponse>({
        section: s.section,
        description: s.description,
        severity: s.severity,
        location: s.section.split("–")[0],
      });
      setLatest(res);
      toast("Incident detected & replan generated", {
        description: `${res.incident.type} at ${res.incident.section} — sent to approval queue.`,
        variant: "warning",
      });
      reload();
    } catch (e) {
      toast("Detection failed", {
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setDetecting(false);
    }
  };

  const decide = async (incident: Incident, decision: "Approved" | "Rejected") => {
    setDecidingIds((prev) => new Set(prev).add(incident.id));
    try {
      const approvals = await api.getApprovals<{ approvals: Approval[] }>();
      const approvable = approvals.approvals.find((a) => a.refId === incident.id && a.status === "Pending");
      if (approvable) {
        await api.decideApproval(approvable.id, { decision });
      }
      if (decision === "Approved") setApprovedId(incident.id);
      toast(
        decision === "Approved" ? "Replan approved" : "Replan rejected",
        {
          description:
            decision === "Approved"
              ? "The revised schedule has been applied and the block is now approved."
              : "The recommendation was rejected; no changes applied.",
          variant: decision === "Approved" ? "success" : "info",
        }
      );
      reload();
    } catch (e) {
      toast("Action failed", { description: e instanceof Error ? e.message : "Try again.", variant: "error" });
    } finally {
      setDecidingIds((prev) => {
        const next = new Set(prev);
        next.delete(incident.id);
        return next;
      });
    }
  };

  return (
    <AccessGuard requiredPermission="emergency.view">
      <div>
        <PageHeader
          title="Emergency Replanning"
          subtitle="AI detects incidents, proposes revised schedules — a human operator decides"
          actions={
            <div className="flex items-center gap-2">
              <Badge variant={criticalCount > 0 ? "red" : "green"} className="gap-1.5 py-1">
                <Siren className="h-3.5 w-3.5" /> {criticalCount} active incident{criticalCount === 1 ? "" : "s"}
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-600" /> Human-in-the-loop
              </Badge>
            </div>
          }
        />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Scenario simulation */}
        <div className="lg:col-span-4">
          <Panel title="Simulate incident detection" description="Choose a scenario and let AI respond">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700" htmlFor="scenario">Scenario</label>
                <Select value={String(scenario)} onValueChange={(v) => setScenario(Number(v))}>
                  <SelectTrigger id="scenario">
                    <SelectValue placeholder="Scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENARIOS.map((s, i) => (
                      <SelectItem key={i} value={String(i)}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-medium text-slate-800">{SCENARIOS[scenario].section}</p>
                <p className="mt-1 text-slate-500">{SCENARIOS[scenario].description}</p>
                <p className="mt-2">
                  Severity: <Badge variant={SCENARIOS[scenario].severity === "Critical" ? "red" : SCENARIOS[scenario].severity === "High" ? "amber" : "blue"}>{SCENARIOS[scenario].severity}</Badge>
                </p>
              </div>

              <Button variant="destructive" className="w-full" onClick={detectIncident} disabled={detecting}>
                {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Siren className="h-4 w-4" />}
                {detecting ? "Detecting & replanning…" : "Detect incident & generate replan"}
              </Button>

              <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                Nothing is applied automatically. Every replan sits in the approval queue until an operator approves it.
              </p>
            </div>
          </Panel>

          {/* Incident list */}
          <Panel title="Active incidents" description="All detected events" className="mt-4" contentClassName="p-0">
            {loading ? (
              <div className="space-y-1 p-3">
                {[0, 1, 2].map((i) => (<Skeleton key={i} className="h-14 w-full" />))}
              </div>
            ) : incidents.length === 0 ? (
              <div className="p-4"><EmptyState title="No incidents" description="Detected incidents will appear here." /></div>
            ) : (
              <div className="divide-y divide-slate-100">
                {incidents.map((inc) => (
                  <button
                    key={inc.id}
                    onClick={() => setDetailIncident(inc)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", inc.severity === "Critical" ? "bg-red-500" : inc.severity === "High" ? "bg-amber-500" : "bg-amber-400")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-800">{inc.section}</p>
                      <p className="truncate font-mono text-[10px] text-slate-400">{inc.id} · {inc.type}</p>
                    </div>
                    <StatusBadge status={inc.status} />
                  </button>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Recommendation result */}
        <div className="lg:col-span-8">
          {!latest ? (
            <EmptyState
              title="AI replan will appear here"
              description="Pick a scenario and run detection. RAILOPT will assess severity, find affected trains and propose a revised block schedule for your approval."
              className="min-h-[340px]"
            />
          ) : (
            <div className="space-y-4">
              {/* Incident card */}
              <div className="rounded-lg border border-red-200 bg-red-50/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <h3 className="text-sm font-semibold text-slate-900">{latest.incident.type}</h3>
                      <Badge variant={latest.incident.severity === "Critical" ? "red" : latest.incident.severity === "High" ? "amber" : "blue"}>
                        {latest.incident.severity}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {latest.incident.id} · detected {formatDateTime(latest.incident.detectedAt)}
                    </p>
                  </div>
                  <StatusBadge status={latest.incident.status} />
                </div>
                <p className="mt-2 text-sm text-slate-700">{latest.incident.description}</p>
                <p className="mt-1 text-[11px] text-slate-400">{latest.recommendation.revisionReason}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Affected section" value={latest.recommendation.affectedSection} />
                <Stat label="Affected trains" value={latest.recommendation.affectedTrains.join(", ") || "0"} />
                <Stat label="Estimated disruption" value={`${latest.recommendation.estimatedDisruption} train-min`} />
                <Stat label="Recommended block" value={latest.recommendation.recommendedBlock ? `${minutesToHM(latest.recommendation.recommendedBlock.durationMinutes)}` : "None"} />
              </div>

              {/* Response & alternatives */}
              <Panel title="Recommended response">
                <p className="text-sm text-slate-700">{latest.recommendation.recommendedResponse}</p>
                {latest.recommendation.recommendedBlock && (
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-slate-100 bg-slate-50 p-3 text-xs sm:grid-cols-4">
                    <MiniStat label="Start" value={new Date(latest.recommendation.recommendedBlock.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })} />
                    <MiniStat label="End" value={new Date(latest.recommendation.recommendedBlock.endTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })} />
                    <MiniStat label="Team" value={latest.recommendation.recommendedBlock.teamName} />
                    <MiniStat label="Risk reduction" value={`−${latest.recommendation.recommendedBlock.riskReduction} pts`} />
                  </div>
                )}
              </Panel>

              <Panel title="Alternative plans" description="Fallback strategies ranked by the AI">
                <ul className="space-y-2">
                  {latest.recommendation.alternativePlans.map((plan, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-md border border-slate-100 p-2.5 text-sm text-slate-700">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">{String.fromCharCode(65 + i)}</span>
                      {plan}
                    </li>
                  ))}
                </ul>
              </Panel>

              {/* Decision */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="mb-3 text-xs text-slate-500">
                  <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-amber-600" />
                  RAILOPT recommends a revised schedule. <strong>Only an authorised operator can approve or reject.</strong> Signed in as {user?.name ?? "—"}.
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    permission="emergency.replan"
                    variant="success"
                    onClick={() => decide(latest.incident, "Approved")}
                    disabled={decidingIds.has(latest.incident.id) || approvedId === latest.incident.id}
                  >
                    {decidingIds.has(latest.incident.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {approvedId === latest.incident.id ? "Replan applied" : "Approve Replan"}
                  </ActionButton>
                  <ActionButton
                    permission="emergency.replan"
                    variant="outline"
                    onClick={() => decide(latest.incident, "Rejected")}
                    disabled={decidingIds.has(latest.incident.id) || approvedId === latest.incident.id}
                  >
                    <X className="h-4 w-4" /> Reject
                  </ActionButton>
                  <Button variant="ghost" onClick={() => setDetailIncident(latest.incident)}>
                    <Eye className="h-4 w-4" /> Review Details
                  </Button>
                  <Button asChild variant="link">
                    <a href="/approvals" className="inline-flex items-center gap-1">
                      Approval center <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {detailIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label={`Incident details for ${detailIncident.id}`} onClick={() => setDetailIncident(null)}>
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900">{detailIncident.id}</h3>
              </div>
              <button onClick={() => setDetailIncident(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500" aria-label="Close dialog">
                ✕
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <Row k="Type" v={detailIncident.type} />
              <Row k="Section" v={detailIncident.section} />
              <Row k="Severity" v={detailIncident.severity} />
              <Row k="Status" v={detailIncident.status} />
              <Row k="Detected" v={formatDateTime(detailIncident.detectedAt)} />
              <Row k="Affected trains" v={detailIncident.affectedTrains.join(", ") || "None listed"} />
              <Row k="Description" v={detailIncident.description} />
              <Row k="Recommended actions" v={detailIncident.recommendedActions.join(" · ") || "None"} />
              {detailIncident.recommendedBlock?.startTime && (
                <Row k="Proposed block window" v={`${new Date(detailIncident.recommendedBlock.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })} – ${new Date(detailIncident.recommendedBlock.endTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}`} />
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
    </AccessGuard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="line-clamp-1 text-sm font-semibold text-slate-900" title={value}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="truncate text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-xs font-medium text-slate-500">{k}</dt>
      <dd className="col-span-2 text-xs text-slate-700">{v}</dd>
    </div>
  );
}
