# AI INCIDENT COMMANDER — SURGE
### Intelligent Emergency Response & Resource Coordination Platform

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900.svg)](https://leafletjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Client-010101.svg)](https://socket.io/)
[![Status](https://img.shields.io/badge/System-DEFCON_2_LIVE-critical.svg)](#)

SURGE is a real-time **Emergency Operations Center (EOC)** command dashboard designed to ingest chaotic multi-source emergency reports, perform AI triage and explainable severity scoring, dynamically route response fleets on live maps, merge duplicate reports, and automatically recover when deployed resources fail en route.

---

## 📸 System Overview

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ HEADER: SURGE // AI INCIDENT COMMANDER | SYSTEM LIVE | 18/24 FLEET READY | DEMO BAR   │
├───────────────────┬────────────────────────────────────────────┬───────────────────────┤
│                   │                                            │                       │
│  ACTIVE INCIDENTS │            LIVE TACTICAL MAP               │   AI COMMAND COPILOT  │
│                   │          (CARTO Voyager Engine)            │                       │
│ • #INC-102 (P1)   │                                            │ • Severity: 91/100    │
│   Flash Flood     │     [INC-102] ◄═══════════ [AMB-07]        │   +35 At-Risk Civs    │
│ • #INC-104 (P2)   │    (Pulsing Red)   (Animated Route)        │   +25 Corroboration   │
│   Duplicate Merge │                                            │ • Recommend: AMB-07   │
│ • #INC-105 (P2)   │     [FIRE-03] ──────────► [INC-105]        │   ETA: 6 min | 95%    │
│   Hazmat Alarm    │                                            │ • [APPROVE DISPATCH]  │
│                   │                                            │                       │
├───────────────────┴────────────────────────────────────────────┴───────────────────────┤
│ LIVE ACTIVITY AUDIT & ALERTS TIMELINE (Streaming Chronological Event Feed)             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Features

### 1. 🚨 Active Incident Triage Feed
- High-density live triage feed with **pulsing critical halos** (`CRITICAL`, `HIGH`, `MEDIUM`), `P1`/`P2` priority chips, and real-time civilian risk counters.
- Selecting any incident card auto-pans the map and immediately updates the AI Command Copilot.

### 2. 🗺️ Live CARTO Voyager Tactical Map
- Integrated Leaflet map utilizing **CARTO Voyager** light tiles with high-contrast tactical SVG markers.
- **Dynamic Route Polylines**: Animated dashed trajectory paths linking dispatched rescue vehicles (`FIRE-03`, `AMB-07`, and `AMB-12`) directly to incident coordinates.
- **Tactical Map Controls**: Instant incident focus (`Focus #INC-102`), reset sector view, and real-time layer toggles for Incidents, Fleet Units, and Routes.

### 3. 🤖 AI Command Copilot & Explainability
- **Explainability Factors**: Breaks down the AI severity score into weighted drivers (`+35 pts Human Risk`, `+25 pts Corroborating Calls`, `+20 pts Hydrological Sensor`, `+11 pts Infrastructure`).
- **Evidence Audit**: Displays corroborating sources including 911 dispatch calls, citizen mobile uploads, IoT river sensors, and CCTV feeds.
- **Resource Recommendation**: Highlights optimal unit, ETA, distance, capability score, and an **"APPROVE DISPATCH"** action button.

### 4. 🔀 Duplicate Detection & Side-by-Side Merge
- Detects clustered reports with high spatial/temporal similarity (e.g. `#INC-104` has 91% similarity with `#INC-102`).
- **DuplicateMergeModal**: Side-by-side comparison modal displaying shared evidence, civilian counts, and an executable **"MERGE INCIDENTS"** button that consolidates telemetry.

### 5. ⚡ Dynamic Response Recovery (Failure Mitigation)
- Simulates in-transit vehicle breakdown (e.g. `AMB-07` mechanical failure).
- Instantly flashes red alert banner: **"RESPONSE PLAN COMPROMISED: AMB-07 FAILED"**.
- AI automatically proposes alternative unit (`AMB-12`, ETA: 9 min, +3 min delay).
- Commander clicks **"APPROVE REASSIGNMENT"** to dynamically re-route the map and restore operational readiness.

### 6. 📄 AI Operational Briefing Generator
- Automatically compiles structured executive situation reports in markdown format.
- One-click clipboard copy and browser print/export.

### 7. 🔔 Tactical Alert Center & Toast Stack
- Slide-out **AlertCenterDrawer** showing all unacknowledged system alerts with direct jump-to-incident navigation.
- Floating tactical toast stack for instant audio-visual notification of new events.

### 8. 📊 Performance Analytics Dashboard
- Post-event reporting using **Recharts**:
  - Incident Severity Volume Over Time (24h Window)
  - Target vs. Actual Response Times by Resource Type
  - Fleet Utilization & Dispatch SLAs

---

## 🛠️ Technology Stack

- **Core**: React 18, Vite 5, JavaScript (JSX)
- **Styling**: Tailwind CSS 3.4 (Paper Light C2 Theme + Dark Header Strip)
- **Icons**: Lucide React
- **Mapping**: Leaflet 1.9, React Leaflet (CARTO Voyager Tile Engine)
- **Charts**: Recharts 2.x
- **Routing**: React Router DOM 6.x
- **Networking & Real-Time**: Axios, Socket.IO Client
- **State Architecture**: Modular React Contexts + `useReducer`

---

## 🎨 Theme: The "Paper" Tactical Palette

The interface uses a clean, light **Paper Palette** inspired by military aviation and defense command consoles:
- **Header**: `#0f172a` (Dark tactical command strip with light typography)
- **Background (Paper)**: `#f8fafc` (Neutral crisp background)
- **Cards & Surfaces**: `#ffffff` with `#e2e8f0` high-density borders
- **Critical / P1**: `#dc2626` (Red-600) + subtle pulsing halo
- **High / P2**: `#ea580c` (Orange-600)
- **Medium / P3**: `#d97706` (Amber-600)
- **Low / P4**: `#16a34a` (Emerald-600)
- **AI Copilot**: `#7c3aed` (Violet-600)
- **Dispatched Units**: `#2563eb` (Blue-600)

---

## 📁 Project Structure

```text
frontend/
├── public/
│   └── favicon.svg                   # C2 Tactical Favicon
├── src/
│   ├── components/
│   │   ├── alerts/
│   │   │   ├── AlertCenterDrawer.jsx # Slide-out unacknowledged alert drawer
│   │   │   └── ToastNotification.jsx # Tactical floating notification stack
│   │   ├── command/
│   │   │   └── AICommandPanel.jsx    # AI Copilot, explainability & recommendations
│   │   ├── common/
│   │   │   ├── ConfidenceScore.jsx   # Percentage badge with shield icon
│   │   │   ├── PriorityBadge.jsx     # P1 - P4 tactical chip
│   │   │   ├── SeverityBadge.jsx     # CRITICAL, HIGH, MED, LOW badge
│   │   │   ├── StatCard.jsx          # Header and Analytics KPI stat cards
│   │   │   └── StatusDot.jsx         # Green/Amber/Red pulsing indicator
│   │   ├── incidents/
│   │   │   ├── DuplicateMergeModal.jsx # Side-by-side duplicate comparison modal
│   │   │   └── OperationalBriefingModal.jsx # AI executive situation briefing modal
│   │   ├── layout/
│   │   │   ├── CommandLayout.jsx     # 3-column + bottom drawer layout grid
│   │   │   └── Header.jsx            # Dark C2 header with clock & live status
│   │   └── map/
│   │       ├── EmergencyMap.jsx      # Leaflet map with CARTO Voyager tiles
│   │       ├── IncidentMarker.jsx    # Pulsing severity markers with popups
│   │       ├── MapControls.jsx       # Layer toggles & focus controls
│   │       ├── markerIcons.js        # SVG divIcon factories
│   │       ├── ResourceMarker.jsx    # Vehicle markers with status indicators
│   │       └── RoutePolyline.jsx     # Animated dashed dispatch route lines
│   │
│   ├── context/
│   │   ├── AlertContext.jsx          # Live alerts, timeline entries, toast stack
│   │   ├── IncidentContext.jsx       # Incidents list, selection, filters, merge
│   │   ├── ResourceContext.jsx       # Fleet list, dispatch, failure recovery
│   │   └── SocketContext.jsx         # WebSocket connection lifecycle
│   │
│   ├── hooks/
│   │   ├── useAlerts.js
│   │   ├── useIncidents.js
│   │   ├── useLiveClock.js
│   │   ├── useResources.js
│   │   └── useSocket.js
│   │
│   ├── mock/
│   │   └── mockData.js               # Full JSON schemas & realistic fixtures
│   │
│   ├── pages/
│   │   ├── Analytics.jsx             # Post-event charts and fleet stats
│   │   └── Dashboard.jsx             # Main C2 Command Operations Center
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── alertsApi.js
│   │   │   ├── analyticsApi.js
│   │   │   ├── assignmentsApi.js
│   │   │   ├── client.js             # Axios client with VITE_USE_MOCK toggle
│   │   │   ├── incidentsApi.js
│   │   │   └── resourcesApi.js
│   │   └── socket.js                 # Socket.IO client + Mock event fallback
│   │
│   ├── App.jsx                       # Providers wrapper & router setup
│   ├── index.css                     # Tailwind directives & Paper styles
│   └── main.jsx                      # App root
│
├── .env.example                      # Environment variables example
├── package.json
├── tailwind.config.js                # Design tokens configuration
└── vite.config.js
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### 2. Installation
```bash
cd frontend
npm install
```

### 3. Environment Configuration
Create a `.env` file in `frontend/`:
```env
# Set to 'true' for offline mock engine, or 'false' for live backend
VITE_USE_MOCK=true
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Building for Production
```bash
npm run build
```

---

## 🎬 The 17-Step Golden Path Demo Flow

The top **DEMO BAR** allows executing the entire hackathon demo sequence:

```text
 1. [Simulate Flood]       ──► Incoming flash flood alert; #INC-102 appears in feed.
 2. [Map Centers]          ──► Auto-pans to coordinates with pulsing flood icon.
 3. [Escalate Critical]    ──► Severity score jumps to 95; badge turns CRITICAL; toast pops.
 4. [Duplicate Merge]      ──► Opens DuplicateMergeModal showing 91% similarity with #INC-104.
 5. [MERGE INCIDENTS]      ──► Combines telemetry; removes duplicate; aggregates evidence.
 6. [AI Copilot Panel]     ──► Highlights top recommendation: AMB-07 (ALS Trauma, ETA 6m).
 7. [APPROVE DISPATCH]     ──► AMB-07 marked "DISPATCHED"; animated route drawn on map.
 8. [Fail Unit (AMB-07)]   ──► Simulates mechanical breakdown; unit turns red.
 9. [Recovery Banner]      ──► Red alert: "RESPONSE PLAN COMPROMISED"; suggests AMB-12 (+3m).
10. [APPROVE REASSIGNMENT] ──► Re-routes map to AMB-12; banner dismisses; logs to timeline.
11. [Live Timeline]        ──► Bottom drawer logs all 15 audit events chronologically.
12. [AI Briefing]          ──► Generates executive situation report with 1-click clipboard copy.
```

---

## 🔌 Backend API & Socket.IO Contract

When connecting a live backend (`VITE_USE_MOCK=false`):

### REST Endpoints Expected
| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/incidents` | `GET` | List all active incidents |
| `/api/incidents/:id` | `GET` | Get single incident details |
| `/api/incidents/:id/analyze` | `POST` | AI severity explainability factors |
| `/api/incidents/:id/merge` | `POST` | Merge duplicate candidate into master incident |
| `/api/incidents/:id/briefing` | `POST` | Generate AI markdown briefing |
| `/api/resources` | `GET` | List fleet resources and GPS positions |
| `/api/incidents/:id/recommendations` | `GET` | Get AI resource recommendations |
| `/api/assignments/:id/approve` | `POST` | Approve resource dispatch |
| `/api/incidents/:id/simulate-resource-failure` | `POST` | Simulate unit breakdown |
| `/api/incidents/:id/recover` | `POST` | Approve alternative unit recovery |
| `/api/alerts` | `GET` | List active alerts |
| `/api/alerts/:id/acknowledge` | `PATCH` | Acknowledge an alert |
| `/api/analytics` | `GET` | Aggregated KPIs and chart metrics |

### Socket.IO Events
- `incident:created`, `incident:updated`, `incident:severity_changed`, `incident:merged`
- `resource:updated`, `resource:assigned`, `resource:failed`, `resource:reassigned`
- `alert:created`, `notification:created`, `activity:new`

---

## 🏆 Hackathon Demo Ready

- **Zero External Blockers**: Works 100% standalone via mock simulation or live with Express backend.
- **Interactive & Fast**: Sub-second UI updates, map animations, and real-time state synchronization.
- **Fail-Safe Recovery**: Demonstrates cutting-edge AI incident recovery workflows during resource failure.
