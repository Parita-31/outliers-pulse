# AI Incident Commander — Backend

Intelligent Emergency Response & Resource Coordination Platform (backend only).
Node.js + Express + PostgreSQL + Socket.IO + Gemini.

> Status: **Stage 2 of 17 complete** — backend foundation + PostgreSQL schema
> (10 tables, enums, indexes, updated_at triggers). No API routes yet — those
> come in Stage 3.

## Stage 1 — Setup & Verify

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Start Postgres (Docker)
```bash
cp .env.example .env
docker compose up -d
```
Wait a few seconds for the healthcheck to pass:
```bash
docker compose ps
```

### 3. Run the server
```bash
npm run dev
```
You should see:
```
[server] AI Incident Commander backend listening on port 4000
[server] Health check: http://localhost:4000/health
```

### 4. Verify
```bash
curl http://localhost:4000/health
```
Expected response (DB connected):
```json
{
  "success": true,
  "service": "ai-incident-commander-backend",
  "time": "...",
  "db": "connected"
}
```

Also check:
```bash
curl http://localhost:4000/
```

**What to confirm before I move to Stage 2 (Postgres schema):**
- [ ] `npm install` completes without errors
- [ ] `docker compose up -d` starts Postgres successfully
- [ ] `npm run dev` starts without crashing
- [ ] `GET /health` returns `"db": "connected"`
- [ ] Stopping Postgres (`docker compose stop`) and hitting `/health` again returns
      `"db": "unavailable"` with a 503, **without crashing the server** (proves the
      app degrades gracefully instead of dying — important since the AI/DB failure
      tolerance requirement runs throughout this whole project)

## Stage 2 — Setup & Verify

### 1. Apply the schema
Make sure Postgres is running (`docker compose up -d` from Stage 1), then:
```bash
npm run migrate
```
Expected output ends with a line listing all 10 tables:
```
[migrate] Tables present: activity_logs, ai_analyses, alerts, assignments,
hospitals, incidents, notifications, reports, resources, users
```

### 2. Inspect it directly (optional but recommended)
```bash
docker exec -it incident-commander-db psql -U incident_user -d incident_commander -c "\dt"
docker exec -it incident-commander-db psql -U incident_user -d incident_commander -c "\d incidents"
```

### 3. Confirm it's re-runnable (idempotent)
```bash
npm run migrate
```
Should succeed again with no errors (enums are guarded, tables use `IF NOT EXISTS`).

### 4. Confirm a full reset works
```bash
npm run migrate -- --reset
```
This drops and recreates the `public` schema, then reapplies everything from scratch.

**What to confirm before I move to Stage 3 (Incident/Report/Resource CRUD):**
- [ ] `npm run migrate` succeeds and lists all 10 tables
- [ ] Running it a second time doesn't error (idempotent)
- [ ] `npm run migrate -- --reset` works (full clean rebuild)
- [ ] `\d incidents` (or similar) in psql shows the columns matching the spec
      (severity, priority, confidence_score, people_at_risk, status, etc.)

## Stage 5 — Setup & Verify

### 1. Get all dependencies (adds Gemini SDK)
```bash
npm install
```

### 2. Optional: add a Gemini key
Get one at https://aistudio.google.com/app/apikey and set `GEMINI_API_KEY` in `.env`.
**You can skip this** — with no key, every classification call automatically uses the
deterministic keyword-based fallback, and the app must not (and does not) crash or block.

### 3. Test auto-classification via report ingestion (no incident_id)
```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "source": "citizen",
    "message": "Large fire with heavy smoke spreading through the warehouse, 12 people trapped",
    "latitude": 22.5645,
    "longitude": 72.9289
  }'
```
Expected: `201`, response `data.incident` is a newly created incident with
`type: "fire"`, `people_at_risk: 12`, and `data.ai_analysis` showing the classification
(`usedFallback: true` if no Gemini key is set, `false` if it is).

### 4. Test on-demand analysis of an existing incident
```bash
curl -X POST http://localhost:4000/api/incidents/<INCIDENT_ID>/analyze
```
Expected: `200`, incident's `type`/`people_at_risk`/`confidence_score` updated from its
description + attached reports.

### 5. Confirm graceful fallback under failure
Temporarily set `GEMINI_API_KEY=invalid-key-test` in `.env`, restart, repeat step 3.
Expected: still `201`, `data.ai_analysis.usedFallback: true`, server logs a warning but
does not crash.

**What to confirm before I move to Stage 6 (Severity engine):**
- [ ] `npm install` succeeds with the new Gemini dependency
- [ ] Report ingestion without `incident_id` creates a classified incident
- [ ] `POST /api/incidents/:id/analyze` works on an existing incident
- [ ] An invalid/missing Gemini key does **not** crash the server — fallback kicks in
- [ ] `ai_analyses` table has rows after these calls (`SELECT * FROM ai_analyses;`)

