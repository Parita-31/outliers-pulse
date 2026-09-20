const { query } = require('../config/db');

async function createAlert({ incidentId, type, severity, message, metadata }) {
  const { rows } = await query(
    `INSERT INTO alerts (incident_id, type, severity, message, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [incidentId ?? null, type, severity ?? 'MODERATE', message, JSON.stringify(metadata ?? {})]
  );
  return rows[0];
}

async function getAlertById(id) {
  const { rows } = await query(`SELECT * FROM alerts WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function listAlerts({ acknowledged, type, incidentId } = {}) {
  const conditions = [];
  const params = [];

  if (acknowledged !== undefined) {
    params.push(acknowledged);
    conditions.push(`acknowledged = $${params.length}`);
  }
  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }
  if (incidentId) {
    params.push(incidentId);
    conditions.push(`incident_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT * FROM alerts ${where} ORDER BY created_at DESC`,
    params
  );
  return rows;
}

async function acknowledgeAlert(id, acknowledgedBy) {
  const { rows } = await query(
    `UPDATE alerts
     SET acknowledged = true, acknowledged_by = $1, acknowledged_at = now()
     WHERE id = $2
     RETURNING *`,
    [acknowledgedBy ?? null, id]
  );
  return rows[0] || null;
}

/**
 * Prevents duplicate open alerts of the same type for the same incident
 * (e.g. don't raise a second SEVERITY_ESCALATION alert every time a report
 * comes in while the incident is still CRITICAL).
 */
async function hasOpenAlertOfType(incidentId, type) {
  const { rows } = await query(
    `SELECT 1 FROM alerts WHERE incident_id = $1 AND type = $2 AND acknowledged = false LIMIT 1`,
    [incidentId, type]
  );
  return rows.length > 0;
}

module.exports = {
  createAlert,
  getAlertById,
  listAlerts,
  acknowledgeAlert,
  hasOpenAlertOfType,
};
