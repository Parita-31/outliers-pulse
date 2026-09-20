/* eslint-disable no-console */
// Deterministic demo seed data for AI Incident Commander.
// Run with: npm run seed  (or npm run reset-db to wipe + reseed)
//
// Inserts directly via SQL (not through the API) so seeding is fast, has no
// AI-API dependency, and is fully reproducible run to run (seeded PRNG below).
// Counts target the spec: 20-30 incidents, 50-100 reports, 15-20 resources,
// 5-10 hospitals - plus supporting assignments/alerts/notifications/activity
// logs/ai_analyses so every table has realistic demo data.

const { Client } = require('pg');
const env = require('../src/config/env');

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) - same seed always produces the same data.
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const pickN = (arr, n) => [...arr].sort(() => rng() - 0.5).slice(0, n);
const jitter = (base, spreadDeg) => base + (rng() - 0.5) * spreadDeg;
const round = (n, d = 6) => Math.round(n * 10 ** d) / 10 ** d;
const minutesAgo = (m) => new Date(Date.now() - m * 60000);

// Anand, Gujarat area as the demo city center.
const BASE_LAT = 22.5645;
const BASE_LON = 72.9289;
const OUTLIER_LAT = 22.72; // ~18km away - exercises the recommendation-radius decay
const OUTLIER_LON = 73.02;

