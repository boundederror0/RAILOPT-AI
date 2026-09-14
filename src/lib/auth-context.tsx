"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User, Permission } from "./rbac";
import { DEMO_USERS, getUserPermissions, hasPermission, hasAnyPermission, hasAllPermissions } from "./rbac";
import { api, ApiError } from "./api";

interface AuthContextValue {
  user: User | null;
  users: User[];
  login: (userId: string) => Promise<User>;
  logout: () => Promise<void>;
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
    let active = true;
    const restoreFromServer = async () => {
      try {
        const res = await api.me<{ user: User }>();
        if (!active) return;
        setUser(res.user);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user.id));
        }
      } catch {
        const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (stored) {
          try {
            const userId = JSON.parse(stored);
            const found = DEMO_USERS.find((u) => u.id === userId);
            if (found) {
              api
                .login(userId)
                .catch(() => null)
                .then(() => {
                  if (active) setUser(found);
                });
            }
          } catch {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } finally {
        if (active) setHydrated(true);
      }
    };
    restoreFromServer();
    return () => {
      active = false;
    };
  }, []);

  const login = async (userId: string): Promise<User> => {
    const found = DEMO_USERS.find((u) => u.id === userId);
    if (!found) {
      throw new ApiError(400, "Unknown demo user.");
    }
    const res = await api.login<{ user: User }>(userId);
    if (!res?.user) {
      throw new ApiError(401, "Authentication failed. Please try again.");
    }
    setUser(res.user);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userId));
    }
    return res.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } catch {
      // still clear local UI state even if the server session already expired
    }
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