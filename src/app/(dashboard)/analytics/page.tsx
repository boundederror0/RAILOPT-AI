"use client";

import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Activity, Wrench, AlertOctagon } from "lucide-react";
import type { AnalyticsData } from "@/lib/ai/analytics";
import { PageHeader } from "@/components/shared/page-header";
import { Panel } from "@/components/shared/panel";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Range = "7d" | "30d" | "90d";
const RANGES: Range[] = ["7d", "30d", "90d"];

const PIE_COLORS = ["#0e2a47", "#7a2d2b", "#15803d", "#b45309", "#b91c1c"];

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getAnalytics<AnalyticsData>(range)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e instanceof Error ? e.message : "Failed to load analytics"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [range]);

  const months = data?.completionRate ?? [];
  const trend = data?.availabilityTrend ?? [];
  const avgAvailability = trend.reduce((s, d) => s + d.availability, 0) / (trend.length || 1);
  const trendDelta = (() => {
    if (trend.length < 2) return null;
    const half = Math.floor(trend.length / 2);
    if (half === 0) return null;
    const first = trend.slice(0, half).reduce((s, d) => s + d.availability, 0) / half;
    const second = trend.slice(-half).reduce((s, d) => s + d.availability, 0) / half;
    return second - first;
  })();

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Operational performance, workload, risk and availability insights"
        actions={
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                  range === r ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center text-sm text-red-600">{error}</div>
      ) : !data ? (
        <EmptyState title="No data" description="Unable to load analytics." />
      ) : (
        <div className="space-y-4">
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi icon={<TrendingUp className="h-4 w-4 text-slate-500" />} label={`Avg availability (${range})`} value={`${Math.round(avgAvailability)}%`} trend={trendDelta === null ? "over the selected window" : `${trendDelta >= 0 ? "▲" : "▼"} ${Math.abs(trendDelta).toFixed(1)} pts vs prior half`} />
            <Kpi icon={<Wrench className="h-4 w-4 text-slate-500" />} label="Avg request completion" value={`${Math.round(months.reduce((s, m) => s + m.completion, 0) / (months.length || 1))}%`} trend={`${months.length} months sampled`} />
            <Kpi icon={<Activity className="h-4 w-4 text-slate-500" />} label="Latest avg delay" value={`${data.avgDelay.at(-1)?.delay ?? 0} min`} trend={`last of ${data.avgDelay.length} sampled days`} />
            <Kpi icon={<AlertOctagon className="h-4 w-4 text-slate-500" />} label="Critical assets" value={String(data.criticalAssetCount.reduce((s, c) => s + c.count, 0))} trend={`across ${data.criticalAssetCount.length} categories`} />
          </div>

          {/* Availability + delay */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Asset availability trend" description={`Daily weighted availability over last ${range} — simulated`}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.availabilityTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="avail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#15803d" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#15803d" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit="%" domain={[84, 100]} />
                    <Tooltip formatter={(v) => [`${v}%`, "Availability"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Area type="monotone" dataKey="availability" stroke="#15803d" strokeWidth={2} fill="url(#avail)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Average train delay" description="Minutes behind schedule across the division">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.avgDelay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit="m" />
                    <Tooltip formatter={(v) => [`${v} min`, "Avg delay"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} cursor={{ fill: "#f1f5f9" }} />
                    <Bar dataKey="delay" fill="#b45309" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          {/* Completion + disruption */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Maintenance completion rate" description="Requests closed vs raised per month">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.completionRate} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="completion" name="Completion %" stroke="#0e2a47" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="newRequests" name="New requests" stroke="#7a2d2b" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Disruption events" description="Disrupted and cancelled trains">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.disruptionTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="disc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#b91c1c" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="trains" name="Disrupted" stroke="#b91c1c" fill="url(#disc)" />
                    <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke="#0e2a47" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          {/* Pie row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel title="Block window utilisation">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.blockUtilization} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={3}>
                      {data.blockUtilization.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Risk distribution by asset">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.riskDistribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={3}>
                      {data.riskDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Critical assets by category">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.criticalAssetCount} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} cursor={{ fill: "#f1f5f9" }} />
                    <Bar dataKey="count" name="Assets" fill="#b91c1c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>

          <div className="flex justify-center">
            <Badge variant="outline" className="py-1">DEMO DATA · All series are simulated for illustration.</Badge>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-50">{icon}</span>
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{trend}</p>
    </div>
  );
}