async function main() {
  const reset = process.argv.includes('--reset');
  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  try {
    if (reset) {
      console.log('[seed] --reset: truncating all tables...');
      await client.query(`
        TRUNCATE TABLE ai_analyses, activity_logs, notifications, alerts,
        assignments, reports, resources, hospitals, incidents, users
        RESTART IDENTITY CASCADE;
      `);
    }

    console.log('[seed] Seeding users...');
    const userIds = await seedUsers(client);

    console.log('[seed] Seeding incidents...');
    const incidents = await seedIncidents(client, userIds);

    console.log('[seed] Seeding reports (incl. intentional duplicates/corroboration)...');
    const reports = await seedReports(client, incidents);

    console.log('[seed] Seeding resources...');
    const resources = await seedResources(client);

    console.log('[seed] Seeding hospitals...');
    await seedHospitals(client);

    console.log('[seed] Seeding assignments (incl. a failure/reassignment scenario)...');
    const assignments = await seedAssignments(client, incidents, resources);

    console.log('[seed] Seeding alerts (all 7 types)...');
    const alerts = await seedAlerts(client, incidents, assignments, userIds);

    console.log('[seed] Seeding notifications...');
    await seedNotifications(client, incidents, alerts);

    console.log('[seed] Seeding ai_analyses...');
    await seedAiAnalyses(client, incidents, reports);

    console.log('[seed] Seeding activity_logs...');
    await seedActivityLogs(client, incidents, reports, assignments, alerts, userIds);

    console.log('[seed] Done.');
    console.log(`[seed] ${incidents.length} incidents, ${reports.length} reports, ${resources.length} resources, ${assignments.length} assignments, ${alerts.length} alerts.`);
  } catch (err) {
    console.error('[seed] Failed:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
async function seedUsers(client) {
  const users = [
    { name: 'Alex Commander', email: 'alex.commander@demo.local', role: 'commander' },
    { name: 'Priya Sharma', email: 'priya.sharma@demo.local', role: 'commander' },
    { name: 'Sam Dispatcher', email: 'sam.dispatcher@demo.local', role: 'dispatcher' },
    { name: 'Riya Patel', email: 'riya.patel@demo.local', role: 'dispatcher' },
    { name: 'Field Team Lead', email: 'field.lead@demo.local', role: 'field_team' },
    { name: 'System Admin', email: 'admin@demo.local', role: 'admin' },
  ];
  const ids = [];
  for (const u of users) {
    const { rows } = await client.query(
      `INSERT INTO users (name, email, role) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [u.name, u.email, u.role]
    );
    ids.push(rows[0].id);
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------
const INCIDENT_TEMPLATES = [
  ['Warehouse fire on 4th Street', 'fire', 'Large fire with heavy smoke spreading through a warehouse complex', 'CRITICAL', 'P1', 'ASSIGNED', 25, 15],
  ['Chemical plant gas leak', 'chemical_hazard', 'Toxic gas leak reported near the industrial chemical plant, fumes spreading', 'CRITICAL', 'P1', 'REPORTED', 60, 130],
  ['Flash flood near riverside colony', 'flood', 'Water rising rapidly, residents stranded on rooftops', 'HIGH', 'P1', 'IN_PROGRESS', 40, 45],
  ['Building collapse after structural failure', 'building_collapse', 'Partial building collapse, people believed trapped under rubble', 'CRITICAL', 'P1', 'VERIFIED', 18, 20],
  ['Highway multi-vehicle collision', 'road_accident', 'Multi-vehicle pileup on the highway, injuries reported', 'HIGH', 'P2', 'ASSIGNED', 6, 25],
  ['Duplicate warehouse fire report (2nd caller)', 'fire', 'Large fire with heavy smoke spreading through a warehouse complex', 'CRITICAL', 'P1', 'MERGED', 25, 14],
  ['Elderly resident medical emergency', 'medical_emergency', 'Elderly resident unconscious, not breathing normally', 'HIGH', 'P2', 'RESOLVED', 1, 200],
  ['Factory machinery accident', 'industrial_accident', 'Worker injured in machinery accident at the textile factory', 'MODERATE', 'P3', 'IN_PROGRESS', 2, 40],
  ['Hillside landslide after heavy rain', 'landslide', 'Landslide blocking the access road, some homes at risk', 'HIGH', 'P2', 'VERIFIED', 12, 60],
  ['Minor fender bender on ring road', 'road_accident', 'Small collision, no injuries reported', 'LOW', 'P4', 'RESOLVED', 0, 300],
  ['Kitchen fire in residential complex', 'fire', 'Small kitchen fire, contained by residents before spreading', 'MODERATE', 'P3', 'RESOLVED', 3, 180],
  ['Suspicious chemical odor reported', 'chemical_hazard', 'Residents reporting a strong chemical smell near the market', 'MODERATE', 'P3', 'REPORTED', 0, 10],
  ['Overturned fuel tanker', 'road_accident', 'Fuel tanker overturned on the bypass, spill risk', 'HIGH', 'P2', 'ASSIGNED', 0, 35],
  ['Apartment building fire, 3rd floor', 'fire', 'Fire reported on the 3rd floor, smoke visible from street level', 'HIGH', 'P1', 'IN_PROGRESS', 30, 22],
  ['Construction site partial collapse', 'building_collapse', 'Scaffolding and partial wall collapse at a construction site', 'MODERATE', 'P3', 'VERIFIED', 4, 50],
  ['Cardiac emergency at shopping mall', 'medical_emergency', 'Shopper collapsed, suspected cardiac arrest', 'CRITICAL', 'P1', 'RESOLVED', 1, 240],
  ['Monsoon drainage flooding', 'flood', 'Street-level flooding after heavy monsoon rain, traffic disrupted', 'MODERATE', 'P3', 'REPORTED', 5, 30],
  ['Gas cylinder explosion risk', 'chemical_hazard', 'Leaking gas cylinder at a roadside eatery, explosion risk', 'HIGH', 'P2', 'VERIFIED', 8, 18],
  ['School bus minor accident', 'road_accident', 'School bus minor collision, children evaluated on scene', 'MODERATE', 'P2', 'RESOLVED', 15, 150],
  ['Riverbank erosion landslide warning', 'landslide', 'Riverbank erosion threatening two homes after continuous rain', 'MODERATE', 'P3', 'REPORTED', 6, 90],
  ['Textile factory fire', 'fire', 'Fire broke out in the textile factory storage area', 'HIGH', 'P2', 'IN_PROGRESS', 10, 28],
  ['Unresolved factory gas leak (aging)', 'chemical_hazard', 'Ongoing low-level gas leak at an old factory site, unresolved for hours', 'HIGH', 'P1', 'REPORTED', 20, 150],
  ['Pedestrian struck near market', 'road_accident', 'Pedestrian struck by a two-wheeler near the main market', 'MODERATE', 'P2', 'IN_PROGRESS', 1, 33],
  ['Industrial boiler malfunction', 'industrial_accident', 'Boiler malfunction causing steam leak at a manufacturing unit', 'MODERATE', 'P3', 'VERIFIED', 3, 55],
  ['Remote village landslide, road cut off', 'landslide', 'Landslide has cut off road access to a remote village', 'CRITICAL', 'P1', 'REPORTED', 80, 100],
];

async function seedIncidents(client, userIds) {
  const incidents = [];
  for (let i = 0; i < INCIDENT_TEMPLATES.length; i++) {
    const [title, type, description, severity, priority, status, peopleAtRisk, ageMinutes] = INCIDENT_TEMPLATES[i];
    const useOutlier = i === INCIDENT_TEMPLATES.length - 1; // last one is the "far away" outlier
    const lat = round(jitter(useOutlier ? OUTLIER_LAT : BASE_LAT, 0.03));
    const lon = round(jitter(useOutlier ? OUTLIER_LON : BASE_LON, 0.03));
    const severityScore = { LOW: 15, MODERATE: 40, HIGH: 65, CRITICAL: 90 }[severity];
    const createdAt = minutesAgo(ageMinutes);
    const resolvedAt = status === 'RESOLVED' || status === 'CLOSED' ? minutesAgo(Math.max(1, ageMinutes - 20)) : null;
    const createdBy = i % 4 === 0 ? pick(userIds) : null;

    const { rows } = await client.query(
      `INSERT INTO incidents
         (title, type, description, latitude, longitude, severity, severity_score, severity_factors,
          priority, priority_reasons, confidence_score, people_at_risk, status, created_by, created_at, updated_at, resolved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15,$16)
       RETURNING *`,
      [
        title, type, description, lat, lon, severity, severityScore,
        JSON.stringify([{ factor: 'People at risk', value: peopleAtRisk, points: Math.min(20, Math.round(peopleAtRisk * 0.4)), maxPoints: 20 }]),
        priority, JSON.stringify([`${severity} severity`, `${peopleAtRisk} people at risk`]),
        round(60 + rng() * 35, 1), peopleAtRisk, status, createdBy, createdAt, resolvedAt,
      ]
    );
    incidents.push(rows[0]);
  }

  // Wire up the deliberate merge pair: incident[5] ("Duplicate warehouse fire report")
  // was already inserted with status MERGED - link it into incident[0].
  await client.query(
    `UPDATE incidents SET merged_into_incident_id = $1 WHERE id = $2`,
    [incidents[0].id, incidents[5].id]
  );
  incidents[5].merged_into_incident_id = incidents[0].id;

  return incidents;
}

// ---------------------------------------------------------------------------
// Reports - each incident gets 1-4 reports; several are deliberately close in
// time/space/text to the incident's own description to demonstrate the
// duplicate-detection pattern (same type, near location, similar wording,
// received within minutes of each other).
// ---------------------------------------------------------------------------
const SOURCES = ['citizen', 'emergency_call', 'sensor', 'field_team', 'admin'];
const REPORT_PHRASES = [
  'Confirmed, situation matches earlier report',
  'Additional witness confirms the same details',
  'Field team on scene, corroborating initial report',
  'Second caller reporting the same incident',
  'Sensor data confirms conditions worsening',
  'Neighbor reports seeing the same thing',
];

async function seedReports(client, incidents) {
  const reports = [];
  for (const incident of incidents) {
    if (incident.status === 'MERGED') continue; // reports live on the target after a real merge
    const reportCount = 1 + Math.floor(rng() * 4); // 1-4 reports per incident
    for (let r = 0; r < reportCount; r++) {
      const isFirst = r === 0;
      const source = isFirst ? pick(['citizen', 'emergency_call']) : pick(SOURCES);
      const message = isFirst
        ? incident.description
        : `${pick(REPORT_PHRASES)} - ${incident.description.toLowerCase()}`;
      const lat = round(jitter(incident.latitude, 0.004)); // within ~400m - duplicate-detection range
      const lon = round(jitter(incident.longitude, 0.004));
      const minutesAfterIncident = r * (1 + Math.floor(rng() * 4)); // 1-4 min apart
      const timestamp = new Date(new Date(incident.created_at).getTime() + minutesAfterIncident * 60000);
      const confidence = round(55 + rng() * 40, 1);

      const { rows } = await client.query(
        `INSERT INTO reports (incident_id, source, message, latitude, longitude, "timestamp", confidence, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [incident.id, source, message, lat, lon, timestamp, confidence, JSON.stringify({ seeded: true })]
      );
      reports.push(rows[0]);
    }
  }
  // Attach the merged pair's report too, under the target incident (simulating
  // what the real merge flow does - reports move to the canonical incident).
  const target = incidents[0];
  const { rows: mergedReport } = await client.query(
    `INSERT INTO reports (incident_id, source, message, latitude, longitude, "timestamp", confidence, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      target.id, 'citizen', 'Second caller: fire with heavy smoke at the warehouse, people trapped',
      round(jitter(target.latitude, 0.003)), round(jitter(target.longitude, 0.003)),
      new Date(new Date(target.created_at).getTime() + 3 * 60000), 72.5, JSON.stringify({ seeded: true, fromMergedIncident: true }),
    ]
  );
  reports.push(mergedReport[0]);

  return reports;
}

// ---------------------------------------------------------------------------
// Resources - 18 total, varied types/status/workload. A few deliberately
// UNAVAILABLE/OFFLINE/BUSY to demonstrate shortages, and one specifically set
// up to be "failed" via the assignments step below for the recovery demo.
// ---------------------------------------------------------------------------
const RESOURCE_TEMPLATES = [
  ['Fire Truck 1', 'fire_team', ['firefighting', 'rescue'], 'AVAILABLE', 10],
  ['Fire Truck 2', 'fire_team', ['firefighting', 'rescue'], 'ASSIGNED', 40],
  ['Fire Truck 3 (offline for maintenance)', 'fire_team', ['firefighting'], 'OFFLINE', 0],
  ['Ambulance 1', 'ambulance', ['medical', 'trauma'], 'AVAILABLE', 15],
  ['Ambulance 2', 'ambulance', ['medical'], 'EN_ROUTE', 60],
  ['Ambulance 3', 'ambulance', ['medical', 'cardiac'], 'AVAILABLE', 5],
  ['Police Unit 7', 'police_unit', ['traffic', 'crowd control'], 'AVAILABLE', 20],
  ['Police Unit 12', 'police_unit', ['traffic'], 'ON_SCENE', 70],
  ['Rescue Team Alpha', 'rescue_team', ['urban search and rescue'], 'AVAILABLE', 25],
  ['Rescue Team Bravo', 'rescue_team', ['water rescue'], 'BUSY', 85],
  ['Medical Team 1', 'medical_team', ['triage', 'trauma'], 'AVAILABLE', 30],
  ['Medical Team 2', 'medical_team', ['triage'], 'UNAVAILABLE', 0],
  ['Rescue Vehicle 4', 'rescue_vehicle', ['heavy lift', 'extraction'], 'AVAILABLE', 12],
  ['Hazmat Equipment Unit', 'equipment', ['chemical containment'], 'AVAILABLE', 8],
  ['Heavy Rescue Equipment', 'equipment', ['structural shoring'], 'AVAILABLE', 18],
  ['City General Hospital Unit', 'hospital', ['emergency', 'surgery'], 'AVAILABLE', 45],
  ['Community Shelter North', 'shelter', ['evacuation housing'], 'AVAILABLE', 10],
  ['Fire Truck 4 (to be marked failed in demo)', 'fire_team', ['firefighting', 'rescue'], 'AVAILABLE', 15],
];

async function seedResources(client) {
  const resources = [];
  for (const [name, type, capability, status, workload] of RESOURCE_TEMPLATES) {
    const lat = round(jitter(BASE_LAT, 0.035));
    const lon = round(jitter(BASE_LON, 0.035));
    const { rows } = await client.query(
      `INSERT INTO resources (name, type, capability, latitude, longitude, status, workload)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [name, type, JSON.stringify(capability), lat, lon, status, workload]
    );
    resources.push(rows[0]);
  }
  return resources;
}

// ---------------------------------------------------------------------------
// Hospitals
// ---------------------------------------------------------------------------
const HOSPITAL_TEMPLATES = [
  ["City General Hospital", 200, 34, ['emergency', 'trauma', 'surgery']],
  ['Anand Civil Hospital', 150, 20, ['emergency', 'general medicine']],
  ['Riverside Medical Center', 90, 12, ['cardiac', 'emergency']],
  ["St. Mary's Hospital", 120, 18, ['pediatrics', 'emergency']],
  ['Industrial Zone Clinic', 40, 6, ['trauma', 'burns']],
  ['Community Health Center', 60, 15, ['general medicine']],
  ['Regional Trauma Institute', 180, 25, ['trauma', 'surgery', 'ICU']],
];

async function seedHospitals(client) {
  for (const [name, capacity, availableBeds, specialties] of HOSPITAL_TEMPLATES) {
    const lat = round(jitter(BASE_LAT, 0.04));
    const lon = round(jitter(BASE_LON, 0.04));
    await client.query(
      `INSERT INTO hospitals (name, latitude, longitude, capacity, available_beds, specialties, contact)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [name, lat, lon, capacity, availableBeds, JSON.stringify(specialties), '108']
    );
  }
}

// ---------------------------------------------------------------------------
// Assignments - a handful of PENDING_APPROVAL/APPROVED/ACTIVE assignments,
// plus one deliberate FAILED -> REASSIGNED pair for the Dynamic Response
// Recovery demo (Fire Truck 4 fails on the warehouse fire, Fire Truck 1 takes over).
// ---------------------------------------------------------------------------
async function seedAssignments(client, incidents, resources) {
  const assignments = [];
  const byType = (type) => resources.filter((r) => r.type === type);

  const assignedIncidents = incidents.filter((i) => ['ASSIGNED', 'IN_PROGRESS'].includes(i.status));
  for (const incident of assignedIncidents.slice(0, 6)) {
    const candidates = byType('fire_team').concat(byType('ambulance'), byType('rescue_team'));
    const resource = pick(candidates.filter((r) => ['ASSIGNED', 'EN_ROUTE', 'ON_SCENE'].includes(r.status))) || pick(candidates);
    if (!resource) continue;
    const { rows } = await client.query(
      `INSERT INTO assignments (incident_id, resource_id, status, recommended_score, recommended_reasons, eta, approved_at)
       VALUES ($1,$2,'APPROVED',$3,$4,$5, now() - interval '10 minutes')
       RETURNING *`,
      [incident.id, resource.id, round(70 + rng() * 25, 1), JSON.stringify(['Capability match', 'Available']), 5 + Math.floor(rng() * 15)]
    );
    assignments.push(rows[0]);
  }

  // Dynamic Response Recovery demo scenario: Fire Truck 4 failed on the warehouse fire.
  const warehouseFire = incidents[0];
  const fireTruck4 = resources.find((r) => r.name.includes('Fire Truck 4'));
  const fireTruck1 = resources.find((r) => r.name === 'Fire Truck 1');
  if (warehouseFire && fireTruck4 && fireTruck1) {
    const { rows: failedRows } = await client.query(
      `INSERT INTO assignments (incident_id, resource_id, status, recommended_score, recommended_reasons, eta, approved_at)
       VALUES ($1,$2,'FAILED',$3,$4,$5, now() - interval '12 minutes')
       RETURNING *`,
      [warehouseFire.id, fireTruck4.id, 88.0, JSON.stringify(['Capability match', '0.3 km away', 'Available']), 4]
    );
    const failedAssignment = failedRows[0];
    assignments.push(failedAssignment);

    await client.query(`UPDATE resources SET status = 'UNAVAILABLE', current_incident_id = NULL WHERE id = $1`, [fireTruck4.id]);

    const { rows: reassignedRows } = await client.query(
      `INSERT INTO assignments (incident_id, resource_id, status, recommended_score, recommended_reasons, eta, replaced_assignment_id, approved_at)
       VALUES ($1,$2,'APPROVED',$3,$4,$5,$6, now() - interval '9 minutes')
       RETURNING *`,
      [warehouseFire.id, fireTruck1.id, 91.0, JSON.stringify(['Capability match', '0.5 km away', 'Available', 'Low workload']), 6, failedAssignment.id]
    );
    assignments.push(reassignedRows[0]);
    await client.query(`UPDATE assignments SET status = 'REASSIGNED' WHERE id = $1`, [failedAssignment.id]);
    await client.query(
      `UPDATE resources SET status = 'ASSIGNED', current_incident_id = $1, eta = 6 WHERE id = $2`,
      [warehouseFire.id, fireTruck1.id]
    );
  }

  return assignments;
}

// ---------------------------------------------------------------------------
// Alerts - one of each of the 7 types, tied to relevant incidents.
// ---------------------------------------------------------------------------
async function seedAlerts(client, incidents, assignments, userIds) {
  const byTitle = (t) => incidents.find((i) => i.title === t);
  const alertDefs = [
    [byTitle('Warehouse fire on 4th Street'), 'CRITICAL_INCIDENT', 'CRITICAL', 'Incident reached CRITICAL severity', true],
    [byTitle('Chemical plant gas leak'), 'SEVERITY_ESCALATION', 'CRITICAL', 'Severity escalated from HIGH to CRITICAL', false],
    [byTitle('Warehouse fire on 4th Street'), 'RESOURCE_FAILURE', 'CRITICAL', 'Fire Truck 4 failed en route - reassignment needed', true],
    [byTitle('Unresolved factory gas leak (aging)'), 'RESPONSE_DELAY', 'HIGH', 'No response for 150 minutes', false],
    [byTitle('Remote village landslide, road cut off'), 'RESOURCE_SHORTAGE', 'CRITICAL', 'No matching resources currently available', false],
    [byTitle('Unresolved factory gas leak (aging)'), 'UNRESOLVED_HIGH_PRIORITY', 'CRITICAL', 'P1 incident open for 2+ hours', false],
    [byTitle('Chemical plant gas leak'), 'CASCADING_IMPACT', 'CRITICAL', 'Cascading impact detected - 60 people at risk', false],
  ];

  const alerts = [];
  for (const [incident, type, severity, message, acknowledged] of alertDefs) {
    if (!incident) continue;
    const { rows } = await client.query(
      `INSERT INTO alerts (incident_id, type, severity, message, acknowledged, acknowledged_by, acknowledged_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        incident.id, type, severity, message, acknowledged,
        acknowledged ? pick(userIds) : null,
        acknowledged ? minutesAgo(5) : null,
      ]
    );
    alerts.push(rows[0]);
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// Notifications - mirror the alerts + a couple of assignment approvals.
// ---------------------------------------------------------------------------
async function seedNotifications(client, incidents, alerts) {
  for (const alert of alerts) {
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, related_incident_id, read)
       VALUES (NULL, $1, $2, $3, $4, $5)`,
      [alert.type.replace(/_/g, ' '), alert.message, alert.type.toLowerCase(), alert.incident_id, rng() > 0.5]
    );
  }
  const assignedIncidents = incidents.filter((i) => i.status === 'ASSIGNED').slice(0, 3);
  for (const incident of assignedIncidents) {
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, related_incident_id, read)
       VALUES (NULL, 'Resource Assigned', $1, 'resource_assigned', $2, $3)`,
      [`A resource was dispatched to "${incident.title}"`, incident.id, rng() > 0.5]
    );
  }
}

// ---------------------------------------------------------------------------
// AI analyses - one classification record per non-merged incident, all
// marked used_fallback=true since seeding never calls the real Gemini API.
// ---------------------------------------------------------------------------
async function seedAiAnalyses(client, incidents, reports) {
  const reportsByIncident = new Map();
  for (const r of reports) {
    if (!r.incident_id) continue;
    if (!reportsByIncident.has(r.incident_id)) reportsByIncident.set(r.incident_id, []);
    reportsByIncident.get(r.incident_id).push(r);
  }

  for (const incident of incidents) {
    if (incident.status === 'MERGED') continue;
    const firstReport = (reportsByIncident.get(incident.id) || [])[0];
    const parsedOutput = {
      incidentType: incident.type,
      urgency: { LOW: 'low', MODERATE: 'medium', HIGH: 'high', CRITICAL: 'critical' }[incident.severity],
      peopleAtRisk: incident.people_at_risk,
      hazards: pickN(['smoke', 'structural collapse', 'toxic fumes', 'flooding', 'debris', 'explosion risk'], 1 + Math.floor(rng() * 2)),
      resourceTypes: pickN(['fire_team', 'ambulance', 'rescue_team', 'medical_team', 'police_unit', 'equipment'], 1 + Math.floor(rng() * 2)),
      summary: incident.title,
      confidence: round(50 + rng() * 45, 1),
    };
    await client.query(
      `INSERT INTO ai_analyses (incident_id, report_id, input_text, raw_response, parsed_output, model, used_fallback, confidence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        incident.id, firstReport ? firstReport.id : null, incident.description,
        null, JSON.stringify(parsedOutput), null, true, parsedOutput.confidence,
      ]
    );
  }
}

// ---------------------------------------------------------------------------
// Activity logs - a realistic trail per incident.
// ---------------------------------------------------------------------------
async function seedActivityLogs(client, incidents, reports, assignments, alerts, userIds) {
  const reportsByIncident = new Map();
  for (const r of reports) {
    if (!r.incident_id) continue;
    if (!reportsByIncident.has(r.incident_id)) reportsByIncident.set(r.incident_id, []);
    reportsByIncident.get(r.incident_id).push(r);
  }
  const assignmentsByIncident = new Map();
  for (const a of assignments) {
    if (!assignmentsByIncident.has(a.incident_id)) assignmentsByIncident.set(a.incident_id, []);
    assignmentsByIncident.get(a.incident_id).push(a);
  }

  async function log(incidentId, action, details, actorId = null) {
    await client.query(
      `INSERT INTO activity_logs (incident_id, action, actor_id, details) VALUES ($1,$2,$3,$4)`,
      [incidentId, action, actorId, JSON.stringify(details)]
    );
  }

  for (const incident of incidents) {
    const incidentReports = reportsByIncident.get(incident.id) || [];
    for (const r of incidentReports) {
      await log(incident.id, 'REPORT_RECEIVED', { source: r.source, reportId: r.id });
    }
    await log(incident.id, 'INCIDENT_CREATED', { title: incident.title, type: incident.type, source: 'seed' });
    await log(incident.id, 'INCIDENT_CLASSIFIED', { incidentType: incident.type, usedFallback: true });

    if (incident.status === 'MERGED') {
      await log(incident.id, 'INCIDENT_MERGED', { mergedInto: incident.merged_into_incident_id });
    }
    if (incident.severity === 'HIGH' || incident.severity === 'CRITICAL') {
      await log(incident.id, 'SEVERITY_CHANGED', { to: incident.severity });
    }

    for (const a of assignmentsByIncident.get(incident.id) || []) {
      await log(incident.id, 'RESOURCE_RECOMMENDED', { assignmentId: a.id, score: a.recommended_score });
      if (a.status === 'APPROVED' || a.status === 'REASSIGNED') {
        await log(incident.id, 'RESOURCE_ASSIGNED', { assignmentId: a.id }, pick(userIds));
      }
      if (a.status === 'FAILED' || a.status === 'REASSIGNED') {
        await log(incident.id, 'RESOURCE_FAILED', { assignmentId: a.id });
      }
      if (a.replaced_assignment_id) {
        await log(incident.id, 'RESOURCE_REASSIGNED', { newAssignmentId: a.id, replaced: a.replaced_assignment_id });
      }
    }

    for (const alert of alerts.filter((al) => al.incident_id === incident.id)) {
      await log(incident.id, 'ALERT_CREATED', { alertId: alert.id, type: alert.type });
      if (alert.acknowledged) {
        await log(incident.id, 'ALERT_ACKNOWLEDGED', { alertId: alert.id }, alert.acknowledged_by);
      }
    }

    if (incident.status === 'RESOLVED' || incident.status === 'CLOSED') {
      await log(incident.id, 'INCIDENT_RESOLVED', {});
    }
  }
}

main();
