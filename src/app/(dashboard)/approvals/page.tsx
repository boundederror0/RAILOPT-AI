"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Check,
  X,
  SlidersHorizontal,
  Loader2,
  ShieldCheck,
  Star,
  Clock,
  ArrowRight,
  Radio,
} from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { api } from "@/lib/api";
import type { Approval, AuditLog } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { WorkflowBar } from "@/components/shared/workflow-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { AccessGuard, ActionButton } from "@/components/shared/access-guard";
import { cn, formatDateTime } from "@/lib/utils";

export default function ApprovalsPage() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useFetch<{ approvals: Approval[] }>(() => api.getApprovals());
  const { data: logsRes } = useFetch<{ logs: AuditLog[] }>(() => api.getAuditLogs());
const [decidingId, setDecidingId] = useState<string | null>(null);
  const [modifyTarget, setModifyTarget] = useState<Approval | null>(null);
  const [modifyNote, setModifyNote] = useState("");
  const [rejectTarget, setRejectTarget] = useState<Approval | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const approvals = data?.approvals ?? [];
  const pending = approvals.filter((a) => a.status === "Pending");
  const decided = approvals.filter((a) => a.status !== "Pending");
  const logs = logsRes?.logs ?? [];

  const recentlyApproved = useMemo(() => {
    const window = 10 * 60 * 1000;
    return decided.some(
      (a) => a.status === "Approved" && a.decidedAt && Date.now() - new Date(a.decidedAt).getTime() < window
    );
  }, [decided]);

