/* eslint-disable no-console */
// Full end-to-end flow test across every stage. Requires the server running
// (npm run dev) and a freshly migrated+seeded DB recommended (npm run reset-db).
// Run with: npm run test:full

const BASE = process.env.API_BASE || 'http://localhost:4000';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗ FAIL:\x1b[0m ${message}`);
  }
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (e) { /* no body */ }
  return { status: res.status, json };
}

async function main() {
  console.log('\n=== Health check ===');
  {
    const { status, json } = await api('GET', '/health');
    assert(status === 200, 'GET /health returns 200');
    assert(json.db === 'connected', 'DB reports connected');
  }

  console.log('\n=== Stage 3: Incident/Resource CRUD ===');
  let resourceAId, resourceBId, incidentManualId;
  {
    const { status, json } = await api('POST', '/api/resources', {
      name: 'Test Fire Truck A', type: 'fire_team',
      latitude: 22.5670, longitude: 72.9291, status: 'AVAILABLE', workload: 10,
    });
    assert(status === 201, 'POST /api/resources creates resource A');
    resourceAId = json.data.id;

    const r2 = await api('POST', '/api/resources', {
      name: 'Test Fire Truck B (backup)', type: 'fire_team',
      latitude: 22.58, longitude: 72.94, status: 'AVAILABLE', workload: 20,
    });
    resourceBId = r2.json.data.id;
    assert(r2.status === 201, 'POST /api/resources creates resource B');

    const inc = await api('POST', '/api/incidents', {
      title: 'Manual test incident', type: 'road_accident',
      latitude: 22.5, longitude: 72.9, people_at_risk: 2,
    });
    assert(inc.status === 201, 'POST /api/incidents creates manually');
    incidentManualId = inc.json.data.id;

    const list = await api('GET', '/api/incidents?limit=5');
    assert(list.status === 200 && Array.isArray(list.json.data), 'GET /api/incidents lists incidents');
  }

  console.log('\n=== Stage 5-8: AI classification, severity, priority, duplicate detection ===');
  let incidentId;
  {
    const { status, json } = await api('POST', '/api/reports', {
      source: 'citizen',
      message: 'Large fire with heavy smoke spreading through the warehouse, 12 people trapped',
      latitude: 22.5645, longitude: 72.9289,
    });
    assert(status === 201, 'POST /api/reports (no incident_id) creates and classifies');
    assert(json.data.incident, 'response includes the created incident');
    assert(json.data.incident.severity, 'incident has a severity assigned');
    assert(json.data.incident.priority, 'incident has a priority assigned');
    assert(json.data.duplicate_detection.matched === false, 'first report is not flagged as a duplicate');
    incidentId = json.data.incident.id;

    const dup = await api('POST', '/api/reports', {
      source: 'field_team',
      message: 'Confirmed fire with heavy smoke near the warehouse, several trapped inside',
      latitude: 22.5648, longitude: 72.9291,
    });
    assert(dup.status === 201, 'second related report is accepted');
    assert(dup.json.data.duplicate_detection.matched === true, 'second related report is flagged as a duplicate');
    assert(dup.json.data.incident.id === incidentId, 'duplicate report attaches to the SAME incident (no new one created)');

    const reports = await api('GET', `/api/incidents/${incidentId}/reports`);
    assert(reports.status === 200 && reports.json.data.length === 2, 'incident now has 2 attached reports');

    const unrelated = await api('POST', '/api/reports', {
      source: 'citizen', message: 'Minor fender bender on the ring road, no injuries',
      latitude: 22.61, longitude: 72.98,
    });
    assert(unrelated.json.data.duplicate_detection.matched === false, 'unrelated report creates its own incident');
    assert(unrelated.json.data.incident.id !== incidentId, 'unrelated incident has a different id');
  }

  console.log('\n=== Stage 10: Resource recommendations ===');
  {
    const { status, json } = await api('GET', `/api/incidents/${incidentId}/recommendations`);
    assert(status === 200 && Array.isArray(json.data), 'GET recommendations returns a ranked list');
    assert(json.data.length > 0, 'at least one resource recommended');
    assert(json.data[0].score >= json.data[json.data.length - 1].score, 'results are sorted best-first');
  }

  console.log('\n=== Stage 11: Human approval / assignments ===');
  let assignmentId;
  {
    const propose = await api('POST', '/api/assignments', { incident_id: incidentId, resource_id: resourceAId });
    assert(propose.status === 201 && propose.json.data.status === 'PENDING_APPROVAL', 'assignment starts PENDING_APPROVAL');
    assignmentId = propose.json.data.id;

    const resourceCheck = await api('GET', `/api/resources/${resourceAId}`);
    assert(resourceCheck.json.data.status === 'AVAILABLE', 'proposing an assignment does NOT move the resource yet');

    const approve = await api('POST', `/api/assignments/${assignmentId}/approve`, {});
    assert(approve.status === 200 && approve.json.data.status === 'APPROVED', 'approval succeeds');

    const resourceAfter = await api('GET', `/api/resources/${resourceAId}`);
    assert(resourceAfter.json.data.status === 'ASSIGNED', 'approving moves the resource to ASSIGNED');
  }

  console.log('\n=== Stage 12: Dynamic Response Recovery ===');
  {
    const fail = await api('POST', `/api/incidents/${incidentId}/simulate-resource-failure`, { resource_id: resourceAId });
    assert(fail.status === 200, 'simulate-resource-failure succeeds');
    assert(fail.json.data.failed_resource.status === 'UNAVAILABLE', 'failed resource marked UNAVAILABLE');
    assert(fail.json.data.compromised_assignment.status === 'FAILED', 'original assignment marked FAILED');
    assert(fail.json.data.alert.type === 'RESOURCE_FAILURE', 'a RESOURCE_FAILURE alert was created');
    assert(Array.isArray(fail.json.data.alternatives), 'alternatives array returned');

    const recover = await api('POST', `/api/incidents/${incidentId}/recover`, {
      assignment_id: assignmentId, new_resource_id: resourceBId,
    });
    assert(recover.status === 200 && recover.json.data.assignment.status === 'APPROVED', 'recovery creates a new APPROVED assignment');

    const resourceB = await api('GET', `/api/resources/${resourceBId}`);
    assert(resourceB.json.data.status === 'ASSIGNED', 'replacement resource is now ASSIGNED');

    const originalAssignment = await api('GET', `/api/assignments/${assignmentId}`);
    assert(originalAssignment.json.data.status === 'REASSIGNED', 'original assignment ends at REASSIGNED');
  }

  console.log('\n=== Stage 9: Merge ===');
  {
    const a = await api('POST', '/api/incidents', {
      title: 'Merge test A', type: 'fire', latitude: 22.4, longitude: 72.8, people_at_risk: 3,
    });
    const b = await api('POST', '/api/incidents', {
      title: 'Merge test B', type: 'fire', latitude: 22.4, longitude: 72.8, people_at_risk: 9,
    });
    const merge = await api('POST', `/api/incidents/${a.json.data.id}/merge`, { target_incident_id: b.json.data.id });
    assert(merge.status === 200, 'merge succeeds');
    assert(merge.json.data.merged_incident.status === 'MERGED', 'source incident becomes MERGED');
    assert(merge.json.data.target_incident.people_at_risk === 9, 'target people_at_risk is the max of both');

    const doubleMerge = await api('POST', `/api/incidents/${a.json.data.id}/merge`, { target_incident_id: b.json.data.id });
    assert(doubleMerge.status === 409, 're-merging an already-merged source returns 409');
  }

  console.log('\n=== Stage 13: Alerts ===');
  {
    const list = await api('GET', '/api/alerts');
    assert(list.status === 200 && Array.isArray(list.json.data), 'GET /api/alerts returns a list');
    const forIncident = await api('GET', `/api/alerts?incident_id=${incidentId}`);
    assert(forIncident.json.data.length > 0, 'alerts exist for the test incident (at least RESOURCE_FAILURE)');

    const alertId = forIncident.json.data[0].id;
    const ack = await api('PATCH', `/api/alerts/${alertId}/acknowledge`, {});
    assert(ack.status === 200 && ack.json.data.acknowledged === true, 'acknowledging an alert works');
  }

  console.log('\n=== Stage 15: Analytics ===');
  {
    const { status, json } = await api('GET', '/api/analytics');
    assert(status === 200, 'GET /api/analytics returns 200');
    const d = json.data;
    assert(typeof d.total_incidents === 'number', 'total_incidents is a number');
    assert(typeof d.incidents_by_type === 'object', 'incidents_by_type is an object');
    assert(Array.isArray(d.affected_areas), 'affected_areas is an array');
  }

  console.log('\n=== Guard rails ===');
  {
    const badAssign = await api('POST', '/api/assignments', { incident_id: incidentId, resource_id: resourceAId });
    assert(badAssign.status === 409, 'proposing an assignment for a non-AVAILABLE resource returns 409');

    const notFound = await api('GET', `/api/incidents/00000000-0000-0000-0000-000000000000`);
    assert(notFound.status === 404, 'unknown incident id returns 404');

    const badBody = await api('POST', '/api/incidents', { title: '' });
    assert(badBody.status === 400, 'invalid incident body returns 400');
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`\x1b[1mResults: ${passed} passed, ${failed} failed\x1b[0m`);
  console.log('='.repeat(50));
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\nTest run crashed:', err);
  process.exit(1);
});
