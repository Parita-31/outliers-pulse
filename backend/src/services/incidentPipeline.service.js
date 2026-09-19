const incidentModel = require('../models/incident.model');
const reportModel = require('../models/report.model');
const resourceModel = require('../models/resource.model');
const aiAnalysisModel = require('../models/aiAnalysis.model');
const severityService = require('./severity.service');
const priorityService = require('./priority.service');
const aiService = require('./ai.service');
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

module.exports = { runSeverityScoring, runPriorityScoring, runIncidentScoring, getNeededResourceTypes, getLatestAnalysis };

/**
 * Most recent ai_analyses row for an incident, or null.
 * @param {string} incidentId
 */
async function getLatestAnalysis(incidentId) {
  const analyses = await aiAnalysisModel.listForIncident(incidentId);
  return analyses[0] || null;
}

/**
 * The resource types this incident needs: prefers the most recent AI
 * classification's resourceTypes, falling back to the static type->resources
 * mapping when no classification exists yet. Shared by priority scoring and
 * the resource recommendation engine so they never disagree.
 *
 * @param {object} incident
 * @param {object|null} [latestAnalysis]
 * @returns {Promise<string[]>}
 */
async function getNeededResourceTypes(incident, latestAnalysis) {
  const analysis = latestAnalysis !== undefined ? latestAnalysis : await getLatestAnalysis(incident.id);
  const parsed = analysis && analysis.parsed_output ? analysis.parsed_output : null;
  if (parsed && Array.isArray(parsed.resourceTypes) && parsed.resourceTypes.length > 0) {
    return parsed.resourceTypes;
  }
  return aiService.TYPE_TO_RESOURCES[incident.type] || [];
}

/**
 * Recomputes and persists priority for an incident. Builds on the incident's
 * current severity (so call runSeverityScoring first / use runIncidentScoring),
 * people_at_risk, latest AI urgency assessment, spread-prone type, live
 * resource availability, and time-since-report while still awaiting response.
 *
 * @param {string} incidentId
 * @returns {Promise<object>} the updated incident row
 */
async function runPriorityScoring(incidentId) {
  const incident = await incidentModel.getIncidentById(incidentId);
  if (!incident) throw new Error(`runPriorityScoring: incident ${incidentId} not found`);

  const latestAnalysis = await getLatestAnalysis(incidentId);
  const neededResourceTypes = await getNeededResourceTypes(incident, latestAnalysis);

  const availableResourceCount = await resourceModel.countAvailableByTypes(neededResourceTypes);

  const { score, priority, reasons } = priorityService.computePriority({
    incident, latestAnalysis, availableResourceCount, neededResourceTypes,
  });

  const previousPriority = incident.priority;

  const updated = await incidentModel.updateIncident(incidentId, {
    priority,
    priority_reasons: reasons,
  });

  if (priority !== previousPriority) {
    await logActivity({
      incidentId,
      action: 'PRIORITY_CHANGED',
      details: { from: previousPriority, to: priority, score },
    });
  }

  emitEvent('incident:updated', updated);
  return updated;
}

/**
 * Convenience wrapper: reruns severity then priority (priority depends on
 * the freshly-computed severity), returning the final incident. This is what
 * report-ingestion and /analyze should call.
 */
async function runIncidentScoring(incidentId) {
  await runSeverityScoring(incidentId);
  return runPriorityScoring(incidentId);
}
