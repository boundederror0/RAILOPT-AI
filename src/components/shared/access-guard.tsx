"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { Lock, ArrowLeft, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/shared/panel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Permission } from "@/lib/rbac";

interface AccessGuardProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

export function AccessGuard({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallback,
}: AccessGuardProps) {
  const { user, hasPermission, hasAnyPermission, hasAllPermissions, isAuthenticated } = useAuth();

  const checkAccess = () => {
    if (!isAuthenticated) return false;
    if (requiredPermission) return hasPermission(requiredPermission as Permission);
    if (requiredPermissions && requiredPermissions.length > 0) {
      return requireAll
        ? hasAllPermissions(requiredPermissions as Permission[])
        : hasAnyPermission(requiredPermissions as Permission[]);
    }
    return true;
  };

  const hasAccess = checkAccess();

  if (!isAuthenticated) {
    return fallback ?? (
      <div className="flex min-h-[400px] items-center justify-center">
        <Panel title="Authentication Required" className="w-full max-w-md">
          <div className="text-center py-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Lock className="h-6 w-6 text-slate-500" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Authentication Required</h2>
            <p className="mt-2 text-sm text-slate-500">
              Sign in with a RAILOPT demo posting to access this module.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  if (!hasAccess) {
    const required = requiredPermission
      ? [requiredPermission]
      : requiredPermissions ?? [];
    return fallback ?? (
      <div className="flex min-h-[400px] items-center justify-center">
        <Panel title="Access Restricted" className="w-full max-w-md">
          <div className="text-center py-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <Shield className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Access Restricted</h2>
            <p className="mt-2 text-sm text-slate-500">
              Your role <span className="font-medium">{user?.designation}</span> does not have permission to access this module.
            </p>
            {required.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {required.map((p) => (
                  <Badge key={p} variant="outline" className="text-[11px]">
                    {p}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  Return to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  return <>{children}</>;
}

interface WithPermissionProps {
  children: ReactNode;
  permission: Permission;
  fallback?: ReactNode;
}

export function WithPermission({ children, permission, fallback }: WithPermissionProps) {
  const { hasPermission, isAuthenticated } = useAuth();

  if (!isAuthenticated || !hasPermission(permission)) {
    return fallback ?? null;
  }

  return <>{children}</>;
}

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: Permission;
  children: ReactNode;
  disabled?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "amber" | "success";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export function ActionButton({
  permission,
  children,
  disabled,
  variant = "default",
  size = "default",
  asChild = false,
  className,
  ...props
}: ActionButtonProps) {
  const { hasPermission, isAuthenticated } = useAuth();
  const allowed = isAuthenticated && hasPermission(permission);

  return (
    <Button
      variant={variant}
      size={size}
      asChild={asChild}
      disabled={disabled || !allowed}
      className={cn(className, !allowed && "opacity-50 cursor-not-allowed")}
      title={!allowed ? `Requires permission: ${permission}` : undefined}
      {...props}
    >
      {children}
    </Button>
  );
}

export function PermissionBadge({ permission, label }: { permission: string; label?: string }) {
  const { hasPermission } = useAuth();
  const allowed = hasPermission(permission as Permission);

  return (
    <Badge
      variant={allowed ? "green" : "outline"}
      className={cn("gap-1.5", !allowed && "opacity-60")}
    >
      {allowed ? (
        <>
          <Shield className="h-3 w-3" />
          <span>{label ?? permission}</span>
        </>
      ) : (
        <>
          <Lock className="h-3 w-3" />
          <span>{label ?? permission}</span>
        </>
      )}
    </Badge>
  );
}