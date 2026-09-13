"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; direction: "up" | "down" | "flat"; good?: boolean };
  className?: string;
}

export function KpiCard({ label, value, sub, icon: Icon, trend, className }: KpiCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <CardContent className="flex items-start justify-between p-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icon className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">{label}</span>
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-900">{value}</div>
          {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
        </div>
        {trend && (
          <span
            className={cn(
              "mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              trend.direction === "up" && trend.good ? "bg-emerald-100 text-emerald-700"
              : trend.direction === "up" ? "bg-red-100 text-red-700"
              : trend.direction === "down" && trend.good ? "bg-emerald-100 text-emerald-700"
              : trend.direction === "down" ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500"
            )}
          >
            {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "•"} {Math.abs(trend.value)}%
          </span>
        )}
      </CardContent>
    </Card>
  );
}