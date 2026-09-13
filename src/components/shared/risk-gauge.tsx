"use client";

import React from "react";
import { riskCategory } from "@/lib/utils";

interface RiskGaugeProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

function colorFor(score: number): string {
  if (score >= 80) return "#b91c1c";
  if (score >= 40) return "#b45309";
  if (score >= 20) return "#1d4ed8";
  return "#15803d";
}

export function RiskGauge({ score, size = 160, showLabel = true }: RiskGaugeProps) {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);
  const color = colorFor(clamped);
  const category = riskCategory(clamped);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 160 160" role="img" aria-label={`Asset risk score ${score} out of 100, category ${category}`}>
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 80 80)"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {clamped}
        </span>
        {showLabel && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {category}
          </span>
        )}
      </div>
    </div>
  );
}