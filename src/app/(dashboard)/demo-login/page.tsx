"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Shield, Briefcase, Settings, LogIn, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DEMO_USERS } from "@/lib/rbac";

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DIVISIONAL_OPERATIONS_CONTROLLER: Briefcase,
  MAINTENANCE_ENGINEER: Settings,
  SECTION_CONTROLLER: Briefcase,
  OPERATIONS_ANALYST: Shield,
  SYSTEM_ADMINISTRATOR: Settings,
};

export default function DemoLoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (userId: string) => {
    if (loading) return;
    setSelectedUser(userId);
    setLoginError(null);
    setLoading(true);
    try {
      await login(userId);
      router.push("/");
      router.refresh();
    } catch (e) {
      setLoading(false);
      setSelectedUser(null);
      setLoginError(e instanceof Error ? e.message : "Login failed. Please try again.");
    }
  };

  if (isAuthenticated && !selectedUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900">
            <svg className="h-8 w-8 text-white" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="currentColor" />
              <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">RAILOPT AI</h1>
          <p className="mt-2 text-lg text-slate-500">Railway Maintenance & Block Planning · Demo Access</p>
          <p className="mt-1 text-sm text-slate-400">Southern Railway, Madurai Division</p>
        </div>

        {/* Disclaimer */}
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>DEMO MODE:</strong> This is a demonstration application with simulated data.
          No real railway credentials or authentication systems are involved.
        </div>

        {loginError && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <strong>Sign-in failed:</strong> {loginError}
          </div>
        )}

        {/* User Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DEMO_USERS.map((demoUser) => {
            const Icon = ROLE_ICONS[demoUser.role] || User;
            const isCurrentUser = user?.id === demoUser.id;
            const isBusy = loading && selectedUser === demoUser.id;

            return (
              <button
                key={demoUser.id}
                onClick={() => {
                  setSelectedUser(demoUser.id);
                  handleLogin(demoUser.id);
                }}
                disabled={isCurrentUser || loading}
                className={cn(
                  "relative group p-5 text-left transition-all hover:shadow-lg",
                  isCurrentUser
                    ? "border-2 border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20 cursor-default"
                    : "border border-slate-200 bg-white hover:border-amber-300 disabled:opacity-70 disabled:cursor-wait"
                )}
              >
                {isCurrentUser && (
                  <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                    demoUser.role === "DIVISIONAL_OPERATIONS_CONTROLLER" && "bg-slate-900 text-white",
                    demoUser.role === "MAINTENANCE_ENGINEER" && "bg-amber-100 text-amber-700",
                    demoUser.role === "SECTION_CONTROLLER" && "bg-blue-100 text-blue-700",
                    demoUser.role === "OPERATIONS_ANALYST" && "bg-indigo-100 text-indigo-700",
                    demoUser.role === "SYSTEM_ADMINISTRATOR" && "bg-red-100 text-red-700"
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{demoUser.name}</h3>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 truncate">{demoUser.designation}</p>
                    <Badge
                      variant={
                        demoUser.role === "DIVISIONAL_OPERATIONS_CONTROLLER" ? "default" :
                        demoUser.role === "MAINTENANCE_ENGINEER" ? "amber" :
                        demoUser.role === "SECTION_CONTROLLER" ? "blue" :
                        demoUser.role === "OPERATIONS_ANALYST" ? "indigo" : "red"
                      }
                      className="mt-2 text-[10px]"
                    >
                      {demoUser.role.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  {isBusy ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                      <p className="text-xs text-slate-500">Signing in as {demoUser.name}...</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Click to continue as this user
                    </p>
                  )}
                </div>

                {!isCurrentUser && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <LogIn className="h-8 w-8 text-amber-500" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-10 text-center text-xs text-slate-400">
          <p>For demonstration purposes only. Demo users map to server-side demo roles; no real credentials are used.</p>
          <p className="mt-1">
            Already logged in as{" "}
            <span className="font-medium text-slate-600">{user?.name}</span>{" "}
            ({user?.designation})
          </p>
          <Button variant="ghost" size="sm" asChild className="mt-2">
            <Link href="/" onClick={() => router.refresh()}>
              Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}