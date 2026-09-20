const { query } = require('../config/db');

async function createNotification({ userId, title, message, type, relatedIncidentId }) {
  const { rows } = await query(
    `INSERT INTO notifications (user_id, title, message, type, related_incident_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId ?? null, title, message, type ?? 'general', relatedIncidentId ?? null]
  );
  return rows[0];
}

async function listForUser(userId, { unreadOnly = false } = {}) {
  const conditions = ['(user_id = $1 OR user_id IS NULL)'];
  const params = [userId];
  if (unreadOnly) conditions.push('read = false');
  const { rows } = await query(
    `SELECT * FROM notifications WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
    params
  );
  return rows;
}

async function markRead(id) {
  const { rows } = await query(
    `UPDATE notifications SET read = true WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { createNotification, listForUser, markRead };
