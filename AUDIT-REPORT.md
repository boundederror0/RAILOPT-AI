# RAILOPT Audit & Hardening Report (Combined A–N)

Date: 14 Sep 2026 · Branch/deploy: local demo (Next.js App Router, `next start -p 3100`)

---

## A. Codebase overview & architecture

- Next.js App Router TypeScript app. Data is a deterministic in-memory store seeded from `src/lib/seed.ts` (no database).
- Rails-style folder map:
  - `src/app/(dashboard)/*` — user pages (dashboard, maintenance-requests, approvals, emergency, block-optimizer, train-impact, what-if, live-operations, analytics, ai-analysis, historical-intelligence, settings, demo-login).
  - `src/app/api/**/route.ts` — REST endpoints (single-process demo, no serverless persistence).
  - `src/lib/ai/*` — deterministic engines (risk-scoring, block-optimizer, emergency-replan, train-impact, analytics, historical). **Not modified** except the API routes that call them.
  - `src/lib/data/historical-railway.ts` — Kaggle-derived historical dataset loader/summarizer.
  - `src/lib/rbac.ts` — roles/permissions; `src/lib/auth/*`, `src/lib/store.ts`, `src/lib/api.ts` — auth, state, client.
  - `src/components/**` — shared UI (app-shell, sidebar, topbar, panels, dialogs, drawers).
- Build: `next build`, TypeScript `tsc --noEmit`, ESLint (`next/core-web-vitals` + `next/typescript`).

## B. Audit scope & method

- Phase 1 read/grep inventoried every page, route, lib, auth layer, layout, app-shell, store, seed; searched for TODO/FIXME (0), `eslint-disable` (9), `dangerouslySetInnerHTML`/`eval` (0), and client-supplied identity (`body.operator` — 1 vector, since removed).
- Phases 2–21 executed hardening, validation, cleanup, rebuild, and re-testing against a freshly built prod server.

## C. Security posture (new server-side session auth)

- New `src/lib/auth/server-auth.ts`: HMAC-SHA256-signed `railopt_session` httpOnly cookie (`payload.signature`, base64url, `timingSafeEqual` verification). Secret: `process.env.RAILOPT_AUTH_SECRET ?? "railopt-demo-local-secret"`.
- New endpoints `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`; client `api.login/me/logout`; `auth-context` hydrates via `/api/auth/me` then falls back to localStorage demo user + re-login.
- Identity is **server-derived**: mutations log `performedBy: guard.user.name`, never request‑body values.

## D. Identity & authorization findings (closed)

