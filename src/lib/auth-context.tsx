"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User, RoleId, Permission } from "./rbac";
import { DEMO_USERS, getUserPermissions, hasPermission, hasAnyPermission, hasAllPermissions } from "./rbac";

interface AuthContextValue {
  user: User | null;
  users: User[];
  login: (userId: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  getUserPermissions: () => Permission[];
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "railopt-demo-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const userId = JSON.parse(stored);
          const found = DEMO_USERS.find((u) => u.id === userId);
          if (found) setUser(found);
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setHydrated(true);
    }
  }, []);

  const login = (userId: string) => {
    const found = DEMO_USERS.find((u) => u.id === userId);
    if (found) {
      setUser(found);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userId));
      }
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const checkPermission = (permission: Permission) => hasPermission(user, permission);
  const checkAnyPermission = (permissions: Permission[]) => hasAnyPermission(user, permissions);
  const checkAllPermissions = (permissions: Permission[]) => hasAllPermissions(user, permissions);
  const getPerms = () => getUserPermissions(user ?? ({} as User));

  if (!hydrated) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          users: DEMO_USERS,
          login,
          logout,
          isAuthenticated: false,
          hasPermission: () => false,
          hasAnyPermission: () => false,
          hasAllPermissions: () => false,
          getUserPermissions: () => [],
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        users: DEMO_USERS,
        login,
        logout,
        isAuthenticated: !!user,
        hasPermission: checkPermission,
        hasAnyPermission: checkAnyPermission,
        hasAllPermissions: checkAllPermissions,
        getUserPermissions: getPerms,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function usePermissions() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, getUserPermissions } = useAuth();
  return { hasPermission, hasAnyPermission, hasAllPermissions, getUserPermissions };
}