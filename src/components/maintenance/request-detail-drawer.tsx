"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Layers,
  MapPin,
  AlertTriangle,
  History,
  Wrench,
  Clock,
  Users,
  Train as TrainIcon,
  Activity,
  BrainCircuit,
  CalendarRange,
} from "lucide-react";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { RiskGauge } from "@/components/shared/risk-gauge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { priorityColor } from "@/lib/utils";
import { windowReasoningFor } from "@/lib/window-reasoning";
import type { MaintenanceRequest } from "@/lib/types";

interface RequestDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MaintenanceRequest | null;
  onEdit?: () => void;
}

export function RequestDetailDrawer({ open, onOpenChange, request, onEdit }: RequestDetailDrawerProps) {
  const [trains, setTrains] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !request) return;
    api.getTrains<{ trains: { number: string }[] }>().then((r) => {
      const nums = new Set(request.affectedTrains);
      const named = r.trains.filter((t) => nums.has(t.number)).map((t) => t.number);
      setTrains(named.length ? named : request.affectedTrains.slice(0, 3));
    }).catch(() => setTrains(request.affectedTrains.slice(0, 3)));
  }, [open, request]);

  if (!request) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <div className="flex items-start justify-between gap-2 pr-6">
            <div className="min-w-0">
              <DrawerTitle className="flex items-center gap-2">
                <span className="font-mono text-sm text-slate-400">{request.id}</span>
              </DrawerTitle>
              <DrawerDescription className="mt-1">{request.assetName}</DrawerDescription>
            </div>
            <StatusBadge status={request.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge className={priorityColor(request.priority)}>{request.priority} priority</Badge>
            <Badge variant="outline">{request.department}</Badge>
            <Badge variant="secondary">{request.requestedDate}</Badge>
          </div>
        </DrawerHeader>

        <DrawerBody className="scrollbar-thin">
          <div className="space-y-5">
            {/* Asset info */}
            <section aria-label="Asset information">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Building2 className="h-3.5 w-3.5" /> Asset information
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Info label="Asset" value={request.assetName} />
                <Info label="Type" value={request.assetType} />
                <Info label="Section" value={request.section} />
                <Info label="Current condition" value={request.currentCondition} />
                <div className="col-span-2 flex items-center gap-1.5 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" /> {request.location}
                </div>
              </div>
            </section>

            <Separator />

            {/* Issue */}
            <section aria-label="Issue">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Layers className="h-3.5 w-3.5" /> Issue description
              </h3>
              <p className="text-sm font-medium text-slate-800">{request.issue}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{request.description}</p>
            </section>

            <Separator />

            {/* History */}
            <section aria-label="History">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <History className="h-3.5 w-3.5" /> Asset history
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Info label="Historical failures" value={`${request.historicalFailures} recorded`} />
                <Info label="Maintenance backlog" value={`${Math.max(0, request.historicalFailures - 2)} pending job card(s)`} />
                <Info label="Maintenance cycle" value={`Every ${Math.max(3, 6 - request.historicalFailures)} months`} />
                <Info label="Prior incidents" value={`${request.historicalFailures} related`} />
              </div>
            </section>

            <Separator />

            {/* AI risk */}
            <section aria-label="AI risk">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Activity className="h-3.5 w-3.5" /> AI risk assessment
              </h3>
              <div className="flex items-center gap-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                <RiskGauge score={request.riskScore} size={92} />
                <div className="flex-1 text-xs text-slate-600">
                  <p className="font-medium text-slate-800">
                    {request.riskScore >= 80 ? "Critical — intervene today" : request.riskScore >= 60 ? "High — prioritize this week" : "Monitor"}
                  </p>
                  <p className="mt-1">
                    Risk reduced by ~{Math.round(request.riskScore * 0.6)} points after the recommended block completes.
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-slate-400">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    Estimated maintenance: {request.estimatedDuration} min
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Maintenance window reasoning */}
            <section aria-label="Maintenance window reasoning">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Clock className="h-3.5 w-3.5" /> Why this maintenance window?
              </h3>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-medium text-slate-800">{windowReasoningFor(request).headline}</p>
                <ul className="mt-2 space-y-1.5">
                  {windowReasoningFor(request).points.map((p) => (
                    <li key={p} className="flex items-start gap-1.5">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Final slot is chosen by the block optimizer, which explains its selection.
              </p>
            </section>

            <Separator />

            {/* Resources */}
            <section aria-label="Required resources">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Users className="h-3.5 w-3.5" /> Required resources
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {request.requiredResources.map((r) => (
                  <Badge key={r} variant="outline">{r}</Badge>
                ))}
              </div>
            </section>

            <Separator />

            {/* Affected trains */}
            <section aria-label="Affected trains">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <TrainIcon className="h-3.5 w-3.5" /> Affected trains (estimated)
              </h3>
              {trains.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {trains.map((t) => (
                    <Badge key={t} variant="secondary" className="font-mono">{t}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">None estimated at this stage.</p>
              )}
              <p className="mt-2 text-[11px] text-slate-400">
                Precise impact is computed after the block optimizer assigns a time window.
              </p>
            </section>
          </div>
        </DrawerBody>

        <DrawerFooter className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" /> {Math.round(request.estimatedDuration / 60 * 10) / 10} h block
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="amber" size="sm">
              <Link href={`/ai-analysis?asset=${request.assetId}`}>
                <BrainCircuit className="h-3.5 w-3.5" /> Run AI analysis
              </Link>
            </Button>
            {["Open", "In Review", "Approved"].includes(request.status) ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/block-optimizer?request=${request.id}`}>
                  <CalendarRange className="h-3.5 w-3.5" /> Plan in optimizer
                </Link>
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Wrench className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50/60 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="truncate text-xs font-medium text-slate-700">{value}</p>
    </div>
  );
}