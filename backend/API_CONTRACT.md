# API Contract — AI Incident Commander

Base URL (dev): `http://localhost:4000`
All request/response bodies are JSON. All responses use the envelope:

```json
{ "success": true, "data": { ... } }
```
or on error:
```json
{ "success": false, "error": { "message": "...", "details": "..." } }
```
List endpoints additionally include a `pagination` object (see Incidents → List).

**Status legend:** ✅ Implemented (Stage 1-3) · 🚧 Planned (shape is final; logic lands in the stage noted)

> Once the frontend begins integration, response **shapes will not change** without a version note
> at the top of this file. New optional fields may be added; existing fields will not be renamed,
> retyped, or removed silently.

---

## Enums (shared vocabulary)

| Enum | Values |
|---|---|
| `incident.type` | `fire`, `flood`, `road_accident`, `medical_emergency`, `industrial_accident`, `building_collapse`, `chemical_hazard`, `landslide`, `other` |
| `incident.status` | `REPORTED`, `VERIFIED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `MERGED`, `CLOSED` |
| `incident.severity` | `LOW`, `MODERATE`, `HIGH`, `CRITICAL` |
| `incident.priority` | `P1`, `P2`, `P3`, `P4` |
| `report.source` | `citizen`, `emergency_call`, `sensor`, `field_team`, `admin` |
| `resource.type` | `ambulance`, `fire_team`, `police_unit`, `rescue_team`, `medical_team`, `rescue_vehicle`, `equipment`, `hospital`, `shelter` |
| `resource.status` | `AVAILABLE`, `ASSIGNED`, `EN_ROUTE`, `ON_SCENE`, `BUSY`, `UNAVAILABLE`, `OFFLINE` |
| `assignment.status` | `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `ACTIVE`, `COMPLETED`, `FAILED`, `REASSIGNED` |
| `alert.type` | `CRITICAL_INCIDENT`, `SEVERITY_ESCALATION`, `RESOURCE_FAILURE`, `RESPONSE_DELAY`, `RESOURCE_SHORTAGE`, `UNRESOLVED_HIGH_PRIORITY`, `CASCADING_IMPACT` |
| `activity.action` | `REPORT_RECEIVED`, `INCIDENT_CREATED`, `INCIDENT_CLASSIFIED`, `INCIDENT_MERGED`, `SEVERITY_CHANGED`, `PRIORITY_CHANGED`, `RESOURCE_RECOMMENDED`, `RESOURCE_ASSIGNED`, `RESOURCE_FAILED`, `RESOURCE_REASSIGNED`, `ALERT_CREATED`, `ALERT_ACKNOWLEDGED`, `INCIDENT_RESOLVED` |

---

## Incident object shape

```json
{
  "id": "uuid",
  "title": "Warehouse fire on 4th Street",
  "type": "fire",
  "description": "Large fire reported near warehouse district",
  "latitude": 22.5645,
  "longitude": 72.9289,
  "severity": "HIGH",
  "severity_score": 78,
  "severity_factors": [
    { "factor": "People at risk", "value": 30 }
  ],
  "priority": "P1",
  "priority_reasons": ["High severity", "12 people at risk", "Nearest resource 6 min away"],
  "confidence_score": 91.5,
  "people_at_risk": 12,
  "status": "VERIFIED",
  "merged_into_incident_id": null,
  "created_by": null,
  "created_at": "2026-09-19T10:00:00.000Z",
  "updated_at": "2026-09-19T10:05:00.000Z",
  "resolved_at": null
}
```
`severity`, `severity_score`, `severity_factors`, `priority`, `priority_reasons`, `confidence_score`
are `null`/`[]` until the Severity/Priority/Confidence engines (Stages 6-8, 12) run via
`POST /api/incidents/:id/analyze`.

---

## Incidents

