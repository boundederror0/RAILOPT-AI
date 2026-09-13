# RAILOPT AI — Intelligent Railway Maintenance & Block Planning

A full-stack AI-assisted platform for railway maintenance planning. It analyzes asset risk, optimizes maintenance block windows, simulates train-impact before work begins, and routes proposed plans through a human-in-the-loop approval workflow.

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts, and a deterministic rule-based "AI" engine that runs entirely in-process.

## Features

- **Dashboard** — live KPI cards, risk distribution, upcoming blocks, recent incidents.
- **Maintenance Requests** — create, triage, and track maintenance requests with AI risk scoring.
- **AI Analysis** — risk assessment of individual assets with recommended mitigations and lifetime projections.
- **Block Optimizer** — groups open maintenance requests into conflict-free block windows; optimizes for available teams, priority, and train-delay penalties.
- **Train Impact** — simulates the effect of a block window on scheduled trains and produces per-train delay estimates and a severity summary.
- **What-if Simulator** — re-runs the optimizer with different parameters (start offset, duration, simultaneous blocks, train priority weight) *without* committing anything.
- **Live Operations** — running blocks, today's schedule timeline, impacted trains, and operational status.
- **Emergency Replan** — reacts to live incidents (e.g. track-circuit failure) with an immediate maintenance block recommendation and disruption estimate.
- **Approvals** — human-in-the-loop queue for AI-recommended block plans, risk recommendations, and emergency replans.
- **Analytics** — availability trend, completion rates, incident breakdowns, maintenance cost and delay charts.
- **Settings** — company/network profile, operational parameters, and maintenance strategy.

## Tech Stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 14.2.35 (App Router, RSC + client components) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4 + shadcn-style UI kit (Radix, CVA, tailwind-merge) |
| Charts | Recharts 3 |
| Icons | lucide-react |
| Dates | date-fns |
| Data layer | In-memory singleton store seeded at boot (`src/lib/store.ts`, `src/lib/seed.ts`) |

There is no external database or network AI service — everything is deterministic and runs locally, so the app is fully self-contained and demoable offline.

## Getting Started

```bash
npm install
npm run dev       # http://localhost:3000
```

Production:

```bash
npm run build
npm run start     # http://localhost:3000
```

> Node 18.18+ (Next.js 14 requirement). Verified with Node 24.

## Architecture

```
src/
  app/
    (dashboard)/            # 11 pages: dashboard, maintenance-requests, ai-analysis,
                            # block-optimizer, train-impact, what-if, live-operations,
                            # emergency, approvals, analytics, settings
    api/                    # 18 REST-ish route handlers (see below)
  components/
    layout/                 # sidebar + topbar shell
    ui/                     # reusable UI kit (Button, Card, Dialog, ...)
  lib/
    types.ts                # domain models (Asset, Request, Block, Plan, Incident, ...)
    store.ts                # in-memory store + audit log + approval decisions
    seed.ts                 # simulated dataset (assets, trains, teams, requests, blocks)
    api.ts                  # typed client wrapper used by pages (useFetch)
    time.ts                 # simulation time helpers (SYSTEM_DATE = 2026-09-12)
    ai/
      risk-scoring.ts       # asset risk model, severity, MTBF/lifetime projection
      block-optimizer.ts    # grouping + greedy scheduling optimization
      train-impact.ts       # per-train corridor delay simulation
      emergency-replan.ts   # incident -> recommended block + disruption estimate
      analytics.ts          # computed time-series KPIs
```

### Key domain flow

1. Assets accrue **risk scores** (`risk-scoring.ts`); high-risk asks generate **maintenance requests**.
2. The **Block Optimizer** (`/api/optimize?simulate=false`) picks eligible requests (status `Open`, `In Review`, or `Approved`), groups them into time windows that never overlap per-team/per-asset, and computes an optimization score balancing urgency vs. train-delay cost. Generated blocks are created as `Proposed`.
3. Proposed blocks can be analyzed via **Train Impact** (`/api/train-impact`) which finds every scheduled train crossing the block's corridor and estimates delay/severity.
4. **What-if** re-runs the optimizer in pure simulation mode. Nothing is committed.
5. Each optimizer run and every risk recommendation creates an **Approval** record. Approving a block plan flips its blocks to `Approved` and marks the underlying requests `Scheduled`; that is when work appears in **Live Operations**.
6. **Emergency Replan** (`/api/emergency-replan`) generates an immediate block for a live incident; its approval adds the block as `Approved` and records the mitigation.

### AI engine notes

- All "AI" outputs are deterministic rule-based computations over the seed dataset — no third-party API is called.
- Risk scoring combines asset health, failure history, service criticality, and time-in-service into a 0–100 score.
- The optimizer is a greedy scheduler: it sorts requests by priority, teams by availability, and keeps blocks conflict-free within the `TYPE_SAFETY_MINUTES` margins while respecting `simultaneousBlocks`.
- Train impact uses station-corridor passes of the seed timetable to compute overlap and caps delays by criticality. 0-impact results are legitimate when the block window does not overlap any corridor passage.

## API Overview

