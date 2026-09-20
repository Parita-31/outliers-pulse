const alertModel = require('../models/alert.model');
const { logActivity } = require('../models/activityLog.model');
const { emitEvent } = require('../config/socket');
const { notifyFromAlert } = require('./notification.service');

const SEVERITY_RANK = { LOW: 1, MODERATE: 2, HIGH: 3, CRITICAL: 4 };
const AWAITING_RESPONSE_STATUSES = new Set(['REPORTED', 'VERIFIED']);
const OPEN_STATUSES = new Set(['REPORTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS']);

function minutesSince(date) {
  return (Date.now() - new Date(date).getTime()) / 60000;
}

async function raise({ incidentId, type, severity, message, metadata }) {
  if (await alertModel.hasOpenAlertOfType(incidentId, type)) return null;

  const alert = await alertModel.createAlert({ incidentId, type, severity, message, metadata });
  await logActivity({ incidentId, action: 'ALERT_CREATED', details: { alertId: alert.id, type, severity } });
  emitEvent('alert:created', alert);
  await notifyFromAlert(alert);
  return alert;
}

/**
 * Evaluates alert-worthy conditions on an incident after a scoring pass and
 * raises any that apply (deduplicated - won't re-raise an already-open alert
 * of the same type for the same incident).
 *
 * @param {object} params
 * @param {object|null} params.beforeIncident - incident state before this scoring pass (for escalation diff)
 * @param {object} params.afterIncident - incident state after scoring
 * @param {number} [params.availableResourceCount] - available resources matching this incident's needs
 */
async function evaluateAlerts({ beforeIncident, afterIncident, availableResourceCount }) {
  const raised = [];

  // Severity escalation (any upward move) + Critical incident (reaching CRITICAL specifically)
  const beforeRank = SEVERITY_RANK[beforeIncident && beforeIncident.severity] || 0;
  const afterRank = SEVERITY_RANK[afterIncident.severity] || 0;
  if (afterRank > beforeRank && beforeRank > 0) {
    const a = await raise({
      incidentId: afterIncident.id,
      type: 'SEVERITY_ESCALATION',
      severity: afterIncident.severity,
      message: `Severity escalated from ${beforeIncident.severity} to ${afterIncident.severity}`,
      metadata: { from: beforeIncident.severity, to: afterIncident.severity },
    });
    if (a) raised.push(a);
  }
  if (afterIncident.severity === 'CRITICAL') {
    const a = await raise({
      incidentId: afterIncident.id,
      type: 'CRITICAL_INCIDENT',
      severity: 'CRITICAL',
      message: `"${afterIncident.title}" has reached CRITICAL severity`,
      metadata: { severityScore: afterIncident.severity_score },
    });
    if (a) raised.push(a);
  }

  // Response delay - still awaiting first response after 60+ minutes
  if (AWAITING_RESPONSE_STATUSES.has(afterIncident.status)) {
    const elapsed = minutesSince(afterIncident.created_at);
    if (elapsed >= 60) {
      const a = await raise({
        incidentId: afterIncident.id,
        type: 'RESPONSE_DELAY',
        severity: afterIncident.severity || 'MODERATE',
        message: `"${afterIncident.title}" has had no response for ${Math.round(elapsed)} minutes`,
        metadata: { elapsedMinutes: Math.round(elapsed) },
      });
      if (a) raised.push(a);
    }
  }

  // Resource shortage - HIGH/CRITICAL severity with no matching resources available
  if (
    (afterIncident.severity === 'HIGH' || afterIncident.severity === 'CRITICAL') &&
    availableResourceCount === 0
  ) {
    const a = await raise({
      incidentId: afterIncident.id,
      type: 'RESOURCE_SHORTAGE',
      severity: afterIncident.severity,
      message: `No matching resources currently available for "${afterIncident.title}"`,
      metadata: { severity: afterIncident.severity },
    });
    if (a) raised.push(a);
  }

  // Unresolved high priority - P1 incident open for 2+ hours
  if (afterIncident.priority === 'P1' && OPEN_STATUSES.has(afterIncident.status)) {
    const elapsed = minutesSince(afterIncident.created_at);
    if (elapsed >= 120) {
      const a = await raise({
        incidentId: afterIncident.id,
        type: 'UNRESOLVED_HIGH_PRIORITY',
        severity: 'CRITICAL',
        message: `P1 incident "${afterIncident.title}" has been open for ${Math.round(elapsed / 60)}+ hours`,
        metadata: { elapsedMinutes: Math.round(elapsed) },
      });
      if (a) raised.push(a);
    }
  }

  // Cascading impact - CRITICAL severity with a large number of people at risk
  if (afterIncident.severity === 'CRITICAL' && (afterIncident.people_at_risk || 0) >= 50) {
    const a = await raise({
      incidentId: afterIncident.id,
      type: 'CASCADING_IMPACT',
      severity: 'CRITICAL',
      message: `"${afterIncident.title}" shows signs of cascading impact (${afterIncident.people_at_risk} people at risk)`,
      metadata: { peopleAtRisk: afterIncident.people_at_risk },
    });
    if (a) raised.push(a);
  }

  return raised;
}

module.exports = { evaluateAlerts };
