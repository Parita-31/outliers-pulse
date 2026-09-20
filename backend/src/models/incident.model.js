const { query } = require('../config/db');

function normalizeIncident(inc) {
  if (!inc) return null;
  const lat = inc.latitude !== undefined ? Number(inc.latitude) : 22.6916;
  const lng = inc.longitude !== undefined ? Number(inc.longitude) : 72.8634;

  let factors = [];
  if (Array.isArray(inc.severity_factors)) {
    factors = inc.severity_factors.map((f) => ({
      name: f.factor || f.name,
      weight: f.points !== undefined ? `+${f.points} pts` : f.weight || '+10 pts',
      category: f.category || 'GENERAL',
    }));
  }

  return {
    ...inc,
    peopleAtRisk: inc.people_at_risk ?? 0,
    confidence: inc.confidence_score ? Number(inc.confidence_score) : 94,
    lat,
    lng,
    location: inc.location || {
      lat,
      lng,
      address: inc.address || inc.title,
      sector: inc.sector || 'Nadiad Sector',
    },
    explainability: inc.explainability || {
      score: inc.severity_score || 85,
      severityLevel: inc.severity || 'HIGH',
      factors,
    },
    evidence: inc.evidence || [],
    risks: inc.risks || [],
    reports: inc.reports || [],
    currentResponse: inc.currentResponse || {
      assignedResources: [],
      status: inc.status || 'ACTIVE',
    },
  };
}

async function createIncident({
  title,
  type,
  description,
  latitude,
  longitude,
  people_at_risk,
  status,
  created_by,
}) {
  const { rows } = await query(
    `INSERT INTO incidents
       (title, type, description, latitude, longitude, people_at_risk, status, created_by)
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       COALESCE($7::incident_status, 'REPORTED'::incident_status),
       $8
     )
     RETURNING *`,
    [
      title,
      type,
      description ?? null,
      latitude,
      longitude,
      people_at_risk ?? 0,
      status ?? null,
      created_by ?? null,
    ]
  );

  return normalizeIncident(rows[0]);
}

async function getIncidentById(id) {
  const { rows } = await query(
    `SELECT * FROM incidents WHERE id = $1`,
    [id]
  );

  return normalizeIncident(rows[0]);
}


async function listIncidents({
  status,
  type,
  severity,
  priority,
  page = 1,
  limit = 20,
  sort = '-created_at',
} = {}) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}::incident_status`);
  }

  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }

  if (severity) {
    params.push(severity);
    conditions.push(`severity = $${params.length}`);
  }

  if (priority) {
    params.push(priority);
    conditions.push(`priority = $${params.length}`);
  }

  const where = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const sortMap = {
    created_at: 'created_at ASC',
    '-created_at': 'created_at DESC',
    severity_score: 'severity_score ASC NULLS LAST',
    '-severity_score': 'severity_score DESC NULLS LAST',
  };

  const orderBy = sortMap[sort] || 'created_at DESC';

  const offset = (page - 1) * limit;

  params.push(limit);
  const limitIdx = params.length;

  params.push(offset);
  const offsetIdx = params.length;

  const { rows } = await query(
    `SELECT *
     FROM incidents
     ${where}
     ORDER BY ${orderBy}
     LIMIT $${limitIdx}
     OFFSET $${offsetIdx}`,
    params
  );

  const countParams = params.slice(0, conditions.length);

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total
     FROM incidents
     ${where}`,
    countParams
  );

  return {
    items: rows.map(normalizeIncident),
    total: countRows[0].total,
    page,
    limit,
  };
}

async function updateIncident(id, fields) {
  const allowed = [
    'title',
    'type',
    'description',
    'latitude',
    'longitude',
    'people_at_risk',
    'status',
    'severity',
    'severity_score',
    'severity_factors',
    'priority',
    'priority_reasons',
    'confidence_score',
    'merged_into_incident_id',
  ];

  const sets = [];
  const params = [];

  for (const key of Object.keys(fields)) {
    if (!allowed.includes(key)) continue;

    params.push(
      key === 'severity_factors' || key === 'priority_reasons'
        ? JSON.stringify(fields[key])
        : fields[key]
    );

    if (key === 'status') {
      sets.push(`status = $${params.length}::incident_status`);
    } else {
      sets.push(`${key} = $${params.length}`);
    }
  }

  if (fields.status === 'RESOLVED') {
    sets.push(`resolved_at = now()`);
  }

  if (sets.length === 0) {
    return getIncidentById(id);
  }

  params.push(id);

  const { rows } = await query(
    `UPDATE incidents
     SET ${sets.join(', ')}
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );

  return normalizeIncident(rows[0]);
}


async function listActiveIncidentsSince(sinceMinutes) {
  const { rows } = await query(
    `SELECT *
     FROM incidents
     WHERE status NOT IN (
       'RESOLVED'::incident_status,
       'CLOSED'::incident_status,
       'MERGED'::incident_status
     )
     AND created_at >= now() - ($1 || ' minutes')::interval
     ORDER BY created_at DESC`,
    [sinceMinutes]
  );

  return rows;
}

module.exports = {
  createIncident,
  getIncidentById,
  listIncidents,
  updateIncident,
  listActiveIncidentsSince,
};