const { query } = require('../config/db');
const { emitEvent } = require('../config/socket');

/**
 * Record an activity log entry and broadcast it live.
 * @param {object} params
 * @param {string|null} params.incidentId
 * @param {string} params.action - one of the activity_action enum values
 * @param {string|null} [params.actorId]
 * @param {object} [params.details]
 */
async function logActivity({ incidentId = null, action, actorId = null, details = {} }) {
  const { rows } = await query(
    `INSERT INTO activity_logs (incident_id, action, actor_id, details)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [incidentId, action, actorId, JSON.stringify(details)]
  );
  const entry = rows[0];
  emitEvent('activity:new', entry);
  return entry;
}

async function listActivityForIncident(incidentId) {
  const { rows } = await query(
    `SELECT * FROM activity_logs WHERE incident_id = $1 ORDER BY created_at DESC`,
    [incidentId]
  );
  return rows;
}

module.exports = { logActivity, listActivityForIncident };