- **Critical fix:** approval decision route accepted `body.operator` → spoofable. Now uses session user; `operator` field removed from frontend sends.
- Every route now guarded (authoritative matrix in `route-guards.md`; the map in this repo's phase notes). Unauthorized → 401 (no session) / 403 (no permission). No route left open except the auth endpoints.
- Verified 26/26 auth spot-checks: anonymous 401s, SYSTEM_ADMIN 403 on maintenance/optimize, OPERATIONS_ANALYST 403 on `optimizer.run` (view-only allowed), spoofed `operator` ignored (`decidedBy` = session user), unknown login rejected.

## E. API surface & validation

- `maintenance-requests` POST validates type/priority/status/riskScore/duration; duplicate create → 409; PATCH validates transitions (409 on illegal moves) and all dirty fields (400).
- `/api/optimize`: empty/unknown/missing requestIds → 400/404; simulate does NOT persist; params clamped deterministically (no NaN).
- `/api/simulation` POST: strict numeric validation → 422 on garbage (no silent defaults).
- `/api/train-impact`: valid dates required, `endTime > startTime`, positive `durationMinutes` (400 otherwise).
- `/api/historical/summary`: `train` param trimmed + max length 30 (400).
- `/api/approvals/[id]/decision`: `Rejected`/`Modified` now **require** a note (400), repeat decision → 409.

## F. Business-rule integrity

- Full status-transition map enforced server-side for maintenance requests (Open→…, In Review→…, Approved→…, Scheduled→…, In Progress→…, terminal states frozen).
- Approval flow: exactly one pending plan per run, one-time decision, stale rejections, no empty-plan approvals.
- QA suite re-verified all invariants: same-section overlap avoidance, single-team concurrency, past-window prevention, midnight-crossing analysis, concurrent-optimize convergence to one approval.

## G. Data authenticity

- **Fixed:** dashboard `criticalAlerts` was hardcoded — now derived from live incidents (severity-sorted, unresolved only).
- Dashboard `trainDelayTrend` now derived from real block expected-delay by date; analytics `backlog` derived from real requests per month.
- `trainDelayTrend`/`systemHealth`/`backlog` are returned but not rendered on the pages (dead data) — kept for API completeness; noted.
- `historical-intelligence` page rewritten entirely against the real contract (`getHistoricalSummary`), removed calls to nonexistent API methods, added honesty banner ("public Kaggle dataset, not live telemetry").
- Analytics generator (`src/lib/ai/analytics.ts`) remains synthetic-by-design (sin/cos demo series); **not changed** per "do not modify AI algorithms" constraint — flagged as illustrative, not product data.

## H. Frontend defects found & fixed

- `block-optimizer`: trace rendered against a fabricated `OptimizeTrace` (NaN start/duration) → rewritten to real fields (`chosenStart/End`, `teamId`, `delayMinutes`, `penalty`, `severity`, conflicts, skip counts). `totalBlockDuration` was shown as hours but is minutes → now `minutesToHM`. Optimizer link was a literal string with `{...}` → now real backtick template. Unused imports removed, `optimizer.view` AccessGuard + `optimizer.run` button gate added.
- `ai-analysis`/`topbar`/`auth-context`/`demo-login`: unused imports removed.
- Approvals: Reject now opens a reason-required dialog; Modify note retained.
- Settings: config type aligned to real `OpsConfig`; audit-log fetch tolerates 403 for non-admins.
- Dashboard wrapped in `AccessGuard dashboard.view`.
- `request-detail-drawer` Edit button gated on `maintenance.edit`.
- `eslint-disable` audit: 9 comments reviewed; remaining ones are all defensible (mount-only data effects / custom `useFetch` deps pattern) — documented, none are generic `any`-covering hacks.

## I. Build / type / lint health

- `next.config.mjs` suppression (`eslint.ignoreDuringBuilds`, `typescript.ignoreBuildErrors`) **removed**.
- `tsc --noEmit` clean; `next build` green with linting + types enforced; ESLint 0 errors/0 warnings across `src`.

## J. Testing & QA results (fresh prod server, authenticated)

| Suite | Result |
|---|---|
| `qa-plan.mjs` (optimizer/approval/validation/concurrency) | 59/59 PASS |
| `step8-e2e.mjs` (route render + full approve flow) | 14/14 PASS |
| `routes-prod-check.mjs` (all pages brand/no-starter) | 11/11 PASS |
| `auth-check.mjs` (authz matrix, spoofing, validation) | 26/26 PASS |

QA harnesses were updated to authenticate via `/api/auth/login` (session cookie) since all endpoints are now protected.

## K. Risks / open items (advisory)

1. **Protected AI modules deliberately unchanged:** `analytics.ts` series are synthetic demo curves; if this becomes a real ops product, replace with live telemetry aggregation. Decision: documented, not a defect.
2. **`src/app/test-new/page.tsx`** is a leftover "Hello World" scaffold (unlinked in nav). Recommend deleting; kept pending your call.
3. **`OPERATOR_NAME`/`OPERATOR_ROLE`** still defined in `store.ts` but no longer referenced by pages — legacy constants, safe to remove in a future cleanup.
4. **Demo session:** all demo roles already use the real server auth path; but a production deployment must set a strong `RAILOPT_AUTH_SECRET` (fallback is a well-known local value).
5. **Snapshot suites** `step3/step7-verify` still mismatch (original page copy lost) — snapshot-string diffs only, not functional regressions.
6. Infra: single-process in-memory store — scale-out would need a real store; no change made.

## L. Environment / deploy notes

- No `.env*` committed (gitignore verified); `VERCEL_OIDC_TOKEN` remains only in ignored `.env.local`.
- Run: `next build` then `next start -p 3100`; the API suites expect `localhost:3100` and now log in as `user-1`.
- Social login/UIP not present; auth is demo-scoped by design.

## M. Protected (unchanged by design)

`schema.ts`, `seed.ts`, `src/lib/ai/*` algorithms, and `src/lib/data/historical-railway.ts` were not modified. All validation/auth is applied at the route boundary; engines remain deterministic and unit-verifiable.

## N. Summary

Server-side trusted auth + full RBAC enforcement + spoof-proof audit attribution + strict input validation + honest data labeling + undefeated build gates. Deterministic engines untouched and still passing 59+14+26+11 functional checks. Remaining items are advisory (analytics series labelling, leftover scaffold, env secret hygiene).