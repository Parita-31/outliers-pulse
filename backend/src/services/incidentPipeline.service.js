const incidentModel = require('../models/incident.model');
const reportModel = require('../models/report.model');
const aiAnalysisModel = require('../models/aiAnalysis.model');
const severityService = require('./severity.service');
const { logActivity } = require('../models/activityLog.model');
const { emitEvent } = require('../config/socket');

/**
 * Recomputes and persists severity for an incident based on its current
 * people_at_risk/type, all attached reports, and its most recent AI analysis.
 * Logs SEVERITY_CHANGED and emits incident:severity_changed only if the
 * severity level actually changed.
 *
 * @param {string} incidentId
 * @returns {Promise<object>} the updated incident row
 */
async function runSeverityScoring(incidentId) {
  const incident = await incidentModel.getIncidentById(incidentId);
  if (!incident) throw new Error(`runSeverityScoring: incident ${incidentId} not found`);

  const [reports, analyses] = await Promise.all([
    reportModel.listReportsForIncident(incidentId),
    aiAnalysisModel.listForIncident(incidentId),
  ]);
  const latestAnalysis = analyses[0] || null;

  const { score, severity, factors } = severityService.computeSeverity({
    incident, reports, latestAnalysis,
  });

  const previousSeverity = incident.severity;

  const updated = await incidentModel.updateIncident(incidentId, {
    severity,
    severity_score: score,
    severity_factors: factors,
  });

  if (severity !== previousSeverity) {
    await logActivity({
      incidentId,
      action: 'SEVERITY_CHANGED',
      details: { from: previousSeverity, to: severity, score },
    });
    emitEvent('incident:severity_changed', updated);
  }

  emitEvent('incident:updated', updated);
  return updated;
}

module.exports = { runSeverityScoring };