## Stage 6 — Setup & Verify

Severity now recomputes automatically after every classification (new report
ingestion, `/analyze`, and reports attached to an existing incident).

### 1. Create an incident via report ingestion and check severity
```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "source": "citizen",
    "message": "Large fire with heavy smoke spreading through the warehouse, 12 people trapped",
    "latitude": 22.5645,
    "longitude": 72.9289
  }'
```
Expected: `data.incident.severity` and `data.incident.severity_score` are populated
(not null), and `data.incident.severity_factors` is an array of 9 factor objects with
`points`/`maxPoints`.

### 2. Add a corroborating report and confirm severity can escalate
```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -d '{ "incident_id": "<INCIDENT_ID>", "source": "field_team", "message": "Confirmed - fire spreading to adjacent unit" }'
```
Expected: `200`-range response, and if you then `GET /api/incidents/:id`, `severity_score`
should be equal or higher than before (more corroborating reports + field verification).
Watch server logs / a connected socket client for `incident:severity_changed` if the
severity *level* crossed a threshold.

### 3. Verify threshold boundaries
The engine buckets scores as: 0-25 LOW, 26-50 MODERATE, 51-75 HIGH, 76-100 CRITICAL.
You can sanity-check this directly:
```bash
node -e "console.log(require('./src/services/severity.service').levelForScore(76))"
# -> CRITICAL
```

**What to confirm before I move to Stage 7 (Priority engine):**
- [ ] Every incident created via `/api/reports` has non-null `severity`/`severity_score`
- [ ] `severity_factors` array has 9 entries with explainable `factor`/`points`/`maxPoints`
- [ ] Adding a second/third report to the same incident changes `severity_score`
- [ ] `SEVERITY_CHANGED` rows appear in `activity_logs` when the severity *level* changes
- [ ] `incident:severity_changed` fires over the socket only when the level actually changes
      (not on every score tweak within the same band)

## Stage 7 — Setup & Verify

Priority now recomputes automatically right after severity, in the same pipeline
(`runIncidentScoring`), so every place severity refreshes (report ingestion,
`/analyze`, new report on existing incident) also refreshes priority.

### 1. Check priority after report ingestion
```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "source": "citizen",
    "message": "Large fire with heavy smoke spreading through the warehouse, 12 people trapped",
    "latitude": 22.5645,
    "longitude": 72.9289
  }'
```
Expected: `data.incident.priority` is one of `P1`-`P4`, and `data.incident.priority_reasons`
is a short array of human-readable strings (e.g. `["HIGH severity", "12 people at risk", ...]`).

### 2. Confirm resource scarcity affects priority
Create the incident above with no matching resources in the `resources` table, note the
priority, then `POST /api/resources` to add 3+ `fire_team`/`ambulance` resources with
`status: AVAILABLE`, and re-run `POST /api/incidents/:id/analyze`. The priority score
should drop (or stay the same, never increase) since scarcity points are gone.

### 3. Confirm the time factor only applies pre-dispatch
`PATCH /api/incidents/:id` to set `status: ASSIGNED`, then re-run `/analyze`. Elapsed-time
points should no longer contribute even if the incident is old — check `priority_reasons`
for the absence of an "Unresolved for N minutes" line.

**What to confirm before I move to Stage 8 (Duplicate detection):**
- [ ] Every scored incident has `priority` in `P1`-`P4` and non-empty `priority_reasons`
- [ ] A CRITICAL/HIGH severity incident with many people at risk and no available resources
      lands in `P1`
- [ ] A LOW severity, low-risk incident lands in `P4`
- [ ] `PRIORITY_CHANGED` activity log entries appear when priority actually changes
- [ ] Setting status to `ASSIGNED` stops the time-elapsed factor from contributing

## Stage 8 — Setup & Verify

Duplicate detection now runs automatically inside `POST /api/reports` whenever
`incident_id` is omitted: instead of always creating a new incident, it checks
recent active incidents for a match (same type + close distance + similar text +
close in time) and attaches the report to the existing incident if the relatedness
score is ≥60.

### 1. Send an initial report (creates a new incident)
```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "source": "citizen",
    "message": "Large fire with heavy smoke near the warehouse district, people trapped",
    "latitude": 22.5645,
    "longitude": 72.9289
  }'
```
Note the returned `data.incident.id`. `data.duplicate_detection.matched` should be `false`.

### 2. Send a second, related report nearby and soon after
```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "source": "field_team",
    "message": "Confirmed fire with smoke near the warehouse area, several trapped inside",
    "latitude": 22.5648,
    "longitude": 72.9291
  }'
```
Expected: `data.duplicate_detection.matched: true`, `data.incident.id` equal to the
**first** incident's id (no second incident created), and `data.duplicate_detection.reasons`
listing things like `"same incident type"`, `"Xm apart"`, `"similar text"`,
`"reports received within N minutes"`.

