"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  History,
  Wrench,
  BrainCircuit,
  CalendarRange,
  Train,
  FlaskConical,
  Radio,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Settings,
  ListOrdered,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getAccessibleNavGroups } from "@/lib/rbac";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  History,
  Wrench,
  BrainCircuit,
  CalendarRange,
  Train,
  FlaskConical,
  Radio,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Settings,
  ListOrdered,
  ShieldCheck,
};

export function Sidebar({
  pendingCount = 0,
  onClose,
}: {
  pendingCount?: number;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const navGroups = getAccessibleNavGroups(user);

  return (
    <aside className="flex h-screen w-[min(85vw,320px)] flex-col bg-sidebar text-slate-300 lg:w-[240px]">
      {/* Brand */}
      <div className="flex items-center gap-3.5 border-b border-white/10 px-4 py-5">
        <Image
          src="/railopt-logo.png"
          alt="RAILOPT AI"
          width={1024}
          height={1024}
          className="h-[72px] w-[72px] shrink-0 object-contain"
        />
        <div className="min-w-0 leading-tight">
          <span className="block text-sm font-bold tracking-wide text-white">RAILOPT AI</span>
          <span className="mt-1 block text-[10px] leading-snug text-slate-400">
            Intelligent Railway Maintenance & Block Planning
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-0.5 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  const Icon = ICON_MAP[item.iconName];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                      )}
                      title={item.label}
                      onClick={onClose}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {item.href === "/approvals" && pendingCount > 0 && (
                        <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                          {pendingCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-[10px] text-slate-500">DEMO DATA — Southern Railway</p>
        <p className="text-[10px] text-slate-500">Madurai Division</p>
      </div>
    </aside>
  );
}