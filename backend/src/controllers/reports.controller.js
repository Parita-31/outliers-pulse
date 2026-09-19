const reportModel = require('../models/report.model');
const incidentModel = require('../models/incident.model');
const aiAnalysisModel = require('../models/aiAnalysis.model');
const aiService = require('../services/ai.service');
const duplicateDetection = require('../services/duplicateDetection.service');
const env = require('../config/env');
const { runIncidentScoring } = require('../services/incidentPipeline.service');
const { logActivity } = require('../models/activityLog.model');
const { emitEvent } = require('../config/socket');
const ApiError = require('../utils/ApiError');
const { createReportSchema } = require('../utils/validators');

/**
 * POST /api/reports
 *
 * - If incident_id is given: stores the report attached to that incident (Stage 3 behavior).
 * - If incident_id is omitted: runs AI classification (Stage 5), then duplicate detection
 *   (Stage 8) against recent active incidents. If a strong match is found, the report is
 *   attached to that existing incident instead of spawning a duplicate. Otherwise a new
 *   incident is created from the classification result, as before.
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

  // No incident_id -> classify, then check for a duplicate before creating a new incident.
  // Incidents require a location, so we need one here if we might end up creating one.
  if (data.latitude === undefined || data.longitude === undefined) {
    throw ApiError.badRequest(
      'latitude and longitude are required when incident_id is omitted (needed to create/match an incident)'
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

  // Search a wider window than the scoring time-window so a same-type, nearby, textually
  // similar incident just outside the "recent" bucket can still be found (it will simply
  // score 0 on the time-proximity factor rather than being excluded outright).
  const candidateWindow = env.DUPLICATE_TIME_WINDOW_MIN * 4;
  const candidates = await incidentModel.listActiveIncidentsSince(candidateWindow);
  const match = duplicateDetection.findBestMatch(
    {
      type: result.incidentType,
      message: report.message,
      latitude: report.latitude,
      longitude: report.longitude,
      timestamp: report.timestamp,
    },
    candidates
  );

  let incident;
  let isDuplicate = false;

  if (match) {
    isDuplicate = true;
    incident = match.incident;
    await reportModel.attachReportToIncident(report.id, incident.id);
    await incidentModel.updateIncident(incident.id, {
      people_at_risk: Math.max(incident.people_at_risk || 0, result.peopleAtRisk),
    });
    await logActivity({
      incidentId: incident.id,
      action: 'REPORT_RECEIVED',
      details: {
        note: 'Attached via duplicate detection instead of creating a new incident',
        relatednessScore: match.score,
        reasons: match.reasons,
        reportId: report.id,
      },
    });
  } else {
    incident = await incidentModel.createIncident({
      title: result.summary.length > 100 ? `${result.summary.slice(0, 97)}...` : result.summary,
      type: result.incidentType,
      description: report.message,
      latitude: report.latitude,
      longitude: report.longitude,
      people_at_risk: result.peopleAtRisk,
      status: 'REPORTED',
    });
    await incidentModel.updateIncident(incident.id, { confidence_score: result.confidence });
    await reportModel.attachReportToIncident(report.id, incident.id);
    await logActivity({
      incidentId: incident.id,
      action: 'INCIDENT_CREATED',
      details: { title: incident.title, type: incident.type, source: 'ai_classification' },
    });
  }

  const attachedReport = await reportModel.getReportById(report.id);

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
    action: 'INCIDENT_CLASSIFIED',
    details: { incidentType: result.incidentType, urgency: result.urgency, usedFallback },
  });

  const finalIncident = await runIncidentScoring(incident.id);
  emitEvent(isDuplicate ? 'incident:updated' : 'incident:created', finalIncident);

  return res.status(201).json({
    success: true,
    data: {
      ...attachedReport,
      ai_analysis: { ...result, usedFallback },
      incident: finalIncident,
      duplicate_detection: isDuplicate
        ? { matched: true, score: match.score, reasons: match.reasons }
        : { matched: false },
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
