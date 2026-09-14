import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  DEMO_USERS,
  getUserPermissions,
  type Permission,
  type User,
} from "@/lib/rbac";

export const AUTH_COOKIE = "railopt_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

// Session state must live on globalThis: in `next dev` each route handler is
// compiled as a separate module instance, so module-level `let` state is not
// shared between /api/auth/login and the protected routes it mints cookies for.
// This mirrors the __railoptStore pattern used in store.ts.
declare global {
  // eslint-disable-next-line no-var
  var __railoptSessionSecret: string | undefined;
  // eslint-disable-next-line no-var
  var __railoptRevoked: Set<string> | undefined;
}

function authSecret(): string {
  if (global.__railoptSessionSecret) return global.__railoptSessionSecret;
  const env = process.env.RAILOPT_AUTH_SECRET;
  if (env && env.length >= 32) {
    global.__railoptSessionSecret = env;
    return env;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("RAILOPT_AUTH_SECRET must be set to a secret of 32+ characters in production.");
  }
  global.__railoptSessionSecret = randomBytes(32).toString("hex");
  return global.__railoptSessionSecret;
}

function revokedSet(): Set<string> {
  if (!global.__railoptRevoked) global.__railoptRevoked = new Set<string>();
  return global.__railoptRevoked;
}

export function revokeSession(token: string): void {
  if (token) revokedSet().add(token);
}

function isRevoked(token: string): boolean {
  return revokedSet().has(token);
}

function sign(payload: string): string {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, iat: Date.now(), exp: Date.now() + SESSION_TTL_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [payload, sig] = parts;
  if (isRevoked(token)) return null;
  const expected = sign(payload);
  const actual = Buffer.from(sig);
  const exp = Buffer.from(expected);
  if (actual.length !== exp.length || !timingSafeEqual(actual, exp)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data?.userId !== "string" || typeof data?.exp !== "number") return null;
    if (Date.now() > data.exp) return null;
    return { userId: data.userId };
  } catch {
    return null;
  }
}

export function getSessionUserFromCookie(cookieValue: string | null | undefined): User | null {
  if (!cookieValue) return null;
  const session = verifySessionToken(cookieValue);
  if (!session) return null;
  return DEMO_USERS.find((u) => u.id === session.userId) ?? null;
}

export function getSessionUser(): User | null {
  const store = cookies();
  return getSessionUserFromCookie(store.get(AUTH_COOKIE)?.value);
}

export type GuardResult = { user: User } | { error: NextResponse };

export function requireAuth(): GuardResult {
  const user = getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Authentication required. Please sign in." }, { status: 401 }) };
  }
  return { user };
}

export function requirePermission(permission: Permission): GuardResult {
  const auth = requireAuth();
  if ("error" in auth) return auth;
  if (!getUserPermissions(auth.user).includes(permission)) {
    return {
      error: NextResponse.json(
        { error: `Access denied. Your role requires the '${permission}' permission.` },
        { status: 403 }
      ),
    };
  }
  return auth;
}

export function requireAnyPermission(permissions: Permission[]): GuardResult {
  const auth = requireAuth();
  if ("error" in auth) return auth;
  const perms = getUserPermissions(auth.user);
  if (!permissions.some((p) => perms.includes(p))) {
    return {
      error: NextResponse.json(
        { error: `Access denied. Requires one of: ${permissions.join(", ")}.` },
        { status: 403 }
      ),
    };
  }
  return auth;
}

export function setSessionCookie(response: NextResponse, userId: string): NextResponse {
  response.cookies.set(AUTH_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}