"use client";

import React, { useMemo } from "react";
import type { TrainImpact } from "@/lib/ai/train-impact";

const PAD_MINUTES = 60;

function toMinutes(simTime: string): number {
  const d = new Date(simTime);
  return d.getHours() * 60 + d.getMinutes();
}

interface BlockTimelineProps {
  blockStart: string;
  blockEnd: string;
  impacts: TrainImpact[];
  width?: number;
}

function severityColor(sev: string): string {
  switch (sev) {
    case "Minor":
      return "#1d4ed8";
    case "Moderate":
      return "#b45309";
    case "High":
      return "#b45309";
    case "Severe":
      return "#b91c1c";
    default:
      return "#64748b";
  }
}

export function BlockTimeline({ blockStart, blockEnd, impacts, width = 800 }: BlockTimelineProps) {
  const startMin = Math.max(0, toMinutes(blockStart) - PAD_MINUTES);
  const endMin = toMinutes(blockEnd) + PAD_MINUTES;
  const blockSMin = toMinutes(blockStart);
  const blockEMin = toMinutes(blockEnd);

  const span = Math.max(120, endMin - startMin);
  const x = (min: number) => ((min - startMin) / span) * width;

  const laneHeight = 34;
  const headerHeight = 34;
  const height = headerHeight + Math.max(1, impacts.length) * laneHeight + 34;

  const hourTicks: number[] = [];
  for (let m = Math.ceil(startMin / 60) * 60; m <= startMin + span; m += 60) {
    hourTicks.push(m);
  }

  const laneY = (index: number) => headerHeight + index * laneHeight;
  const blockX = x(blockSMin);
  const blockW = Math.max(4, x(blockEMin) - blockX);
  const blockBottom = height - 22;

  return (
    <div className="overflow-x-auto">
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ minWidth: 640 }}
        role="img"
        aria-label={`Maintenance block ${blockStart} to ${blockEnd} with affected trains`}
      >
        <title>Timeline — block {blockStart.slice(11, 16)} to {blockEnd.slice(11, 16)}</title>

        <rect x={0} y={0} width={width} height={height} fill="#f8fafc" />

        {/* Hour ticks */}
        {hourTicks.map((m) => (
          <g key={m}>
            <line x1={x(m)} y1={0} x2={x(m)} y2={height} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={x(m) + 3} y={14} fontSize={9} fill="#64748b">
              {String(Math.floor(m / 60)).padStart(2, "0")}:00
            </text>
          </g>
        ))}

        {/* Maintenance block band */}
        <rect
          x={blockX}
          y={headerHeight - 10}
          width={blockW}
          height={blockBottom - headerHeight + 10}
          rx={4}
          fill="#fef3c7"
          stroke="#b45309"
          strokeWidth={1}
        />
        <text x={blockX + 5} y={headerHeight + 12} fontSize={9} fontWeight={600} fill="#b45309">
          BLOCK {blockStart.slice(11, 16)}–{blockEnd.slice(11, 16)}
        </text>

        {/* Time axis */}
        <line x1={0} y1={height - 20} x2={width} y2={height - 20} stroke="#94a3b8" strokeWidth={1} />

        {/* Train lanes */}
        {impacts.slice(0, 8).map((imp, i) => {
          const startMinT = Math.max(startMin, toMinutes(imp.timeWindowStart));
          const endMinT = Math.min(endMin, toMinutes(imp.timeWindowEnd));
          const trainStart = x(startMinT);
          const trainWidth = Math.max(6, x(endMinT) - x(startMinT));
          const y = laneY(i);
          const color = severityColor(imp.delaySeverity);

          const conflictStart = Math.max(startMin, toMinutes(blockStart), startMinT);
          const conflictEnd = Math.min(endMin, toMinutes(blockEnd), endMinT);
          const conflictW = Math.max(0, x(conflictEnd) - x(conflictStart));

          return (
            <g key={`${imp.number}-${i}`}>
              {/* conflict shading */}
              {conflictW > 0 && (
                <rect x={x(conflictStart)} y={y - 4} width={conflictW} height={laneHeight - 4} fill={color} opacity={0.14} rx={2} />
              )}
              <line
                x1={trainStart}
                y1={y + laneHeight / 2}
                x2={trainStart + trainWidth}
                y2={y + laneHeight / 2}
                stroke={color}
                strokeWidth={2.5}
              />
              <circle cx={trainStart + trainWidth} cy={y + laneHeight / 2} r={3} fill={color} />
              <text x={Math.max(4, trainStart)} y={y + laneHeight / 2 - 6} fontSize={9} fontWeight={600} fill="#0f172a">
                {imp.number} {imp.name}
              </text>
              <text x={Math.max(4, trainStart)} y={y + laneHeight / 2 + 12} fontSize={8} fill="#64748b">
                {imp.timeWindowStart.slice(11, 16)}–{imp.timeWindowEnd.slice(11, 16)} · delay {imp.expectedDelay} min · {imp.delaySeverity}
              </text>
            </g>
          );
        })}

        {impacts.length === 0 && (
          <text x={20} y={headerHeight + 20} fontSize={11} fill="#64748b">
            No trains overlap with this block window.
          </text>
        )}
      </svg>
    </div>
  );
}

export function useTimeline(blockStart: string, blockEnd: string, impacts: TrainImpact[]) {
  return useMemo(() => ({ start: blockStart, end: blockEnd, impacts }), [blockStart, blockEnd, impacts]);
}