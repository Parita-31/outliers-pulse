/* eslint-disable no-console */
// Simple smoke test for Stage 3 endpoints. Requires the server to be running
// (npm run dev) and the DB migrated. Uses global fetch (Node 18+).

const BASE = process.env.API_BASE || 'http://localhost:4000';

async function main() {
  console.log('== Health check ==');
  console.log(await (await fetch(`${BASE}/health`)).json());

  console.log('\n== Create incident ==');
  const createRes = await fetch(`${BASE}/api/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Warehouse fire on 4th Street',
      type: 'fire',
      description: 'Large fire reported near warehouse district',
      latitude: 22.5645,
      longitude: 72.9289,
      people_at_risk: 12,
    }),
  });
  const created = await createRes.json();
  console.log(createRes.status, created);
  const incidentId = created.data && created.data.id;

  console.log('\n== List incidents ==');
  console.log(await (await fetch(`${BASE}/api/incidents?limit=5`)).json());

  if (incidentId) {
    console.log('\n== Get incident by id ==');
    console.log(await (await fetch(`${BASE}/api/incidents/${incidentId}`)).json());

    console.log('\n== Patch incident (status -> VERIFIED) ==');
    const patchRes = await fetch(`${BASE}/api/incidents/${incidentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'VERIFIED', severity: 'HIGH' }),
    });
    console.log(patchRes.status, await patchRes.json());

    console.log('\n== Create report attached to incident ==');
    const reportRes = await fetch(`${BASE}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: incidentId,
        source: 'citizen',
        message: 'Heavy smoke visible from the highway',
        latitude: 22.5648,
        longitude: 72.9291,
      }),
    });
    console.log(reportRes.status, await reportRes.json());

    console.log('\n== List reports for incident ==');
    console.log(await (await fetch(`${BASE}/api/incidents/${incidentId}/reports`)).json());
  }

  console.log('\n== Create resource ==');
  const resourceRes = await fetch(`${BASE}/api/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Fire Truck 12',
      type: 'fire_team',
      capability: ['firefighting', 'rescue'],
      latitude: 22.5701,
      longitude: 72.9345,
    }),
  });
  const resource = await resourceRes.json();
  console.log(resourceRes.status, resource);
  const resourceId = resource.data && resource.data.id;

  console.log('\n== List resources ==');
  console.log(await (await fetch(`${BASE}/api/resources`)).json());

  if (resourceId) {
    console.log('\n== Update resource status ==');
    const statusRes = await fetch(`${BASE}/api/resources/${resourceId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'EN_ROUTE', eta: 8, current_incident_id: incidentId }),
    });
    console.log(statusRes.status, await statusRes.json());
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
