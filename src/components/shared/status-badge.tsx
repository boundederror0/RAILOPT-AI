import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "green" | "red" | "amber" | "blue" | "slate"> = {
  Open: "blue",
  New: "blue",
  Detected: "blue",
  "In Review": "blue",
  "Under Review": "blue",
  Approved: "green",
  "Approved & Scheduled": "green",
  Scheduled: "blue",
  "In Progress": "blue",
  Active: "blue",
  Running: "blue",
  Completed: "green",
  Done: "green",
  Resolved: "green",
  Mitigated: "green",
  Rejected: "slate",
  Cancelled: "slate",
  Pending: "amber",
  Escalated: "red",
  Critical: "red",
  Degraded: "amber",
  Operational: "green",
  "Out of Service": "red",
  "Under Maintenance": "blue",
  Held: "amber",
  Delayed: "amber",
  "At Station": "blue",
  Departed: "blue",
  Arrived: "green",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = STATUS_VARIANT[status] ?? "slate";
  return (
    <Badge variant={variant} className={cn("whitespace-nowrap", className)}>
      {status}
    </Badge>
  );
}