### `GET /api/incidents` ✅
Query params (all optional): `status`, `type`, `severity`, `priority`, `page` (default 1), `limit` (default 20, max 100), `sort` (`created_at` | `-created_at` | `severity_score` | `-severity_score`, default `-created_at`).

**Response 200**
```json
{
  "success": true,
  "data": [ /* array of Incident */ ],
  "pagination": { "page": 1, "limit": 20, "total": 42 }
}
```

### `POST /api/incidents` ✅
**Body**
```json
{
  "title": "string, required",
  "type": "incident.type, default 'other'",
  "description": "string, optional",
  "latitude": "number, required",
  "longitude": "number, required",
  "people_at_risk": "int, default 0",
  "status": "incident.status, optional, default REPORTED"
}
```
**Response 201** `{ "success": true, "data": Incident }`
Emits `incident:created`. Logs `INCIDENT_CREATED`.

### `GET /api/incidents/:id` ✅
**Response 200** `{ "success": true, "data": Incident }` · **404** if not found.

### `PATCH /api/incidents/:id` ✅
**Body** — any subset of: `title`, `type`, `description`, `latitude`, `longitude`,
`people_at_risk`, `status`, `severity`, `priority`.
**Response 200** `{ "success": true, "data": Incident }`
Emits `incident:updated` (always), `incident:severity_changed` (if `severity` changed).
Logs `SEVERITY_CHANGED` / `INCIDENT_RESOLVED` where applicable.

### `GET /api/incidents/:id/reports` ✅
Not in the original minimum list but needed by the frontend to show correlated reports.
**Response 200** `{ "success": true, "data": [ /* array of Report */ ] }`

### `POST /api/incidents/:id/analyze` 🚧 (Stage 5-8, 12)
Runs AI classification + severity + priority + confidence scoring on an incident
(using its attached reports) and persists the results onto the incident row.
**Response 200** `{ "success": true, "data": Incident }` (now populated with severity/priority/confidence)
Emits `incident:updated`, and `incident:severity_changed` if severity changed.

### `POST /api/incidents/:id/merge` 🚧 (Stage 9)
**Body** `{ "target_incident_id": "uuid" }` — merges `:id` into `target_incident_id`.
**Response 200**
```json
{
  "success": true,
  "data": {
    "merged_incident": Incident,
    "target_incident": Incident,
    "reports_moved": 3
  }
}
```
Emits `incident:merged`. Logs `INCIDENT_MERGED`.

### `POST /api/incidents/:id/briefing` 🚧 (Stage 12)
**Response 200**
```json
{
  "success": true,
  "data": {
    "incident_id": "uuid",
    "summary": "string - operational briefing text",
    "severity": "HIGH",
    "affected_people": 12,
    "evidence_count": 5,
    "current_response": ["2 fire trucks en route", "1 ambulance on scene"],
    "current_risks": ["Structural instability", "Spreading to adjacent unit"],
    "recent_changes": ["Severity escalated MODERATE -> HIGH at 10:04"],
    "recommended_action": "string"
  }
}
```

### `POST /api/incidents/:id/simulate-resource-failure` 🚧 (Stage 11)
**Body** `{ "resource_id": "uuid" }`
**Response 200**
```json
{
  "success": true,
  "data": {
    "failed_resource": Resource,
    "compromised_assignment": Assignment,
    "alert": Alert,
    "alternatives": [ { "resource": Resource, "score": 84, "eta": 9, "reasons": ["..."] } ],
    "delay_impact_minutes": 6
  }
}
```
Emits `resource:failed`, `alert:created`. Logs `RESOURCE_FAILED`, `ALERT_CREATED`.

### `POST /api/incidents/:id/recover` 🚧 (Stage 11)
**Body** `{ "assignment_id": "uuid", "new_resource_id": "uuid" }` — commander-approved reassignment
after reviewing `/simulate-resource-failure` alternatives.
**Response 200** `{ "success": true, "data": { "assignment": Assignment, "resource": Resource } }`
Emits `resource:reassigned`, `incident:updated`. Logs `RESOURCE_REASSIGNED`.

