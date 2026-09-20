const notificationModel = require('../models/notification.model');
const { emitEvent } = require('../config/socket');

/**
 * Creates a notification record and pushes it live over Socket.IO.
 *
 * @param {object} params
 * @param {string|null} [params.userId] - null = broadcast to all connected clients
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.type]
 * @param {string|null} [params.relatedIncidentId]
 */
async function notify({ userId = null, title, message, type = 'general', relatedIncidentId = null }) {
  const notification = await notificationModel.createNotification({
    userId, title, message, type, relatedIncidentId,
  });
  emitEvent('notification:created', notification);
  return notification;
}

const ALERT_TITLES = {
  CRITICAL_INCIDENT: 'Critical Incident',
  SEVERITY_ESCALATION: 'Severity Escalated',
  RESOURCE_FAILURE: 'Resource Failure',
  RESPONSE_DELAY: 'Response Delay',
  RESOURCE_SHORTAGE: 'Resource Shortage',
  UNRESOLVED_HIGH_PRIORITY: 'Unresolved High-Priority Incident',
  CASCADING_IMPACT: 'Cascading Impact Detected',
};

/**
 * Convenience: builds a notification straight from an alert row.
 * @param {object} alert
 */
async function notifyFromAlert(alert) {
  return notify({
    title: ALERT_TITLES[alert.type] || alert.type,
    message: alert.message,
    type: alert.type.toLowerCase(),
    relatedIncidentId: alert.incident_id,
  });
}

module.exports = { notify, notifyFromAlert };
