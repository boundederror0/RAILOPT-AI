"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import type { Asset, MaintenanceRequest, Priority } from "@/lib/types";

interface RequestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId?: string | null;
  request?: MaintenanceRequest | null;
  onSaved: () => void;
}

interface AnalysisResult {
  riskScore: number;
  riskCategory: string;
  factors: { factor: string; impact: number }[];
}

export function RequestFormDialog({ open, onOpenChange, assetId, request, onSaved }: RequestFormDialogProps) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetIdValue, setAssetIdValue] = useState(assetId ?? "");
  const [issue, setIssue] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setAnalysis(null);
      setAssetIdValue(assetId ?? request?.assetId ?? "");
      setIssue(request?.issue ?? "");
      setDescription(request?.description ?? "");
      setPriority(request?.priority ?? "Medium");
      api.getAssets<{ assets: Asset[] }>().then((r) => setAssets(r.assets)).catch(() => setAssets([]));
    }
  }, [open, assetId, request]);

  const selectedAsset = useMemo(() => assets.find((a) => a.id === assetIdValue), [assets, assetIdValue]);

  const runAnalysis = async () => {
    if (!selectedAsset) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await api.analyzeRisk<{ analysis: AnalysisResult }>(selectedAsset.id);
      setAnalysis(res.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (!assetIdValue) return setError("Please select an asset.");
    if (issue.trim().length < 4) return setError("Issue description is required (min 4 characters).");
    if (description.trim().length < 8) return setError("Detailed description is required (min 8 characters).");

    setSaving(true);
    try {
      await api.createRequest<{ request: MaintenanceRequest; analysis: AnalysisResult }>({
        assetId: assetIdValue,
        issue,
        description,
        priority,
      });
      toast("Maintenance request created", {
        description: "The request has been logged and routed to the planning queue.",
        variant: "success",
      });
      onOpenChange(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create request.");
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    if (!request) return;
    setError(null);
    setSaving(true);
    try {
      await api.updateRequest(request.id, { issue, description, priority });
      toast("Request updated", { variant: "success" });
      onOpenChange(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{request ? `Edit ${request.id}` : "New Maintenance Request"}</DialogTitle>
          <DialogDescription>
            AI risk scoring runs as soon as an asset is selected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="asset">Asset</Label>
            <Select value={assetIdValue} onValueChange={(v) => { setAssetIdValue(v); setAnalysis(null); }}>
              <SelectTrigger id="asset">
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent>
                <div className="max-h-64">
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} — {a.location}
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>
          </div>

          {selectedAsset && (
            <button
              type="button"
              onClick={runAnalysis}
              disabled={analyzing}
              className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <span className="text-slate-600">
                Run AI risk analysis on <span className="font-medium text-slate-800">{selectedAsset.name}</span>
              </span>
              {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" /> : <span className="font-medium text-amber-600">Analyze</span>}
            </button>
          )}

          {analysis && (
            <div className="flex items-center gap-4 rounded-md border border-slate-200 bg-amber-50/60 p-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{analysis.riskScore}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">AI risk</p>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-700">Category: {analysis.riskCategory}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Top factor: {analysis.factors[0]?.factor} ({analysis.factors[0]?.impact.toFixed(1)} pts)
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="issue">Issue</Label>
            <Input id="issue" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="e.g. Track circuit repeat failures" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Detailed description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the observed fault, when it was noticed and any immediate actions taken." />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={request ? submitEdit : submit} disabled={saving || analyzing}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {request ? "Save changes" : "Create request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}