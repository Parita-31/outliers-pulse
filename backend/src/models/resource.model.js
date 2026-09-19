const { query } = require('../config/db');

async function createResource({
  name,
  type,
  capability,
  latitude,
  longitude,
  status,
  workload,
  eta,
  current_incident_id,
}) {
  const { rows } = await query(
    `INSERT INTO resources
      (
        name,
        type,
        capability,
        latitude,
        longitude,
        status,
        workload,
        eta,
        current_incident_id
      )
     VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        COALESCE($6::resource_status, 'AVAILABLE'::resource_status),
        $7,
        $8,
        $9
      )
     RETURNING *`,
    [
      name,
      type,
      JSON.stringify(capability ?? []),
      latitude,
      longitude,
      status ?? null,
      workload ?? 0,
      eta ?? null,
      current_incident_id ?? null,
    ]
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

async function listResources({
  type,
  status,
  page = 1,
  limit = 20,
} = {}) {
  const conditions = [];
  const params = [];

  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(
      `status = $${params.length}::resource_status`
    );
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const offset = (page - 1) * limit;

  params.push(limit);
  const limitIdx = params.length;

  params.push(offset);
  const offsetIdx = params.length;

  const { rows } = await query(
    `SELECT *
     FROM resources
     ${where}
     ORDER BY created_at DESC
     LIMIT $${limitIdx}
     OFFSET $${offsetIdx}`,
    params
  );

  const countParams = params.slice(0, conditions.length);

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total
     FROM resources
     ${where}`,
    countParams
  );

  return {
    items: rows,
    total: countRows[0].total,
    page,
    limit,
  };
}

async function updateResource(id, fields) {
  const allowed = [
    'name',
    'type',
    'capability',
    'latitude',
    'longitude',
    'status',
    'workload',
    'eta',
    'current_incident_id',
  ];

  const sets = [];
  const params = [];

  for (const key of Object.keys(fields)) {
    if (!allowed.includes(key)) {
      continue;
    }

    let value = fields[key];

    // capability is JSONB
    if (key === 'capability') {
      value = JSON.stringify(value ?? []);
    }

    params.push(value);

    if (key === 'status') {
      sets.push(
        `status = $${params.length}::resource_status`
      );
    } else {
      sets.push(`${key} = $${params.length}`);
    }
  }

  if (sets.length === 0) {
    return getResourceById(id);
  }

  params.push(id);

  const { rows } = await query(
    `UPDATE resources
     SET ${sets.join(', ')},
         updated_at = now()
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );

  return rows[0] || null;
}

/**
 * Updates ONLY the resource status.
 *
 * IMPORTANT:
 * The second argument must be a string such as:
 * 'AVAILABLE'
 * 'ASSIGNED'
 * 'BUSY'
 * 'OFFLINE'
 * 'UNAVAILABLE'
 */
async function updateResourceStatus(id, status) {
  const { rows } = await query(
    `UPDATE resources
     SET status = $1::resource_status,
         updated_at = now()
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );

  return rows[0] || null;
}

async function countAvailableByTypes(types = []) {
  if (!Array.isArray(types) || types.length === 0) {
    return {};
  }

  const { rows } = await query(
    `SELECT
       type,
       COUNT(*)::int AS count
     FROM resources
     WHERE type = ANY($1::resource_type[])
       AND status = 'AVAILABLE'::resource_status
     GROUP BY type`,
    [types]
  );

  const counts = {};

  for (const type of types) {
    counts[type] = 0;
  }

  for (const row of rows) {
    counts[row.type] = row.count;
  }

  return counts;
}

module.exports = {
  createResource,
  getResourceById,
  listResources,
  updateResource,
  updateResourceStatus,
  countAvailableByTypes,
};