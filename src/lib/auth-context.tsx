"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { User, Permission, Posting } from "./rbac";
import {
  POSTINGS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  postingToUser,
} from "./rbac";
import { api, ApiError } from "./api";

interface AuthContextValue {
  user: User | null;
  users: User[];
  postings: Posting[];
  login: (postingId: string, password: string, zoneId: string, divisionId: string) => Promise<User>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  getUserPermissions: () => Permission[];
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "railopt-demo-posting";
const USERS = POSTINGS.map(postingToUser);
const POSTING_BY_ID = new Map(POSTINGS.map((p) => [p.id, p]));

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
        // The server session is gone. Without the demo password we cannot
        // silently re-authenticate, so clear the stored posting.
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEY);
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

  const login = async (postingId: string, password: string, zoneId: string, divisionId: string): Promise<User> => {
    const posting = POSTING_BY_ID.get(postingId);
    if (!posting) {
      throw new ApiError(400, "Unknown posting.");
    }
    const res = await api.login<{ user: User }>(postingId, password, zoneId, divisionId);
    if (!res?.user) {
      throw new ApiError(401, "Authentication failed. Please try again.");
    }
    setUser(res.user);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(postingId));
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
  const getPerms = () => (user?.permissions ? [...user.permissions] : []);

  if (!hydrated) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          users: USERS,
          postings: POSTINGS,
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
        users: USERS,
        postings: POSTINGS,
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