---

## Reports

### `POST /api/reports` ✅ (Stage 3) → extended 🚧 (Stage 5)
**Body**
```json
{
  "incident_id": "uuid, optional",
  "source": "report.source, required",
  "message": "string, required",
  "latitude": "number, optional",
  "longitude": "number, optional",
  "reporter_name": "string, optional",
  "reporter_contact": "string, optional",
  "confidence": "number 0-100, optional",
  "metadata": "object, optional"
}
```
**Response 201** `{ "success": true, "data": Report }`

Report object:
```json
{
  "id": "uuid",
  "incident_id": "uuid | null",
  "source": "citizen",
  "message": "Heavy smoke visible from the highway",
  "latitude": 22.5648,
  "longitude": 72.9291,
  "reporter_name": null,
  "reporter_contact": null,
  "timestamp": "2026-09-19T10:01:00.000Z",
  "confidence": null,
  "metadata": {},
  "created_at": "2026-09-19T10:01:00.000Z"
}
```

**Stage 3 behavior (current):** if `incident_id` is provided, the report is attached directly;
otherwise it is stored with `incident_id: null`.
**Stage 5 behavior (upcoming, additive):** when `incident_id` is omitted, the AI classification +
duplicate-detection pipeline runs automatically — it either creates a new incident or attaches the
report to an existing related incident — and the response will include this under `data.ai_analysis`
and `data.incident` in addition to the existing `data` report fields. Existing fields are unaffected.

Emits `report:created`, and `incident:updated` if attached. Logs `REPORT_RECEIVED`.

---

## Resources

### `GET /api/resources` ✅
Query params (optional): `status`, `type`.
**Response 200** `{ "success": true, "data": [ /* array of Resource */ ] }`

### `POST /api/resources` ✅
**Body**
```json
{
  "name": "string, required",
  "type": "resource.type, required",
  "capability": "string[], default []",
  "latitude": "number, required",
  "longitude": "number, required",
  "status": "resource.status, default AVAILABLE",
  "workload": "int 0-100, default 0"
}
```
**Response 201** `{ "success": true, "data": Resource }`

Resource object:
```json
{
  "id": "uuid",
  "name": "Fire Truck 12",
  "type": "fire_team",
  "capability": ["firefighting", "rescue"],
  "latitude": 22.5701,
  "longitude": 72.9345,
  "status": "AVAILABLE",
  "workload": 0,
  "eta": null,
  "current_incident_id": null,
  "created_at": "...",
  "updated_at": "..."
}
```

### `PATCH /api/resources/:id/status` ✅
**Body** `{ "status": "resource.status, required", "eta": "int, optional", "current_incident_id": "uuid | null, optional" }`
**Response 200** `{ "success": true, "data": Resource }`
Emits `resource:updated`. Logs `RESOURCE_ASSIGNED` when transitioning into `ASSIGNED`.

