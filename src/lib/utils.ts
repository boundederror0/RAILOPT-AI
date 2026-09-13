import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function minutesToHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function generateId(prefix: string): string {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${num}`;
}

export function riskCategory(score: number): string {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  if (score >= 20) return "Low";
  return "Minimal";
}

export function riskColor(score: number): string {
  if (score >= 80) return "text-red-600 bg-red-50";
  if (score >= 40) return "text-amber-600 bg-amber-50";
  if (score >= 20) return "text-blue-600 bg-blue-50";
  return "text-green-600 bg-green-50";
}

export function priorityColor(p: string): string {
  switch (p) {
    case "Critical":
      return "bg-red-100 text-red-700";
    case "High":
      return "bg-amber-100 text-amber-700";
    case "Medium":
      return "bg-blue-100 text-blue-700";
    case "Low":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function statusColor(s: string): string {
  switch (s) {
    case "Open":
    case "New":
    case "Detected":
      return "bg-blue-100 text-blue-700";
    case "In Review":
    case "Under Review":
      return "bg-blue-100 text-blue-700";
    case "Approved":
    case "Approved & Scheduled":
      return "bg-green-100 text-green-700";
    case "Scheduled":
      return "bg-blue-100 text-blue-700";
    case "In Progress":
    case "Active":
    case "Running":
      return "bg-blue-100 text-blue-700";
    case "Completed":
    case "Done":
      return "bg-green-100 text-green-700";
    case "Rejected":
    case "Cancelled":
      return "bg-slate-100 text-slate-600";
    case "Pending":
      return "bg-amber-100 text-amber-700";
    case "Resolved":
    case "Mitigated":
      return "bg-green-100 text-green-700";
    case "Escalated":
    case "Critical":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}
