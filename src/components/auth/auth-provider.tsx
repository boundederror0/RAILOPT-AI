"use client";

import { AuthProvider } from "@/lib/auth-context";
import { ReactNode } from "react";

export function AuthProviderWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}