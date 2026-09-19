const { query } = require('../config/db');

async function createReport({
  incident_id, source, message, latitude, longitude,
  reporter_name, reporter_contact, confidence, metadata,
}) {
  const { rows } = await query(
    `INSERT INTO reports
       (incident_id, source, message, latitude, longitude, reporter_name, reporter_contact, confidence, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      incident_id ?? null, source, message, latitude ?? null, longitude ?? null,
      reporter_name ?? null, reporter_contact ?? null, confidence ?? null,
      JSON.stringify(metadata ?? {}),
    ]
  );
  return rows[0];
}

async function getReportById(id) {
  const { rows } = await query(`SELECT * FROM reports WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function listReportsForIncident(incidentId) {
  const { rows } = await query(
    `SELECT * FROM reports WHERE incident_id = $1 ORDER BY "timestamp" DESC`,
    [incidentId]
  );
  return rows;
}

async function attachReportToIncident(reportId, incidentId) {
  const { rows } = await query(
    `UPDATE reports SET incident_id = $1 WHERE id = $2 RETURNING *`,
    [incidentId, reportId]
  );
  return rows[0] || null;
}

/**
 * Reports within a time+space window of a given point, optionally
 * excluding a specific incident. Used later by duplicate detection.
 */
async function findNearbyRecentReports({ latitude, longitude, sinceMinutes, excludeIncidentId }) {
  const { rows } = await query(
    `SELECT * FROM reports
     WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       AND "timestamp" >= now() - ($1 || ' minutes')::interval
       AND ($2::uuid IS NULL OR incident_id IS DISTINCT FROM $2)
     ORDER BY "timestamp" DESC`,
    [sinceMinutes, excludeIncidentId ?? null]
  );
  return rows;
}



module.exports = {
  createReport,
  getReportById,
  listReportsForIncident,
  attachReportToIncident,
  findNearbyRecentReports,
};