| Endpoint | Purpose |
| --- | --- |
| `GET /api/assets`, `/api/teams`, `/api/trains` | Master data |
| `GET/POST /api/maintenance-requests`, `PATCH /api/maintenance-requests/[id]` | Request CRUD |
| `POST /api/risk-analysis` | Score a specific asset |
| `POST /api/optimize` | Run optimizer (`simulate` toggles what-if mode) |
| `POST /api/train-impact` | Delay simulation for a block |
| `POST /api/simulation` | Standalone delay simulation |
| `POST /api/emergency-replan` | Incident → recommended block |
| `GET /api/approvals`, `POST /api/approvals/[id]/decision` | Approval queue |
| `GET /api/blocks`, `/api/incidents`, `/api/system-status` | Operational state |
| `GET /api/dashboard`, `/api/analytics`, `/api/audit-logs` | KPIs and logs |
| `GET /api/historical/summary` | Read-only historical Kaggle intelligence (server-side) — see below |

### Example: run the optimizer (simulate mode)

```bash
curl -X POST http://localhost:3000/api/optimize \
  -H "content-type: application/json" \
  -d '{
    "requestIds": ["MR-2026-0001", "MR-2026-0002"],
    "params": { "blockStartOffset": 1, "blockDuration": 1.5, "simultaneousBlocks": 2 },
    "simulate": true
  }'
```

### Example: approve a suggested plan

```bash
curl -X POST http://localhost:3000/api/approvals/APR-2026-1234/decision \
  -H "content-type: application/json" \
  -d '{ "decision": "Approved", "operator": "Zonal Manager", "note": "Approved" }'
```

## Demo Data

All data is **simulated** and seeded into an in-memory store on server boot. The simulation clock is fixed at `2026-09-12T06:00` (used by planning/scheduling), while emergency/operator actions use the real clock. Any changes made through the UI (requests, blocks, approvals, incidents) live only in memory and reset on restart.

Not part of the proposal: real SCADA/asset telemetry ingestion, GIS map, actual train movement feeds, user auth, and multi-zone persistence.

## Kaggle Historical Data Layer

RAILOPT ships with an **optional, read-only historical intelligence layer** built from the public Kaggle
[`ir_train.csv`] train-delay dataset. It is deliberately **separate from the live operational simulation**.

### Purpose

The Kaggle layer exists to answer questions like *"how late is 12635 usually?"*, *"which delay cause
dominates on Southern Railway?"*, or *"what was the on-time rate in season X?"*. It is an **intelligence
source, not the operational timetable**.

### Ingestion command

```bash
npm run ingest            # node scripts/ingest-kaggle.mjs
```

The script streams `data/raw/ir_train.csv` (≈ 337 MB, never loaded fully into memory), validates and
normalizes every row (train numbers, dates, delay minutes, cause, zone), deduplicates by `journey_id`,
aggregates per-train/per-zone/per-cause statistics, and writes compact artifacts to `data/processed/`:

| File | Contents |
| --- | --- |
| `kaggle_historical_summary.json` | Overall + per-zone + per-cause + per-train-type + per-bucket statistics |
| `kaggle_historical_train_stats.json` | Per-train-number historical statistics (6,293 trains) |
| `kaggle_historical_southern.json` | Compact Southern Railway journey history (`zone_abbr == "SR"`) |
| `kaggle_manifest.json` | Full ingestion report: counts, validation results, missing values, columns used/ignored |

### Raw vs processed

- `data/raw/` — original Kaggle files, **never modified or read at runtime**.
- `data/processed/` — compact, aggregated JSON (~10 MB total vs ~337 MB raw); loaded **lazily on the
  server** (first API call) and cached; never sent to the browser.

### Server-side access

`src/lib/data/historical-railway.ts` exposes `getHistoricalTrainStats()`, `getTrainStatsByNumber()`,
`getTrainDelayHistory()`, `getDelayCauseStats()`, `getZoneDelayStats()`, `getOverallDelayStats()`, and
`getHistoricalManifest()`. The only consumer is `GET /api/historical/summary` (e.g.
`/api/historical/summary?train=12635`). This layer does not touch operational trains, requests, blocks,
the optimizer, train-impact, emergency replanning, or approvals.

### Limitations and disclaimer

- **HISTORICAL DATA — Source: Public Kaggle dataset — NOT live railway telemetry.** The dataset is
  synthetic/curated competition data (2018–2024) with **no station-by-station timetables**; only
  origin/destination *categories* exist. RAILOPT's operational station-level schedules remain simulated.
- The dataset has no delay values in the 16–30 minute range (an artifact of the source) — interpret the
  delay-bucket distribution accordingly.
- The `SR` zone identifier (`zone_abbr == "SR"`, `zone == "Southern Railway (SR)"`) is taken directly
  from the source and was verified consistent on all 94,165 Southern Railway rows.
- Normalization rules, thresholds (on-time ≤ 15 min, severe > 60 min) and ignored columns are recorded
  in `data/processed/kaggle_manifest.json`.

## Project Scripts

```bash
npm run dev    # dev server
npm run build  # production build (lint + type-check via next build)
npm run start  # serve production build
npm run lint   # eslint
npm run ingest # regenerate data/processed from data/raw/ir_train.csv
```

## Known Build Note

`/` (dashboard) exports `export const dynamic = "force-dynamic"` as a workaround for a Next.js 14.2.35 prerender bug (`clientModules`). Keep it if you touch that page.