### `GET /api/incidents/:id/recommendations` 🚧 (Stage 10)
**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "resource": Resource,
      "score": 91,
      "eta": 6,
      "reasons": ["Capability match", "2.1 km away", "Available", "Low workload", "ETA 6 minutes"]
    }
  ]
}
```

---

## Assignments 🚧 (Stage 10)

### `POST /api/assignments`
**Body** `{ "incident_id": "uuid", "resource_id": "uuid" }`
**Response 201** `{ "success": true, "data": Assignment }` with `status: "PENDING_APPROVAL"`.
Logs `RESOURCE_RECOMMENDED`.

### `POST /api/assignments/:id/approve`
**Body** `{ "approved_by": "uuid, optional" }`
**Response 200** `{ "success": true, "data": Assignment }` with `status: "APPROVED"`, resource
transitioned to `ASSIGNED`/`EN_ROUTE`.
Emits `resource:assigned`. Logs `RESOURCE_ASSIGNED`.

Assignment object:
```json
{
  "id": "uuid",
  "incident_id": "uuid",
  "resource_id": "uuid",
  "status": "PENDING_APPROVAL",
  "recommended_score": 91,
  "recommended_reasons": ["Capability match", "2.1 km away"],
  "eta": 6,
  "replaced_assignment_id": null,
  "approved_by": null,
  "approved_at": null,
  "created_at": "...",
  "updated_at": "..."
}
```

---

## Alerts 🚧 (Stage 13)

### `GET /api/alerts`
Query params (optional): `acknowledged` (`true`/`false`), `type`, `incident_id`.
**Response 200** `{ "success": true, "data": [ /* array of Alert */ ] }`

### `PATCH /api/alerts/:id/acknowledge`
**Body** `{ "acknowledged_by": "uuid, optional" }`
**Response 200** `{ "success": true, "data": Alert }`
Logs `ALERT_ACKNOWLEDGED`.

Alert object:
```json
{
  "id": "uuid",
  "incident_id": "uuid | null",
  "type": "CRITICAL_INCIDENT",
  "severity": "CRITICAL",
  "message": "Incident escalated to CRITICAL severity",
  "metadata": {},
  "acknowledged": false,
  "acknowledged_by": null,
  "acknowledged_at": null,
  "created_at": "..."
}
```

---

## Analytics 🚧 (Stage 15)

### `GET /api/analytics`
**Response 200**
```json
{
  "success": true,
  "data": {
    "total_incidents": 42,
    "critical_incidents": 5,
    "incidents_by_type": { "fire": 10, "flood": 8, "road_accident": 15 },
    "incidents_by_status": { "REPORTED": 3, "RESOLVED": 30 },
    "avg_response_time_minutes": 8.4,
    "response_delays": 4,
    "resource_utilization_pct": 62.5,
    "resource_shortages": 2,
    "affected_areas": [{ "latitude": 22.56, "longitude": 72.93, "incident_count": 6 }]
  }
}
```

---

## Notifications (backend-only, no listing endpoint required by spec) 🚧 (Stage 14)
In-app notification rows are created internally by other engines (alerts, assignments, etc.) and
pushed live via the `notification:created` socket event. No REST endpoint is required per spec, but
`GET /api/notifications?user_id=` may be added later if the frontend needs a fetch-on-load fallback.

---

## Socket.IO Events

Connect to the same origin/port as the REST API (`http://localhost:4000`), no namespace.

| Event | Payload | Emitted when |
|---|---|---|
| `incident:created` | Incident | ✅ new incident created |
| `incident:updated` | Incident | ✅ any incident field changes |
| `incident:merged` | `{ merged_incident, target_incident }` | 🚧 Stage 9 |
| `incident:severity_changed` | Incident | ✅ severity field changes |
| `report:created` | Report | ✅ new report ingested |
| `resource:updated` | Resource | ✅ resource created or status changed |
| `resource:assigned` | Assignment | 🚧 Stage 10 |
| `resource:failed` | `{ failed_resource, compromised_assignment }` | 🚧 Stage 11 |
| `resource:reassigned` | `{ assignment, resource }` | 🚧 Stage 11 |
| `alert:created` | Alert | 🚧 Stage 13 |
| `notification:created` | Notification | 🚧 Stage 14 |
| `activity:new` | ActivityLog entry | ✅ every logged action |

---

## Error responses

All errors use HTTP status + the envelope:
```json
{ "success": false, "error": { "message": "Incident not found", "details": null } }
```
| Status | Meaning |
|---|---|
| 400 | Validation error / bad request body / invalid FK reference |
| 404 | Resource not found |
| 409 | Conflict (duplicate, invalid state transition) |
| 500 | Internal server error |

## Health check

### `GET /health` ✅
```json
{ "success": true, "service": "ai-incident-commander-backend", "time": "...", "db": "connected" }
```
Returns `503` with `"db": "unavailable"` if Postgres is unreachable — the server itself stays up.
