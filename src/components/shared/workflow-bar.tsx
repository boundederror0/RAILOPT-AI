import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface WorkflowContext {
  asset?: string;
  block?: string;
}

const STEP_DEFS: { label: string }[] = [
  { label: "Request" },
  { label: "Analyze" },
  { label: "Plan block" },
  { label: "Impact" },
  { label: "Simulate" },
  { label: "Approve" },
  { label: "Operate" },
];

function hrefFor(index: number, context: WorkflowContext | undefined): string {
  switch (index) {
    case 0:
      return "/maintenance-requests";
    case 1:
      return context?.asset ? `/ai-analysis?asset=${context.asset}` : "/ai-analysis";
    case 2:
      return context?.asset ? `/block-optimizer?asset=${context.asset}` : "/block-optimizer";
    case 3:
      return context?.block ? `/train-impact?block=${context.block}` : "/train-impact";
    case 4:
      return context?.block ? `/what-if?block=${context.block}` : "/what-if";
    case 5:
      return "/approvals";
    default:
      return "/live-operations";
  }
}

export function WorkflowBar({
  current,
  context,
  className,
}: {
  current: number;
  context?: WorkflowContext;
  className?: string;
}) {
  return (
    <nav
      aria-label="Decision workflow"
      className={cn(
        "scrollbar-thin mb-4 flex items-center gap-0.5 overflow-x-auto rounded-lg border border-slate-200 bg-white px-3 py-2",
        className
      )}
    >
      {STEP_DEFS.map((s, i) => {
        const isCurrent = i === current;
        const isDone = i < current;
        const href = hrefFor(i, context);
        const inner = (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
              isCurrent
                ? "bg-amber-500 text-white shadow-sm"
                : isDone
                  ? "text-slate-700 hover:bg-slate-100"
                  : "text-slate-400"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                isCurrent ? "bg-white/25" : isDone ? "bg-slate-200 text-slate-600" : "bg-slate-100 text-slate-400"
              )}
            >
              {i + 1}
            </span>
            <span>{s.label}</span>
          </span>
        );
        return (
          <React.Fragment key={s.label}>
            {isCurrent ? (
              <span aria-current="step" title={`${i + 1}. ${s.label} — you are here`}>
                {inner}
              </span>
            ) : (
              <Link href={href} title={`${i + 1}. ${s.label}`} aria-label={`Go to ${s.label}`}>
                {inner}
              </Link>
            )}
            {i < STEP_DEFS.length - 1 && (
              <span aria-hidden className="shrink-0 text-[10px] text-slate-300">›</span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}