const { query } = require('../config/db');

async function createResource({ name, type, capability, latitude, longitude, status, workload }) {
  const { rows } = await query(
    `INSERT INTO resources (name, type, capability, latitude, longitude, status, workload)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::resource_status, 'AVAILABLE'::resource_status), COALESCE($7, 0))
     RETURNING *`,
    [name, type, JSON.stringify(capability ?? []), latitude, longitude, status ?? null, workload ?? null]
  );
  return rows[0];
}

async function getResourceById(id) {
  const { rows } = await query(
    `SELECT * FROM resources WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function listResources({ status, type } = {}) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}::resource_status`);
  }

  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT * FROM resources ${where} ORDER BY name ASC`,
    params
  );

  return rows;
}

async function updateResourceStatus(id, { status, eta, current_incident_id }) {
  const sets = ['status = $1::resource_status'];
  const params = [status];

  if (eta !== undefined) {
    params.push(eta);
    sets.push(`eta = $${params.length}`);
  }

  if (current_incident_id !== undefined) {
    params.push(current_incident_id);
    sets.push(`current_incident_id = $${params.length}`);
  }

  params.push(id);

  const { rows } = await query(
    `UPDATE resources
     SET ${sets.join(', ')}
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );

  return rows[0] || null;
}

async function listAvailableResourcesByType(type) {
  const { rows } = await query(
    `SELECT *
     FROM resources
     WHERE type = $1
       AND status = 'AVAILABLE'::resource_status`,
    [type]
  );

  return rows;
}

module.exports = {
  createResource,
  getResourceById,
  listResources,
  updateResourceStatus,
  listAvailableResourcesByType,
};