const decide = async (a: Approval, decision: "Approved") => {
    setDecidingId(a.id);
    try {
      const res = await api.decideApproval<{ approval: Approval }>(a.id, { decision });
      toast(
        `Approved ${res.approval.title}`,
        {
          description: "The recommendation is now applied and the audit log is updated.",
          variant: "success",
        }
      );
      reload();
    } catch (e) {
      toast("Action failed", { description: e instanceof Error ? e.message : "Try again", variant: "error" });
    } finally {
      setDecidingId(null);
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    setDecidingId(rejectTarget.id);
    try {
      const res = await api.decideApproval<{ approval: Approval }>(rejectTarget.id, {
        decision: "Rejected",
        note: rejectNote,
      });
      toast(`Rejected ${res.approval.title}`, {
        description: "The recommendation was declined with a recorded reason; no operational change.",
        variant: "info",
      });
      setRejectTarget(null);
      setRejectNote("");
      reload();
    } catch (e) {
      toast("Action failed", { description: e instanceof Error ? e.message : "Try again", variant: "error" });
    } finally {
      setDecidingId(null);
    }
  };

  const submitModify = async () => {
    if (!modifyTarget) return;
    setDecidingId(modifyTarget.id);
    try {
      await api.decideApproval(modifyTarget.id, { decision: "Modified", note: modifyNote });
      toast("Recommendation modified", { description: "Marked as modified with your note. No automatic application.", variant: "success" });
      setModifyTarget(null);
      setModifyNote("");
      reload();
    } catch (e) {
      toast("Action failed", { description: e instanceof Error ? e.message : "Try again", variant: "error" });
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <AccessGuard requiredPermission="approvals.view">
      <div>
        <PageHeader
          title="Approval Center"
          subtitle="Every AI recommendation is reviewed and decided by an authorised human operator"
          actions={
            <Badge variant="outline" className="gap-1.5 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> {pending.length} pending · {decided.length} decided
            </Badge>
          }
        />

      <WorkflowBar current={5} />

      {recentlyApproved && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p className="flex items-start gap-1.5 text-xs text-emerald-800">
            <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Approved blocks are now reflected in the operational store and visible in the control room.
            </span>
          </p>
          <Button asChild variant="amber" size="sm">
            <Link href="/live-operations">
              View live operations <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel title="Pending AI recommendations" description="Awaiting your decision" contentClassName="p-0">
            {loading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-red-600">{error}</div>
            ) : pending.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No pending recommendations"
                  description="When AI generates a block plan, replan or risk alert, it lands here for approval."
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link href="/block-optimizer">
                        Open block optimizer <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pending.map((a) => (
                  <div key={a.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                          <Bot className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{a.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{a.description}</p>
                        </div>
                      </div>
                      <Badge variant="amber" className="shrink-0">Pending</Badge>
                    </div>

                    {/* Reason / Benefit / Impact / Confidence */}
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Fact icon={<Bot className="h-3.5 w-3.5 text-slate-400" />} label="Reason" value={a.benefit} />
                      <Fact icon={<Clock className="h-3.5 w-3.5 text-slate-400" />} label="Impact" value={a.impact} />
                      <div className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">Confidence</p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${a.confidence}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{a.confidence}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Star className="h-3 w-3 text-amber-500" />
                        Recommended by RAILOPT AI · {a.type} · created {formatDateTime(a.createdAt)}
                      </p>
                      <div className="flex items-center gap-2">
                        <ActionButton
                          permission="approvals.approve"
                          variant="success"
                          size="sm"
                          onClick={() => decide(a, "Approved")}
                          disabled={decidingId === a.id}
                        >
                          {decidingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
                        </ActionButton>
<ActionButton
                          permission="approvals.approve"
                          variant="outline"
                          size="sm"
                          onClick={() => { setRejectTarget(a); setRejectNote(""); }}
                          disabled={decidingId === a.id}
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </ActionButton>
                        <Button variant="ghost" size="sm" onClick={() => { setModifyTarget(a); setModifyNote(""); }}>
                          <SlidersHorizontal className="h-3.5 w-3.5" /> Modify
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Decided history + audit trail */}
        <div className="space-y-4 lg:col-span-4">
          <Panel title="Recent decisions" contentClassName="p-0">
            <div className="divide-y divide-slate-100">
              {decided.slice(0, 5).map((a) => (
                <div key={a.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-xs font-medium text-slate-700">{a.title}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    by {a.decidedBy} · {a.decidedAt ? formatDateTime(a.decidedAt) : ""}
                  </p>
                </div>
              ))}
              {decided.length === 0 && <p className="p-4 text-xs text-slate-400">No decisions yet.</p>}
            </div>
          </Panel>

          <Panel title="Audit trail" description="Every approval action, who and when">
            <div className="scrollbar-thin max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {logs.map((log) => (
                <div key={log.id} className="rounded-md border border-slate-100 bg-slate-50/50 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wide", log.action.includes("APPROVE") ? "text-emerald-600" : log.action.includes("REJECT") ? "text-red-600" : log.action.includes("MODIF") ? "text-amber-600" : "text-slate-500")}>
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDateTime(log.timestamp)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600">{log.details}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">by {log.performedBy} · {log.entity} {log.entityId}</p>
                </div>
              ))}
              {logs.length === 0 && <p className="text-xs text-slate-400">No audit entries.</p>}
            </div>
          </Panel>
        </div>
      </div>

      {/* Modify dialog */}
      <Dialog open={!!modifyTarget} onOpenChange={(o) => !o && setModifyTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify recommendation</DialogTitle>
            <DialogDescription>
              Mark this recommendation as modified and record what changed. Nothing is applied automatically.
            </DialogDescription>
          </DialogHeader>
          {modifyTarget && (
            <div className="space-y-3">
              <div className="rounded-md bg-slate-50 p-3 text-xs">
                <p className="font-medium text-slate-800">{modifyTarget.title}</p>
                <p className="mt-1 text-slate-500">{modifyTarget.description}</p>
              </div>
              <Textarea
                value={modifyNote}
                onChange={(e) => setModifyNote(e.target.value)}
                placeholder="e.g. Shift block to 22:00, reduce to 45 minutes, add second gang…"
                aria-label="Modification note"
              />
            </div>
          )}
<DialogFooter>
            <Button variant="ghost" onClick={() => setModifyTarget(null)}>Cancel</Button>
            <Button onClick={submitModify} disabled={decidingId === modifyTarget?.id}>
              {decidingId === modifyTarget?.id && <Loader2 className="h-4 w-4 animate-spin" />}
              Save modification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject recommendation</DialogTitle>
            <DialogDescription>
              A reason is required so the rejection can be traced in the audit log.
            </DialogDescription>
          </DialogHeader>
          {rejectTarget && (
            <div className="space-y-3">
              <div className="rounded-md bg-slate-50 p-3 text-xs">
                <p className="font-medium text-slate-800">{rejectTarget.title}</p>
                <p className="mt-1 text-slate-500">{rejectTarget.description}</p>
              </div>
              <Textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g. Block conflicts with planned patrol train, re-run with updated inputs…"
                aria-label="Rejection note"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="outline" onClick={submitReject} disabled={decidingId === rejectTarget?.id || !rejectNote.trim()}>
              {decidingId === rejectTarget?.id && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AccessGuard>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50/60 p-2.5">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-400">
        {icon} {label}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{value}</p>
    </div>
  );
}
