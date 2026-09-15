// Centralized demonstration authentication configuration.
// The demo password is intentionally shared across every posting and is the
// only credential mechanism on the platform (no real Indian Railways auth).

/** Shared demonstration password for RAILOPT AI Demo Access. */
export const DEMO_PASSWORD = "railopt@123";

/** Label shown on the login screen (never renders a personal identity). */
export const DEMO_ORGANIZATION = "RAILOPT AI Demo Access";

/** Banner shown on the login card and footer. */
export const DEMO_ACCESS_NOTICE =
  "Demonstration access only — not connected to Indian Railways systems.";

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const AUTH_COOKIE = "railopt_session";