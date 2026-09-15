"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { hasPermission } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [activeIncidents, setActiveIncidents] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const canViewApprovals = hasPermission("approvals.view");
    const canViewIncidents =
      hasPermission("emergency.view") || hasPermission("live_operations.view");
    if (!canViewApprovals && !canViewIncidents) {
      setPendingApprovals(0);
      setActiveIncidents(0);
      return;
    }
    const load = () => {
      const jobs: Promise<{ approvals?: { status: string }[]; incidents?: { status: string }[] }>[] = [];
      if (canViewApprovals) {
        jobs.push(api.getApprovals<{ approvals: { status: string }[] }>());
      }
      if (canViewIncidents) {
        jobs.push(api.getIncidents<{ incidents: { status: string }[] }>());
      }
      Promise.all(jobs)
        .then((results) => {
          if (!mounted) return;
          const approvals = results.find((r) => r.approvals);
          const incidents = results.find((r) => r.incidents);
          setPendingApprovals(
            approvals?.approvals?.filter((a) => a.status === "Pending").length ?? 0
          );
          setActiveIncidents(
            incidents?.incidents?.filter(
              (i) => i.status !== "Resolved" && i.status !== "Mitigated"
            ).length ?? 0
          );
        })
        .catch(() => {
          if (mounted) {
            setPendingApprovals(0);
            setActiveIncidents(0);
          }
        });
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar pendingCount={pendingApprovals} />
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="bg-slate-950/60"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="relative bg-sidebar">
            <Sidebar pendingCount={pendingApprovals} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          pendingApprovals={pendingApprovals}
          activeIncidents={activeIncidents}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className={cn("mx-auto w-full max-w-[1400px] p-4 lg:p-6")}>{children}</div>
        </main>
      </div>
    </div>
  );
}