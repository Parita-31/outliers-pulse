const incidentModel = require('../models/incident.model');
const reportModel = require('../models/report.model');
const aiAnalysisModel = require('../models/aiAnalysis.model');
const aiService = require('../services/ai.service');
const { runIncidentScoring } = require('../services/incidentPipeline.service');
const { mergeIncidents } = require('../services/merge.service');
const { simulateResourceFailure, recoverAssignment } = require('../services/dynamicrecovery.service');
const { logActivity } = require('../models/activityLog.model');
const { emitEvent } = require('../config/socket');
const ApiError = require('../utils/ApiError');
const {
  createIncidentSchema, updateIncidentSchema, listIncidentsQuerySchema, mergeIncidentSchema,
  simulateResourceFailureSchema, recoverSchema,
} = require('../utils/validators');

async function create(req, res) {
  const data = createIncidentSchema.parse(req.body);
  const incident = await incidentModel.createIncident(data);

  await logActivity({
    incidentId: incident.id,
    action: 'INCIDENT_CREATED',
    details: { title: incident.title, type: incident.type, source: 'manual' },
  });

  emitEvent('incident:created', incident);

  res.status(201).json({ success: true, data: incident });
}

async function list(req, res) {
  const params = listIncidentsQuerySchema.parse(req.query);
  const result = await incidentModel.listIncidents(params);
  res.json({
    success: true,
    data: result.items,
    pagination: { page: result.page, limit: result.limit, total: result.total },
  });
}

async function getOne(req, res) {
  const incident = await incidentModel.getIncidentById(req.params.id);
  if (!incident) throw ApiError.notFound('Incident not found');
  res.json({ success: true, data: incident });
}

async function update(req, res) {
  const data = updateIncidentSchema.parse(req.body);
  const existing = await incidentModel.getIncidentById(req.params.id);
  if (!existing) throw ApiError.notFound('Incident not found');

  const updated = await incidentModel.updateIncident(req.params.id, data);

  if (data.severity && data.severity !== existing.severity) {
    await logActivity({
      incidentId: updated.id,
      action: 'SEVERITY_CHANGED',
      details: { from: existing.severity, to: data.severity },
    });
    emitEvent('incident:severity_changed', updated);
  }

  if (data.status === 'RESOLVED' && existing.status !== 'RESOLVED') {
    await logActivity({ incidentId: updated.id, action: 'INCIDENT_RESOLVED', details: {} });
  }

  emitEvent('incident:updated', updated);
  res.json({ success: true, data: updated });
}

module.exports = { create, list, getOne, update, analyze, merge, simulateFailure, recover };

/**
 * POST /api/incidents/:id/merge
 * Merges :id (source) into body.target_incident_id.
 */
async function merge(req, res) {
  const { target_incident_id } = mergeIncidentSchema.parse(req.body);
  const result = await mergeIncidents(req.params.id, target_incident_id);
  res.json({ success: true, data: result });
}

/**
 * POST /api/incidents/:id/simulate-resource-failure
 */
async function simulateFailure(req, res) {
  const { resource_id } = simulateResourceFailureSchema.parse(req.body);
  const result = await simulateResourceFailure(req.params.id, resource_id);
  res.json({ success: true, data: result });
}

/**
 * POST /api/incidents/:id/recover
 */
async function recover(req, res) {
  const { assignment_id, new_resource_id, approved_by } = recoverSchema.parse(req.body);
  const result = await recoverAssignment(req.params.id, assignment_id, new_resource_id, approved_by);
  res.json({ success: true, data: result });
}

/**
 * POST /api/incidents/:id/analyze
 * Runs AI classification (Gemini, or deterministic fallback) over the
 * incident's description + all attached report messages, and persists the
 * result. Never throws on AI failure - falls back automatically.
 */
async function analyze(req, res) {
  const incident = await incidentModel.getIncidentById(req.params.id);
  if (!incident) throw ApiError.notFound('Incident not found');

  const reports = await reportModel.listReportsForIncident(incident.id);
  const combinedText = [
    incident.title,
    incident.description || '',
    ...reports.map((r) => r.message),
  ].filter(Boolean).join('\n');

  if (!combinedText.trim()) {
    throw ApiError.badRequest('Incident has no description or reports to analyze');
  }

  const { result, usedFallback, rawResponse, model } = await aiService.classify(combinedText);

  await aiAnalysisModel.saveAnalysis({
    incidentId: incident.id,
    reportId: null,
    inputText: combinedText,
    rawResponse,
    parsedOutput: result,
    model,
    usedFallback,
    confidence: result.confidence,
  });

  const updated = await incidentModel.updateIncident(incident.id, {
    type: result.incidentType,
    people_at_risk: Math.max(incident.people_at_risk || 0, result.peopleAtRisk),
    confidence_score: result.confidence,
  });

  await logActivity({
    incidentId: incident.id,
    action: 'INCIDENT_CLASSIFIED',
    details: {
      incidentType: result.incidentType,
      urgency: result.urgency,
      usedFallback,
      confidence: result.confidence,
    },
  });

  const withSeverity = await runIncidentScoring(incident.id);

  res.json({
    success: true,
    data: { ...withSeverity, ai_analysis: { ...result, usedFallback } },
  });
}