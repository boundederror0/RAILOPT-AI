"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrainCircuit, Loader2, Lightbulb, Clock, Users, ShieldCheck, ArrowRight } from "lucide-react";
import { useFetch } from "@/lib/use-fetch";
import { api } from "@/lib/api";
import type { Asset } from "@/lib/types";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { WorkflowBar } from "@/components/shared/workflow-bar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RiskGauge } from "@/components/shared/risk-gauge";
import { RiskFactorBar } from "@/components/shared/risk-factor-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { HistoricalContextPanel } from "@/components/historical/historical-context-panel";
import { AccessGuard } from "@/components/shared/access-guard";

interface AnalysisResult {
  assetId: string;
  assetName: string;
  assetType: string;
  section: string;
  location: string;
  riskScore: number;
  riskCategory: string;
  confidence: number;
  factors: { factor: string; impact: number; description: string }[];
  recommendedAction: string;
  model: string;
  inputs: Record<string, number | string>;
  estimatedMaintenanceHours: number;
  requiredResources: string[];
  createdAt: string;
}

export default function AiAnalysisPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-400">Loading AI analysis…</div>}>
      <AiAnalysisContent />
    </Suspense>
  );
}

function AiAnalysisContent() {
  const params = useSearchParams();
  const [selectedAsset, setSelectedAsset] = useState<string>(
    (params.get("asset") as string) ?? ""
  );
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

const { data: assetsRes, loading } = useFetch<{ assets: Asset[] }>(() => api.getAssets());
  const assets = useMemo(() => assetsRes?.assets ?? [], [assetsRes]);

  const asset = useMemo(() => assets.find((a) => a.id === selectedAsset), [assets, selectedAsset]);

  const runAnalysis = async () => {
    if (!selectedAsset) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await api.analyzeRisk<{ analysis: AnalysisResult }>(selectedAsset);
      setAnalysis(res.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <AccessGuard requiredPermission="ai-analysis.view">
      <div>
        <PageHeader
          title="AI Risk Analysis"
          subtitle="Explainable asset risk scoring from age, condition, failure history and usage"
          actions={
            <Badge variant="outline" className="gap-1.5 py-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Model: deterministic scoring engine v1 — no real ML model running
            </Badge>
          }
        />

      <WorkflowBar current={1} context={{ asset: analysis?.assetId || selectedAsset || undefined }} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Controls */}
        <Panel title="Analyze an asset" description="Choose an asset to run the explainable risk model" className="lg:col-span-4">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="asset-select" className="text-sm font-medium text-slate-700">
                Asset
              </label>
              {loading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger id="asset-select">
                    <SelectValue placeholder="Select asset to analyze" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="max-h-72">
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} — {a.location}
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              )}
            </div>

            {asset && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Meta label="Type" value={asset.type} />
                <Meta label="Condition" value={asset.condition} />
                <Meta label="Age" value={`${asset.ageYears} yrs`} />
                <Meta label="Section" value={asset.section} />
              </div>
            )}

            <Button
              className="w-full"
              variant="amber"
              onClick={runAnalysis}
              disabled={!selectedAsset || analyzing}
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
              {analyzing ? "Analyzing…" : "Analyze Asset"}
            </Button>

            {error && (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                {error}
              </p>
            )}

            <div className="rounded-md bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              <p className="mb-1 font-semibold text-slate-700">How the score works</p>
              <p>
                The model blends condition (26%), failure frequency (22%), age (16%), maintenance gap (16%), and usage/incident history (20%). Each factor contribution is shown so every score is auditable.
              </p>
            </div>
          </div>
        </Panel>

        {/* Results */}
        <div className="lg:col-span-8">
          {!analysis ? (
            <EmptyState
              title="No analysis yet"
              description="Select an asset and run the analysis to see an explainable risk score with contributing factors."
              className="h-full min-h-[300px]"
            />
          ) : (
            <div className="space-y-4">
              <Panel title="Risk score" description={`${analysis.assetName} · ${analysis.section}`}>
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <RiskGauge score={analysis.riskScore} size={170} />
                  <div className="flex-1 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={analysis.riskScore >= 80 ? "red" : analysis.riskScore >= 60 ? "amber" : "blue"}>
                        {analysis.riskCategory}
                      </Badge>
                      <Badge variant="outline">Confidence {analysis.confidence}%</Badge>
                      <Badge variant="ghost" className="font-mono">{analysis.model}</Badge>
                    </div>
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Recommended action</p>
                        <p className="mt-0.5 text-sm text-slate-800">{analysis.recommendedAction}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Info icon={<Clock className="h-3.5 w-3.5" />} label="Est. maintenance" value={`${analysis.estimatedMaintenanceHours}h`} />
                      <Info icon={<Users className="h-3.5 w-3.5" />} label="Resources" value={analysis.requiredResources.join(", ")} />
                    </div>
                  </div>
                </div>
              </Panel>

              <HistoricalContextPanel section={analysis.section} />

              <Panel title="Key contributing factors" description="Higher bars contribute more to the score">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {analysis.factors.map((f) => (
                    <RiskFactorBar
                      key={f.factor}
                      factor={f.factor}
                      impact={f.impact}
                      description={f.description}
                      maxImpact={analysis.factors[0].impact}
                    />
                  ))}
                </div>
              </Panel>

              <Panel title="Model inputs" description="Raw values used by the engine">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                  {Object.entries(analysis.inputs).map(([k, v]) => (
                    <div key={k} className="rounded-md border border-slate-100 bg-slate-50/60 px-2.5 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">{k}</p>
                      <p className="truncate text-sm font-medium text-slate-800">{v}</p>
                    </div>
                  ))}
                </div>
              </Panel>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-3">
                <p className="max-w-xl text-xs text-slate-500">
                  This analysis is <strong>static</strong> — scores update when you run the model again. Historical
                  context is advisory only and does not drive the optimizer.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/maintenance-requests?asset=${analysis.assetId}`}>
                      Create maintenance request
                    </Link>
                  </Button>
                  <Button asChild variant="amber" size="sm">
                    <Link href={`/block-optimizer?asset=${analysis.assetId}`}>
                      Plan maintenance block <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </AccessGuard>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50/60 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="truncate text-xs font-medium text-slate-700">{value}</p>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-slate-100 px-2.5 py-2">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-xs font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}
