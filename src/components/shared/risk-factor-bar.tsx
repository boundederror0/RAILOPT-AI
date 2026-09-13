import React from "react";
import { cn } from "@/lib/utils";

export interface RiskFactorBarProps {
  factor: string;
  impact: number;
  description?: string;
  maxImpact?: number;
}

export function RiskFactorBar({ factor, impact, description, maxImpact }: RiskFactorBarProps) {
  const max = maxImpact ?? Math.max(impact, 1);
  const pct = Math.max(4, Math.round((impact / max) * 100));
  const barColor = impact / max > 0.5 ? "bg-red-500" : impact / max > 0.25 ? "bg-amber-500" : "bg-blue-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{factor}</span>
        <span className="font-semibold text-slate-500">{impact.toFixed(1)} pts</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all duration-700", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {description && <p className="text-[11px] text-slate-400">{description}</p>}
    </div>
  );
}