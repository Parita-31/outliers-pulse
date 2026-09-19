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

module.exports = { createAlert, getAlertById };