### 3. Send an unrelated report and confirm it does NOT merge
```bash
curl -X POST http://localhost:4000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "source": "citizen",
    "message": "Minor fender bender on the ring road, no injuries",
    "latitude": 22.61,
    "longitude": 72.98
  }'
```
Expected: `data.duplicate_detection.matched: false`, a brand-new `incident.id`.

**What to confirm before I move to Stage 9 (Merge):**
- [ ] A second nearby, similar, soon-after report attaches to the same incident (no dupe)
- [ ] `data.incident.people_at_risk` reflects the max across both reports
- [ ] Activity log shows the duplicate-attach note with `relatednessScore` and `reasons`
- [ ] An unrelated report still creates its own new incident
- [ ] `GET /api/incidents/:id` for the merged case shows 2 reports under `/reports`

## Stage 9 — Setup & Verify

`POST /api/incidents/:id/merge` merges one incident into another: moves all reports
(preserved, not deleted), marks the source `status: MERGED`, and reruns severity/priority
on the target since it now has more corroborating reports.

### 1. Create two separate incidents manually (simulating two independently-created dupes)
```bash
curl -s -X POST http://localhost:4000/api/incidents -H "Content-Type: application/json" -d '{
  "title": "Fire near 4th Street warehouse", "type": "fire",
  "latitude": 22.5645, "longitude": 72.9289, "people_at_risk": 8
}'
curl -s -X POST http://localhost:4000/api/incidents -H "Content-Type: application/json" -d '{
  "title": "Warehouse fire reported by second caller", "type": "fire",
  "latitude": 22.5648, "longitude": 72.9291, "people_at_risk": 15
}'
```
Note both `id`s — call the first `SOURCE_ID`, the second `TARGET_ID`.

### 2. Attach a report to each so we can verify reports survive the merge
```bash
curl -X POST http://localhost:4000/api/reports -H "Content-Type: application/json" -d '{
  "incident_id": "<SOURCE_ID>", "source": "citizen", "message": "Smoke visible from the highway"
}'
curl -X POST http://localhost:4000/api/reports -H "Content-Type: application/json" -d '{
  "incident_id": "<TARGET_ID>", "source": "field_team", "message": "Confirmed active fire, requesting backup"
}'
```

### 3. Merge source into target
```bash
curl -X POST http://localhost:4000/api/incidents/<SOURCE_ID>/merge \
  -H "Content-Type: application/json" \
  -d '{ "target_incident_id": "<TARGET_ID>" }'
```
Expected `200` with `data.reports_moved: 1`, `data.merged_incident.status: "MERGED"`,
`data.target_incident.people_at_risk: 15` (max of 8 and 15).

### 4. Verify reports were preserved and moved
```bash
curl http://localhost:4000/api/incidents/<TARGET_ID>/reports
```
Expected: **2** reports now listed under the target (the original + the one moved from source).

### 5. Verify the source incident is now inert
```bash
curl http://localhost:4000/api/incidents/<SOURCE_ID>
```
Expected: `status: "MERGED"`, `merged_into_incident_id: "<TARGET_ID>"`.

### 6. Verify guard rails
- Re-running the same merge call should now return `409` ("already been merged").
- Merging an incident into itself should return `400`.

**What to confirm before I move to Stage 10 (Resource scoring/recommendation):**
- [ ] Reports move from source to target (count matches, none lost)
- [ ] Source incident's status becomes `MERGED` with `merged_into_incident_id` set
- [ ] Target's `people_at_risk` becomes the max of the two
- [ ] Target's severity/priority reflect the newly-merged report (re-scored)
- [ ] `activity_logs` has `INCIDENT_MERGED` entries for **both** source and target
- [ ] `incident:merged` fires over the socket
- [ ] Double-merging the same source returns `409`, self-merge returns `400`

## Project structure so far
```
backend/
  server.js                # entry point: HTTP server + Socket.IO
  src/
    app.js                 # Express app, middleware, health check
    config/
      env.js               # env var loading + defaults
      db.js                 # pg Pool, query(), withTransaction()
      socket.js             # Socket.IO init + emitEvent() helper
    middleware/
      errorHandler.js       # centralized error + 404 handling
    utils/
      ApiError.js           # operational error class
  db/
    schema.sql               # all 10 tables, enums, indexes, triggers
    migrate.js                # applies schema.sql (supports --reset)
    seed.js                   # placeholder — real seeding in Stage 16
  docker-compose.yml         # local Postgres
  .env.example
  package.json
```

## Next stages (not yet built)
2. PostgreSQL schema (10 tables)
3. Incident/report/resource CRUD
4. API_CONTRACT.md
5. AI classification (Gemini + deterministic fallback)
6. Severity engine
7. Priority engine
8. Duplicate detection
9. Merge
10. Resource scoring
11. Human approval
12. Dynamic Response Recovery
13. Alerts
14. Notifications
15. Analytics
16. Demo seed data
17. Testing
