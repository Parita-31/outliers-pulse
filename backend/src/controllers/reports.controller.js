const reportModel = require('../models/report.model');
const incidentModel = require('../models/incident.model');
const aiAnalysisModel = require('../models/aiAnalysis.model');
const aiService = require('../services/ai.service');
const { runIncidentScoring } = require('../services/incidentPipeline.service');
const { logActivity } = require('../models/activityLog.model');
const { emitEvent } = require('../config/socket');
const ApiError = require('../utils/ApiError');
const { createReportSchema } = require('../utils/validators');

/**
 * POST /api/reports
 *
 * - If incident_id is given: stores the report attached to that incident (Stage 3 behavior).
 * - If incident_id is omitted (Stage 5): runs AI classification (Gemini or deterministic
 *   fallback) on the report message, creates a new incident from the result, and attaches
 *   the report to it. NOTE: this always creates a new incident for now - Stage 8 inserts a
 *   duplicate-detection check here so a report can attach to an existing related incident
 *   instead of always creating a new one.
 */
async function create(req, res) {
  const data = createReportSchema.parse(req.body);

  if (data.incident_id) {
    const incident = await incidentModel.getIncidentById(data.incident_id);
    if (!incident) throw ApiError.badRequest('incident_id does not reference an existing incident');

    const report = await reportModel.createReport(data);
    await logActivity({
      incidentId: report.incident_id,
      action: 'REPORT_RECEIVED',
      details: { source: report.source, reportId: report.id },
    });
    emitEvent('report:created', report);
    await runIncidentScoring(report.incident_id);

    return res.status(201).json({ success: true, data: report });
  }

  // No incident_id -> classify and auto-create an incident.
  // Incidents require a location, so we need one here if we're the one creating it.
  if (data.latitude === undefined || data.longitude === undefined) {
    throw ApiError.badRequest(
      'latitude and longitude are required when incident_id is omitted (needed to create the incident)'
    );
  }

  const report = await reportModel.createReport(data);
  await logActivity({
    incidentId: null,
    action: 'REPORT_RECEIVED',
    details: { source: report.source, reportId: report.id },
  });
  emitEvent('report:created', report);

  const { result, usedFallback, rawResponse, model } = await aiService.classify(report.message);

  const incident = await incidentModel.createIncident({
    title: result.summary.length > 100 ? `${result.summary.slice(0, 97)}...` : result.summary,
    type: result.incidentType,
    description: report.message,
    latitude: report.latitude,
    longitude: report.longitude,
    people_at_risk: result.peopleAtRisk,
    status: 'REPORTED',
  });

  await incidentModel.updateIncident(incident.id, { confidence_score: result.confidence });
  const attachedReport = await reportModel.attachReportToIncident(report.id, incident.id);

  await aiAnalysisModel.saveAnalysis({
    incidentId: incident.id,
    reportId: report.id,
    inputText: report.message,
    rawResponse,
    parsedOutput: result,
    model,
    usedFallback,
    confidence: result.confidence,
  });

  await logActivity({
    incidentId: incident.id,
    action: 'INCIDENT_CREATED',
    details: { title: incident.title, type: incident.type, source: 'ai_classification' },
  });
  await logActivity({
    incidentId: incident.id,
    action: 'INCIDENT_CLASSIFIED',
    details: { incidentType: result.incidentType, urgency: result.urgency, usedFallback },
  });

  const finalIncident = await runIncidentScoring(incident.id);
  emitEvent('incident:created', finalIncident);

  return res.status(201).json({
    success: true,
    data: {
      ...attachedReport,
      ai_analysis: { ...result, usedFallback },
      incident: finalIncident,
    },
  });
}

async function listForIncident(req, res) {
  const incident = await incidentModel.getIncidentById(req.params.id);
  if (!incident) throw ApiError.notFound('Incident not found');
  const reports = await reportModel.listReportsForIncident(req.params.id);
  res.json({ success: true, data: reports });
}

module.exports = { create, listForIncident };