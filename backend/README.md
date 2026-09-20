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

## Stage 10 — Setup & Verify

`GET /api/incidents/:id/recommendations` ranks currently-`AVAILABLE` resources for an
incident using capability match, distance, availability, workload, ETA, and the
incident's own priority as an urgency factor. Purely a read/ranking endpoint — it does
not assign anything (that's Stage 11).

### 1. Seed a few resources
```bash
curl -X POST http://localhost:4000/api/resources -H "Content-Type: application/json" -d '{
  "name": "Fire Truck 12", "type": "fire_team", "capability": ["firefighting"],
  "latitude": 22.5670, "longitude": 72.9291, "status": "AVAILABLE", "workload": 10
}'
curl -X POST http://localhost:4000/api/resources -H "Content-Type: application/json" -d '{
  "name": "Ambulance 4", "type": "ambulance", "capability": ["medical"],
  "latitude": 22.60, "longitude": 72.95, "status": "AVAILABLE", "workload": 40
}'
curl -X POST http://localhost:4000/api/resources -H "Content-Type: application/json" -d '{
  "name": "Police Unit 7", "type": "police_unit", "capability": ["traffic"],
  "latitude": 22.565, "longitude": 72.929, "status": "AVAILABLE", "workload": 0
}'
```

### 2. Create/classify a fire incident nearby, then get recommendations
```bash
curl -X POST http://localhost:4000/api/reports -H "Content-Type: application/json" -d '{
  "source": "citizen", "message": "Large fire with heavy smoke, several people trapped",
  "latitude": 22.5645, "longitude": 72.9289
}'
# note the returned incident id
curl http://localhost:4000/api/incidents/<INCIDENT_ID>/recommendations
```
Expected: an array sorted best-first, each with `resource`, `score`, `eta`, and a `reasons`
array like `["Capability match", "0.3 km away", "Available", "Low workload", "ETA 1 minutes", ...]`.
The fire truck and ambulance (capability matches for a fire) should outrank the police unit
(no capability match) even though the police unit might be closer/less busy.

### 3. Confirm workload/status affect ranking
`PATCH /api/resources/<FIRE_TRUCK_ID>/status` to `BUSY`, re-run the recommendations call —
that resource's score should drop and a `BUSY`/similar reason should appear.

**What to confirm before I move to Stage 11 (Human approval / assignments):**
- [ ] Results are sorted best-first by `score`
- [ ] A capability mismatch measurably lowers score vs. a matching resource at similar distance
- [ ] `eta` roughly matches distance / `AVERAGE_RESPONSE_SPEED_KMH`
- [ ] Marking a resource `BUSY`/`OFFLINE` lowers its score and appears in `reasons`
- [ ] `?limit=` query param controls how many results come back

## Stage 11 — Setup & Verify

`POST /api/assignments` only **proposes** a resource (status `PENDING_APPROVAL`) — it
never moves anything. Only `POST /api/assignments/:id/approve` actually dispatches the
resource. This is the "AI must not directly dispatch" boundary from the spec.

### 1. Create an incident and a matching available resource
```bash
curl -X POST http://localhost:4000/api/reports -H "Content-Type: application/json" -d '{
  "source": "citizen", "message": "Large fire with heavy smoke, people trapped",
  "latitude": 22.5645, "longitude": 72.9289
}'
# note the incident id
curl -X POST http://localhost:4000/api/resources -H "Content-Type: application/json" -d '{
  "name": "Fire Truck 12", "type": "fire_team", "latitude": 22.5670, "longitude": 72.9291,
  "status": "AVAILABLE", "workload": 10
}'
# note the resource id
```

### 2. Propose the assignment (does NOT move the resource yet)
```bash
curl -X POST http://localhost:4000/api/assignments -H "Content-Type: application/json" -d '{
  "incident_id": "<INCIDENT_ID>", "resource_id": "<RESOURCE_ID>"
}'
```
Expected: `201`, `status: "PENDING_APPROVAL"`, `recommended_score`/`recommended_reasons`/`eta`
populated. Confirm the resource is **still** `AVAILABLE`:
```bash
curl http://localhost:4000/api/resources/<RESOURCE_ID>
```

### 3. Approve it (this is what actually dispatches)
```bash
curl -X POST http://localhost:4000/api/assignments/<ASSIGNMENT_ID>/approve \
  -H "Content-Type: application/json" -d '{}'
```
Expected: `200`, assignment `status: "APPROVED"`, `approved_at` set. Now check the resource:
```bash
curl http://localhost:4000/api/resources/<RESOURCE_ID>
```
Expected: `status: "ASSIGNED"`, `current_incident_id` set to the incident, `eta` set. And the
incident:
```bash
curl http://localhost:4000/api/incidents/<INCIDENT_ID>
```
Expected: `status: "ASSIGNED"` (if it was still `REPORTED`/`VERIFIED`).

### 4. Confirm guard rails
- Proposing an assignment for a non-`AVAILABLE` resource → `409`.
- Approving an already-approved assignment again → `409`.
- Approving when the resource became unavailable in the meantime → `409`.

**What to confirm before I move to Stage 12 (Dynamic Response Recovery):**
- [ ] Creating an assignment does **not** change the resource's status
- [ ] Approving an assignment does — resource becomes `ASSIGNED` with the incident linked
- [ ] `RESOURCE_RECOMMENDED` logged on create, `RESOURCE_ASSIGNED` logged on approve
- [ ] `resource:assigned` and `resource:updated` fire over the socket on approval
- [ ] Incident priority reflects reduced resource availability after approval (rescored)
- [ ] Re-approving, or assigning an unavailable resource, returns `409`

## Stage 12 — Setup & Verify (⭐ the major differentiator)

Full flow: assign a resource → simulate it failing mid-response → get scored
alternatives + delay impact → commander approves a specific replacement via `/recover`.

### 1. Set up: incident with an approved (active) assignment
```bash
curl -X POST http://localhost:4000/api/reports -H "Content-Type: application/json" -d '{
  "source": "citizen", "message": "Large fire, people trapped, heavy smoke",
  "latitude": 22.5645, "longitude": 72.9289
}'
# note INCIDENT_ID
curl -X POST http://localhost:4000/api/resources -H "Content-Type: application/json" -d '{
  "name": "Fire Truck A", "type": "fire_team", "latitude": 22.5670, "longitude": 72.9291,
  "status": "AVAILABLE", "workload": 10
}'
# note RESOURCE_A_ID
curl -X POST http://localhost:4000/api/resources -H "Content-Type: application/json" -d '{
  "name": "Fire Truck B (backup)", "type": "fire_team", "latitude": 22.58, "longitude": 72.94,
  "status": "AVAILABLE", "workload": 20
}'
# note RESOURCE_B_ID - this will be the alternative
curl -X POST http://localhost:4000/api/assignments -H "Content-Type: application/json" -d '{
  "incident_id": "<INCIDENT_ID>", "resource_id": "<RESOURCE_A_ID>"
}'
# note ASSIGNMENT_ID, then approve it:
curl -X POST http://localhost:4000/api/assignments/<ASSIGNMENT_ID>/approve -H "Content-Type: application/json" -d '{}'
```

### 2. Simulate Fire Truck A failing en route
```bash
curl -X POST http://localhost:4000/api/incidents/<INCIDENT_ID>/simulate-resource-failure \
  -H "Content-Type: application/json" -d '{ "resource_id": "<RESOURCE_A_ID>" }'
```
Expected `200` with:
- `failed_resource.status: "UNAVAILABLE"`
- `compromised_assignment.status: "FAILED"` (same id as `ASSIGNMENT_ID`)
- `alert.type: "RESOURCE_FAILURE"`, `alert.severity: "CRITICAL"`
- `alternatives`: array including Fire Truck B, scored/ranked
- `delay_impact_minutes`: a number (new best ETA minus original ETA)

### 3. Commander approves the replacement
```bash
curl -X POST http://localhost:4000/api/incidents/<INCIDENT_ID>/recover \
  -H "Content-Type: application/json" \
  -d '{ "assignment_id": "<ASSIGNMENT_ID>", "new_resource_id": "<RESOURCE_B_ID>" }'
```
Expected `200` with `assignment.status: "APPROVED"` (new assignment, `resource_id` = Fire Truck B),
`resource.status: "ASSIGNED"`. Then check:
```bash
curl http://localhost:4000/api/incidents/<INCIDENT_ID>/reports   # unaffected
curl http://localhost:4000/api/resources/<RESOURCE_A_ID>         # still UNAVAILABLE
curl http://localhost:4000/api/resources/<RESOURCE_B_ID>         # now ASSIGNED
```
And the original assignment should now read `status: "REASSIGNED"`:
```bash
curl http://localhost:4000/api/assignments/<ASSIGNMENT_ID>
```

### 4. Confirm guard rails
- Simulating failure on a resource with no active assignment on that incident → `409`.
- Calling `/recover` with an `assignment_id` that isn't `FAILED` → `409`.
- Calling `/recover` with a `new_resource_id` that isn't `AVAILABLE` → `409`.

**What to confirm before I move to Stage 13 (Alerts):**
- [ ] Full failure → alternatives → recover flow works end-to-end
- [ ] `resource:failed`, `alert:created`, `resource:reassigned`, `incident:updated` all fire
- [ ] `RESOURCE_FAILED`, `ALERT_CREATED`, `RESOURCE_REASSIGNED` all appear in activity logs
- [ ] The original assignment ends at `REASSIGNED`, the new one at `APPROVED`
- [ ] `delay_impact_minutes` is a sane number given the two resources' distances
- [ ] All three guard rails return `409` as expected

## Stage 13 — Setup & Verify

Alerts now come from two sources: `RESOURCE_FAILURE` alerts raised explicitly during
Stage 12's `simulate-resource-failure`, and the other six alert types
(`CRITICAL_INCIDENT`, `SEVERITY_ESCALATION`, `RESPONSE_DELAY`, `RESOURCE_SHORTAGE`,
`UNRESOLVED_HIGH_PRIORITY`, `CASCADING_IMPACT`) which are evaluated automatically every
time severity/priority get rescored (report ingestion, `/analyze`, merge, assignment
approval, recovery). Each alert type is deduplicated per incident while unacknowledged.

### 1. Trigger a CRITICAL_INCIDENT + SEVERITY_ESCALATION
```bash
curl -X POST http://localhost:4000/api/reports -H "Content-Type: application/json" -d '{
  "source": "citizen",
  "message": "Massive chemical plant explosion, toxic fumes spreading, 60 people trapped, building collapsing",
  "latitude": 22.5645, "longitude": 72.9289
}'
```
This alone should reach CRITICAL severity on first classification (no escalation alert
yet, since there's no "before" state) - then add a corroborating report to push it further
or just check `GET /api/alerts` for `CRITICAL_INCIDENT`, `RESOURCE_SHORTAGE` (if you have no
matching resources yet), and possibly `CASCADING_IMPACT` (if `people_at_risk` >= 50).

### 2. List and filter alerts
```bash
curl http://localhost:4000/api/alerts
curl "http://localhost:4000/api/alerts?acknowledged=false"
curl "http://localhost:4000/api/alerts?type=CRITICAL_INCIDENT"
curl "http://localhost:4000/api/alerts?incident_id=<INCIDENT_ID>"
```

### 3. Acknowledge one
```bash
curl -X PATCH http://localhost:4000/api/alerts/<ALERT_ID>/acknowledge -H "Content-Type: application/json" -d '{}'
```
Expected: `acknowledged: true`, `acknowledged_at` set. `ALERT_ACKNOWLEDGED` logged.

### 4. Confirm dedup
Send another similar corroborating report to the same still-CRITICAL incident — you
should **not** get a second `CRITICAL_INCIDENT` alert while the first is unacknowledged.
Acknowledge it, then trigger the condition again — a new one should be raised.

**What to confirm before I move to Stage 14 (Notifications):**
- [ ] `RESOURCE_FAILURE` alerts still work as before (Stage 12)
- [ ] A first-time CRITICAL classification raises `CRITICAL_INCIDENT` (not `SEVERITY_ESCALATION`
      — there's no "before" severity to escalate from)
- [ ] A later severity increase on an already-scored incident raises `SEVERITY_ESCALATION`
- [ ] `GET /api/alerts` filters work (`acknowledged`, `type`, `incident_id`)
- [ ] Acknowledging sets `acknowledged`/`acknowledged_by`/`acknowledged_at` and logs `ALERT_ACKNOWLEDGED`
- [ ] The same alert type doesn't duplicate while unacknowledged, but can re-raise after acknowledgment

## Stage 14 — Setup & Verify

Notifications are backend-only per spec (no dedicated listing endpoint required) - they're
created as rows in `notifications` and pushed live via the `notification:created` socket
event. They're currently broadcast (`user_id: null`) since there's no per-user auth/session
wiring yet; `notification.model.js` already supports per-user notifications if that's added
later.

Notifications are raised at 4 points:
- Every alert (all 6 auto-triggered types from Stage 13 + `RESOURCE_FAILURE` from Stage 12)
- Resource assignment approval (Stage 11)
- Resource reassignment / recovery (Stage 12)

### 1. Connect a Socket.IO client and watch for events
Quick way to check without writing a client: open the Node REPL or a small script:
```js
const { io } = require('socket.io-client'); // npm install socket.io-client -D if needed, or use browser devtools
const socket = io('http://localhost:4000');
socket.on('notification:created', (n) => console.log('NOTIFICATION:', n));
```
(Or just watch server logs / use a REST client that polls, if you'd rather not wire up a
socket client yet — the important thing is the row landing in the table, see step 3.)

### 2. Trigger a notification via assignment approval
Repeat the Stage 11 flow (create incident, create resource, propose assignment, approve it)
— on approval you should see a `notification:created` event / row with
`type: "resource_assigned"`.

### 3. Confirm rows exist directly
```bash
docker exec -it incident-commander-db psql -U incident_user -d incident_commander \
  -c "SELECT title, type, related_incident_id, created_at FROM notifications ORDER BY created_at DESC LIMIT 10;"
```

**What to confirm before I move to Stage 15 (Analytics):**
- [ ] Approving an assignment creates a `resource_assigned` notification
- [ ] Recovering a failed assignment creates a `resource_reassigned` notification
- [ ] Every alert type (Stage 12 + 13) also produces a matching notification
- [ ] `notification:created` fires over the socket for each
- [ ] Notification `related_incident_id` matches the incident that triggered it

## Stage 15 — Setup & Verify

`GET /api/analytics` returns a single aggregate snapshot, all computed live from the DB
(no caching yet — fine at hackathon scale).

### 1. Hit it after you've generated some data from earlier stages
```bash
curl http://localhost:4000/api/analytics | python3 -m json.tool
```
Expected shape:
```json
{
  "success": true,
  "data": {
    "total_incidents": 5,
    "critical_incidents": 1,
    "incidents_by_type": { "fire": 3, "road_accident": 2 },
    "incidents_by_status": { "REPORTED": 2, "ASSIGNED": 2, "MERGED": 1 },
    "avg_response_time_minutes": 4.2,
    "response_delays": 0,
    "resource_utilization_pct": 33.3,
    "resource_shortages": 1,
    "affected_areas": [{ "latitude": 22.56, "longitude": 72.93, "incident_count": 3 }]
  }
}
```

### 2. Sanity-check a couple of numbers by hand
- `total_incidents` should equal `SELECT COUNT(*) FROM incidents WHERE status != 'MERGED'`
- `avg_response_time_minutes` should roughly match the time between your test incidents'
  `created_at` and their first assignment's `approved_at` (only counts incidents that have
  had at least one approved assignment — `null` if none yet)
- `resource_utilization_pct` = resources not `AVAILABLE`/`OFFLINE`, as a % of all resources

**What to confirm before I move to Stage 16 (Demo seed data):**
- [ ] All 9 fields present and correctly typed (numbers, objects, array)
- [ ] `incidents_by_type`/`incidents_by_status` keys match your actual data
- [ ] `avg_response_time_minutes` is `null` (not `NaN`/error) when no assignments have been approved yet
- [ ] `affected_areas` clusters nearby incidents together (same ~1km grid cell)
- [ ] Endpoint responds quickly even with the handful of records you've created so far

## Stage 16 — Setup & Verify

`npm run seed` (or `npm run reset-db` for a full wipe+reseed) populates every table with
deterministic demo data — same seed (42) produces the same dataset every run.

### 1. Seed the database
```bash
npm run reset-db
```
Expected final log line: `[seed] 25 incidents, ~66 reports, 18 resources, 6 assignments, 7 alerts.`
(exact assignment/alert counts depend on which incidents matched the templates, but should be close)

### 2. Sanity-check counts against the spec's targets
```bash
docker exec -it incident-commander-db psql -U incident_user -d incident_commander -c "
SELECT
  (SELECT COUNT(*) FROM incidents) AS incidents,
  (SELECT COUNT(*) FROM reports) AS reports,
  (SELECT COUNT(*) FROM resources) AS resources,
  (SELECT COUNT(*) FROM hospitals) AS hospitals;
"
```
Expected: incidents 20-30, reports 50-100, resources 15-20, hospitals 5-10.

### 3. Confirm the built-in showcase scenarios
- **Duplicate reports**: `GET /api/incidents` → find "Warehouse fire on 4th Street" → `GET /api/incidents/:id/reports` should show 3 reports (original + corroborating + the merged incident's report).
- **A completed merge**: one incident has `status: "MERGED"` with `merged_into_incident_id` pointing at the warehouse fire.
- **A completed failure/recovery**: `GET /api/assignments/:id` for the warehouse fire's original assignment shows `status: "REASSIGNED"`; a second assignment on the same incident shows `status: "APPROVED"` with `replaced_assignment_id` set.
- **All 7 alert types**: `GET /api/alerts` should include one each of `CRITICAL_INCIDENT`, `SEVERITY_ESCALATION`, `RESOURCE_FAILURE`, `RESPONSE_DELAY`, `RESOURCE_SHORTAGE`, `UNRESOLVED_HIGH_PRIORITY`, `CASCADING_IMPACT`.
- **Resource shortages/failures**: several resources seeded as `UNAVAILABLE`/`OFFLINE`/`BUSY`.

### 4. Confirm determinism
Run `npm run reset-db` twice — the two runs should produce identical incident titles,
types, severities, and counts (timestamps will shift slightly since they're relative to
"now", but the shape of the data is fixed by the seeded PRNG).

**What to confirm before I move to Stage 17 (Testing):**
- [ ] All four table counts land within the spec's ranges
- [ ] The duplicate-report showcase incident has multiple reports
- [ ] The merge showcase pair exists and is linked correctly
- [ ] The failure/recovery showcase assignments exist (`FAILED`→`REASSIGNED` + new `APPROVED`)
- [ ] All 7 alert types are present
- [ ] Re-running the seed is idempotent-in-shape (same data shape every time)

## Stage 17 — Testing

`scripts/test-full-flow.js` is a comprehensive end-to-end test hitting every stage's
endpoints against a live server, with real pass/fail assertions (not just printed JSON).

### Run it
```bash
npm run dev            # terminal 1
npm run reset-db        # terminal 2 (fresh data first)
npm run test:full       # terminal 2
```
Expected: a `✓`-per-assertion log ending in `Results: N passed, 0 failed`. It covers:
health check → CRUD → AI classification/severity/priority/duplicate-detection →
recommendations → assignment propose/approve → resource-failure simulate/recover →
merge → alerts list/acknowledge → analytics → guard rails (409s/404s/400s).

If anything fails, the script prints exactly which assertion failed and the run exits
non-zero (`echo $?` after running, or check CI exit code).

**What to confirm — this is the final gate before calling the backend done:**
- [ ] `npm run test:full` passes with 0 failures on a freshly-seeded DB
- [ ] Re-running the whole `npm install && docker compose up -d && npm run reset-db &&
      npm run dev` sequence from scratch on a clean checkout works (the true "does this
      hand off cleanly to the frontend dev" test)

## Backend folder structure (final)
```
backend/
  server.js                        # entry point: HTTP server + Socket.IO
  package.json
  .env.example
  docker-compose.yml                # local Postgres
  API_CONTRACT.md                    # frozen API contract for the frontend
  README.md                          # this file
  db/
    schema.sql                      # all 10 tables, enums, indexes, triggers
    migrate.js                       # applies schema.sql (supports --reset)
    seed.js                          # deterministic demo data (Stage 16)
  scripts/
    test-api.js                     # basic Stage 3 CRUD smoke test
    test-full-flow.js                 # comprehensive end-to-end test (Stage 17)
  src/
    app.js                          # Express app, middleware, route mounting, health check
    config/
      env.js                        # env var loading + defaults
      db.js                          # pg Pool, query(), withTransaction()
      socket.js                      # Socket.IO init + emitEvent() helper
    middleware/
      errorHandler.js                # centralized error + 404 handling
    utils/
      ApiError.js                    # operational error class
      validators.js                  # all Zod request-validation schemas
    models/                          # one file per table - raw SQL, no ORM
      incident.model.js
      report.model.js
      resource.model.js
      assignment.model.js
      alert.model.js
      notification.model.js
      activityLog.model.js
      aiAnalysis.model.js
      analytics.model.js
    services/                        # business logic / engines
      ai.service.js                  # Gemini classification + deterministic fallback
      gemini.client.js                # Gemini SDK wrapper
      severity.service.js             # severity scoring (pure function)
      priority.service.js             # priority scoring (pure function)
      duplicateDetection.service.js    # relatedness scoring (pure function)
      resourceRecommendation.service.js # resource scoring/ranking (pure function)
      incidentPipeline.service.js      # orchestrates severity+priority+alerts rescoring
      merge.service.js                 # incident merge (transactional)
      assignment.service.js            # propose/approve assignment flow
      dynamicRecovery.service.js        # ⭐ simulate-failure + recover
      alertTriggers.service.js          # auto-raises the 6 non-failure alert types
      notification.service.js           # creates + broadcasts notifications
    controllers/                     # one per resource - thin, calls services/models
      incidents.controller.js
      reports.controller.js
      resources.controller.js
      recommendations.controller.js
      assignments.controller.js
      alerts.controller.js
      analytics.controller.js
    routes/                          # one per resource
      incidents.routes.js
      reports.routes.js
      resources.routes.js
      assignments.routes.js
      alerts.routes.js
      analytics.routes.js
```

## Database setup
```bash
cp .env.example .env      # edit DATABASE_URL / GEMINI_API_KEY if needed
docker compose up -d       # starts local Postgres (see docker-compose.yml)
npm run migrate             # applies db/schema.sql (10 tables, enums, indexes, triggers)
npm run seed                # or: npm run reset-db  (wipes + reseeds in one step)
```

## .env.example
See `.env.example` in the repo root — covers `PORT`, `DATABASE_URL` (+ individual Postgres
vars for docker-compose), `GEMINI_API_KEY`/`GEMINI_MODEL`/`AI_TIMEOUT_MS`, duplicate-detection
tuning (`DUPLICATE_DISTANCE_METERS`, `DUPLICATE_TIME_WINDOW_MIN`), and resource-recommendation
tuning (`RESOURCE_SEARCH_RADIUS_METERS`, `AVERAGE_RESPONSE_SPEED_KMH`). Every value has a
sane default — the app runs with just `docker compose up -d` and no Gemini key.

## API_CONTRACT.md
See `API_CONTRACT.md` in the repo root — the frozen contract the frontend team builds
against: every endpoint's request/response shape, all enums, all Socket.IO events.

## Setup commands
```bash
npm install
cp .env.example .env
docker compose up -d
npm run migrate
```

## Demo seed command
```bash
npm run seed        # populate a fresh/existing DB
npm run reset-db      # wipe + reseed in one step (recommended before a demo)
```

## Test commands
```bash
npm run dev           # start the server (terminal 1)
npm run test:api        # basic CRUD smoke test (Stage 3 scope)
npm run test:full        # comprehensive end-to-end test across every stage (Stage 17)
```

## List of completed features
- Backend foundation: Express + Postgres pool + Socket.IO, centralized error handling,
  health check, graceful shutdown, process-level crash guards
- PostgreSQL schema: all 10 tables, enums, indexes, `updated_at` triggers
- Full CRUD: incidents, reports, resources
- `API_CONTRACT.md` — frozen contract for the frontend
- AI classification via Gemini with a deterministic keyword-based fallback (app never
  crashes or blocks on AI failure)
- Deterministic, explainable severity engine (9 weighted factors → LOW/MODERATE/HIGH/CRITICAL)
- Deterministic, explainable priority engine (severity + people at risk + urgency + spread +
  resource availability + time → P1-P4)
- Duplicate detection (distance + text similarity + category + time proximity →
  relatedness score + reasons), wired into report ingestion
- Incident merging (transactional, preserves reports, re-scores the target)
- Resource recommendation/scoring engine (capability + distance + availability + workload +
  ETA + incident priority → ranked list with reasons)
- Human-approval assignment flow (AI never dispatches directly — propose → approve)
- ⭐ Dynamic Response Recovery: simulate a resource failing mid-response, get scored
  alternatives + delay impact, commander approves a specific reassignment
- Alerts: all 7 types (`CRITICAL_INCIDENT`, `SEVERITY_ESCALATION`, `RESOURCE_FAILURE`,
  `RESPONSE_DELAY`, `RESOURCE_SHORTAGE`, `UNRESOLVED_HIGH_PRIORITY`, `CASCADING_IMPACT`),
  auto-triggered + deduplicated, plus list/acknowledge endpoints
- In-app notifications, broadcast live via `notification:created`
- Analytics aggregate endpoint (9 metrics)
- Deterministic demo seed data: 25 incidents, ~66 reports, 18 resources, 7 hospitals,
  built-in duplicate/merge/failure-recovery showcase scenarios
- Comprehensive end-to-end test script with real assertions
- Full activity-log trail and Socket.IO events across every mutation

## Known limitations
- **No authentication/authorization.** There's no login system, so `created_by`/
  `approved_by`/`acknowledged_by` are optional UUIDs the caller supplies (or omits) rather
  than derived from a session. Notifications are broadcast to everyone rather than targeted
  per-user. Adding real auth would be the top priority beyond hackathon scope.
- **Text similarity is TF-cosine, not embeddings.** Deliberate choice to avoid a second paid
  API dependency and keep duplicate detection deterministic/free, but it's less semantically
  aware than a real embedding model would be.
- **No pagination on some list endpoints** (`/api/resources`, `/api/alerts`) — fine at demo
  scale, would need it under real load.
- **No automated test suite (Jest/etc.)** — `scripts/test-full-flow.js` is a real
  assertion-based integration test but runs against a live server rather than in CI with
  mocks; there's no unit-test coverage of the pure scoring functions beyond the manual
  offline checks done during development.
- **No rate limiting** on the AI classification path — a burst of report submissions would
  fire that many Gemini calls (mitigated somewhat by the deterministic fallback on timeout,
  but not on cost).
- **Alert/notification triggers run on read-path rescoring, not a background scheduler.**
  Time-based conditions (`RESPONSE_DELAY`, `UNRESOLVED_HIGH_PRIORITY`) only get evaluated
  when something touches an incident (a new report, an approval, etc.) — a completely
  quiet incident won't surface a delay alert until it's next touched. A cron-style sweep
  would fix this but wasn't in scope for the stages requested.
- **Geographic calculations assume a small/city-scale area** (haversine is fine at this
  scale; no need for anything more sophisticated given the spec's scope).
- **This backend was never executed against a live Postgres in this environment** (the
  sandbox used to build it has no network/Docker access) — every stage was verified via
  syntax checks and, wherever the logic was pure/offline-testable, direct execution with
  real assertions (severity scoring, priority scoring, duplicate-detection scoring,
  resource-recommendation ranking, alert-trigger branching, deterministic AI fallback, and
  the seed script's count math were all exercised this way). DB-dependent stages (schema,
  CRUD, merge, assignments, dynamic recovery, alerts persistence, analytics, seeding) need
  your local `npm run test:full` run as the final verification — see Stage 17 above.
