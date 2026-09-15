"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, LogIn, KeyRound, ShieldAlert, MapPin, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { POSTINGS } from "@/lib/rbac";
import { DEMO_ACCESS_NOTICE, DEMO_ORGANIZATION } from "@/lib/auth/auth-config";
import {
  ZONES,
  ZONAL_AUTHORITY_DIVISION_ID,
  ZONAL_AUTHORITY_DIVISION_NAME,
} from "@/lib/rbac/organizational-data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ZONAL_POSTINGS = POSTINGS.filter((p) => p.organizationalLevel === "ZONAL");
const DIVISIONAL_POSTINGS = POSTINGS.filter((p) => p.organizationalLevel === "DIVISIONAL");

const SelectIcon = () => (
  <svg
    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden
  >
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
      clipRule="evenodd"
    />
  </svg>
);

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [zoneId, setZoneId] = useState<string>("");
  const [divisionId, setDivisionId] = useState<string>("");
  const [postingId, setPostingId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedZone = useMemo(() => ZONES.find((z) => z.id === zoneId) ?? null, [zoneId]);

  const divisions = useMemo(() => {
    if (!selectedZone) return [];
    return selectedZone.divisions;
  }, [selectedZone]);

  const hasValidContext = zoneId !== "" && divisionId !== "" && selectedZone?.available;

  const selectedDivisionName = useMemo(() => {
    if (!selectedZone) return null;
    const div = selectedZone.divisions.find((d) => d.id === divisionId);
    return div?.name ?? null;
  }, [selectedZone, divisionId]);

  const availablePostings = useMemo(() => {
    if (!hasValidContext) return [];
    if (divisionId === ZONAL_AUTHORITY_DIVISION_ID) {
      return ZONAL_POSTINGS;
    }
    return DIVISIONAL_POSTINGS.filter((p) => p.division === selectedDivisionName);
  }, [hasValidContext, divisionId, selectedDivisionName]);

  const canSubmit =
    zoneId !== "" &&
    divisionId !== "" &&
    postingId.trim() !== "" &&
    password.length > 0 &&
    !loading;

  const handleZoneChange = (value: string) => {
    setZoneId(value);
    setDivisionId("");
    setPostingId("");
    setError(null);
  };

  const handleDivisionChange = (value: string) => {
    setDivisionId(value);
    setPostingId("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await login(postingId, password, zoneId, divisionId);
      router.push("/");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error && err.message ? err.message : "Sign-in failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rail-navy-dark via-rail-navy to-rail-maroon px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg">
            <Image
              src="/railopt-logo.png"
              alt="RAILOPT AI"
              width={1024}
              height={1024}
              className="h-12 w-12 object-contain"
            />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">RAILOPT AI</h1>
          <p className="mt-1 text-sm text-slate-300">Railway Maintenance & Block Planning</p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-amber-300">
            <ShieldAlert className="h-3 w-3" />
            {DEMO_ORGANIZATION}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Zone */}
            <div>
              <label
                htmlFor="zone"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                Zone
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  id="zone"
                  value={zoneId}
                  onChange={(e) => handleZoneChange(e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-slate-300 bg-white pl-9 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50"
                  disabled={loading}
                >
                  <option value="">Select a zone…</option>
                  {ZONES.map((z) => (
                    <option key={z.id} value={z.id} disabled={!z.available}>
                      {z.name}{!z.available ? " — Coming soon" : ""}
                    </option>
                  ))}
                </select>
                <SelectIcon />
              </div>
            </div>

            {/* Division */}
            <div>
              <label
                htmlFor="division"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                Division
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  id="division"
                  value={divisionId}
                  onChange={(e) => handleDivisionChange(e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-slate-300 bg-white pl-9 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50"
                  disabled={!zoneId || loading}
                >
                  <option value="">
                    {!zoneId ? "Select a zone first…" : "Select a division…"}
                  </option>
                  {divisions.length > 0 && (
                    <>
                      <option value={ZONAL_AUTHORITY_DIVISION_ID}>
                        {ZONAL_AUTHORITY_DIVISION_NAME}
                      </option>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id} disabled={!d.available}>
                          {d.name}{!d.available ? " — Coming soon" : ""}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <SelectIcon />
              </div>
            </div>

            {/* Posting */}
            <div>
              <label
                htmlFor="posting"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                Posting
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  id="posting"
                  value={postingId}
                  onChange={(e) => setPostingId(e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-slate-300 bg-white pl-9 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50"
                  disabled={!hasValidContext || loading}
                >
                  <option value="">
                    {!hasValidContext ? "Select zone and division first…" : "Select a posting…"}
                  </option>
                  {availablePostings.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.shortName} — {p.title}
                    </option>
                  ))}
                </select>
                <SelectIcon />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
              >
                Password
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter demo password"
                  autoComplete="current-password"
                  className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <strong>Sign-in failed:</strong> {error}
              </div>
            )}

            <Button
              type="submit"
              variant="amber"
              className="w-full"
              disabled={!canSubmit}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign in to RAILOPT AI
                </>
              )}
            </Button>
          </form>

          <div className={cn("mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800")}>
            <strong>Demo password:</strong> <code className="font-mono font-semibold">railopt@123</code>
            {" "}— shared by every posting. All postings map to demonstration roles; no real
            Indian Railways credentials or systems are involved.
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400">
          {DEMO_ACCESS_NOTICE}
          <br />
          14 postings · 6 zonal / 8 divisional · Southern Railway, Madurai Division
        </p>
      </div>
    </div>
  );
}
