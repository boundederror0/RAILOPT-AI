"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Circle, User, ChevronDown, Menu, LogOut, Settings, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { scopeDisplay } from "@/lib/rbac";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TopbarProps {
  pendingApprovals: number;
  activeIncidents: number;
  onToggleSidebar?: () => void;
}

export function Topbar({ pendingApprovals, activeIncidents, onToggleSidebar }: TopbarProps) {
  const [status, setStatus] = useState<{ healthy: boolean; label: string }>({
    healthy: true,
    label: "All systems nominal",
  });
  const { user, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let mounted = true;
    api
      .getSystemStatus<{ healthy: boolean; label: string }>()
      .then((s) => mounted && setStatus(s))
      .catch(() => mounted && setStatus({ healthy: true, label: "Degraded connectivity" }));
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated || !user) {
    return (
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
        <button
          onClick={onToggleSidebar}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="truncate font-medium text-slate-700">Madurai Division Operations</span>
          <span className="text-slate-300">/</span>
          <span className="hidden truncate text-slate-500 sm:inline">Live Control Room</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>
    );
  }

  const roleColors: Record<string, string> = {
    ZONE_ADMIN_OVERSIGHT: "bg-rail-maroon text-white",
    ZONE_OPERATIONS: "bg-slate-800 text-white",
    DIVISION_ADMINISTRATION: "bg-rail-navy text-white",
    DIVISION_OPERATIONS: "bg-slate-900 text-white",
    DIVISION_ENGINEERING: "bg-amber-100 text-amber-700",
    DIVISION_MECHANICAL: "bg-blue-100 text-blue-700",
    DIVISION_ELECTRICAL: "bg-yellow-100 text-yellow-700",
    DIVISION_ST: "bg-indigo-100 text-indigo-700",
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
      <button
        onClick={onToggleSidebar}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumb / title */}
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="truncate font-medium text-slate-700">Madurai Division Operations</span>
        <span className="text-slate-300">/</span>
        <span className="hidden truncate text-slate-500 sm:inline">Live Control Room</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* System status */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                <Circle
                  className={status.healthy ? "h-2 w-2 fill-emerald-500 text-emerald-500" : "h-2 w-2 fill-amber-500 text-amber-500"}
                  aria-hidden
                />
                <span className="hidden md:inline">{status.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {status.healthy ? "AI services connected" : "AI services degraded"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Incidents */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/emergency"
                className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100"
              >
                <span className="relative flex h-2 w-2">
                  {activeIncidents > 0 && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  )}
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                {activeIncidents > 0 ? `${activeIncidents} incident${activeIncidents > 1 ? "s" : ""}` : "No incidents"}
              </Link>
            </TooltipTrigger>
            <TooltipContent>Open emergency replanning</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Notifications */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/approvals"
                className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label={`${pendingApprovals} pending recommendations`}
              >
                <Bell className="h-5 w-5" />
                {pendingApprovals > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {pendingApprovals}
                  </span>
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent>{pendingApprovals} pending AI recommendations</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-6 w-px bg-slate-200" />

        {/* User */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", roleColors[user.role] ?? "bg-slate-800 text-white")}>
                <User className="h-4 w-4" />
              </span>
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-xs font-medium text-slate-800">{user.shortName} · {user.title}</span>
                <span className="block text-[10px] text-slate-500">{user.designation} · {scopeDisplay(user)}</span>
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex flex-col items-start gap-1">
              <span>{user.name}</span>
              <span className="text-xs font-normal text-slate-500">{user.designation}</span>
              <span className="text-[10px] font-normal text-slate-400">{scopeDisplay(user)}</span>
              <Badge className="text-[10px]">
                {user.organizationalLevel.toLowerCase()} authority · {user.roleProfileId.replace(/_/g, " ")}
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Operator settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/approvals" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Approval center
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              className="flex items-center gap-2 text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Sign out (demo)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}