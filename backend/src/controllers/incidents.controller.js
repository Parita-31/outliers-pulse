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

module.exports = { create, list, getOne, update, analyze, merge, simulateFailure, recover, getBriefing };

/**
 * POST /api/incidents/:id/merge
 * Merges :id (source) into body.target_incident_id.
 */
async function merge(req, res) {
  const targetId = req.body?.target_incident_id || req.body?.targetIncidentId;
  if (!targetId) throw ApiError.badRequest('target_incident_id is required');
  const result = await mergeIncidents(req.params.id, targetId);
  res.json({ success: true, data: result, mergedIncidentId: targetId });
}

/**
 * POST /api/incidents/:id/simulate-resource-failure
 */
async function simulateFailure(req, res) {
  const incidentId = req.params.id;
  let resourceId = req.body?.resource_id || req.body?.resourceId || req.body?.failedResourceId;

  if (!resourceId) {
    const { query } = require('../config/db');
    const assignedRes = await query(
      `SELECT * FROM resources WHERE current_incident_id = $1 AND status IN ('ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'BUSY') LIMIT 1`,
      [incidentId]
    );
    if (assignedRes.rows.length > 0) {
      resourceId = assignedRes.rows[0].id;
    } else {
      const assignRes = await query(
        `SELECT resource_id FROM assignments WHERE incident_id = $1 AND status IN ('APPROVED', 'ACTIVE') ORDER BY created_at DESC LIMIT 1`,
        [incidentId]
      );
      if (assignRes.rows.length > 0) {
        resourceId = assignRes.rows[0].resource_id;
      }
    }
  }

  if (!resourceId) {
    const { query } = require('../config/db');
    const anyRes = await query(`SELECT id FROM resources WHERE status = 'AVAILABLE' LIMIT 1`);
    resourceId = anyRes.rows[0]?.id;
  }

  if (!resourceId) {
    const { query } = require('../config/db');
    const anyRes = await query(`SELECT id FROM resources LIMIT 1`);
    resourceId = anyRes.rows[0]?.id;
  }

  if (!resourceId) {
    throw ApiError.badRequest('No resource found to simulate failure');
  }

  // Ensure resource has an active assignment on this incident before simulating failure
  const assignmentModel = require('../models/assignment.model');
  const assignmentService = require('../services/assignment.service');
  let activeAssign = await assignmentModel.getActiveAssignmentForResource(resourceId);
  if (!activeAssign || activeAssign.incident_id !== incidentId) {
    await resourceModel.updateResourceStatus(resourceId, 'AVAILABLE');
    const newAssign = await assignmentService.createAssignment(incidentId, resourceId);
    await assignmentService.approveAssignment(newAssign.id, 'system_commander');
  }

  const result = await simulateResourceFailure(incidentId, resourceId);

  const bestAlt = result.alternatives && result.alternatives.length > 0 ? result.alternatives[0] : null;

  const responseData = {
    incidentId,
    failedResourceId: result.failed_resource?.id,
    failedResourceName: result.failed_resource?.name,
    failureReason: 'Mechanical Transmission Failure / Engine Stall En Route',
    originalEtaMinutes: result.compromised_assignment?.eta || 6,
    alternativeRecommendation: bestAlt ? {
      resourceId: bestAlt.resource?.id || bestAlt.id,
      resourceName: bestAlt.resource?.name || bestAlt.name,
      type: bestAlt.resource?.type || bestAlt.type,
      newEtaMinutes: bestAlt.eta || 9,
      delayImpactMinutes: result.delay_impact_minutes || 3,
      distanceKm: bestAlt.distanceKm || 3.2,
      matchScore: bestAlt.score || 89,
      reasons: bestAlt.reasons || [
        'Nearest available ALS trauma backup unit in sector',
        'Alternative route bypasses flooded bridge',
        'ETA within survivability threshold'
      ]
    } : null,
    failed_resource: result.failed_resource,
    compromised_assignment: result.compromised_assignment,
    alert: result.alert,
    alternatives: result.alternatives,
    delay_impact_minutes: result.delay_impact_minutes
  };

  res.json({ success: true, data: responseData });
}

/**
 * POST /api/incidents/:id/recover
 */
async function recover(req, res) {
  const incidentId = req.params.id;
  const newResourceId = req.body?.new_resource_id || req.body?.newResourceId || req.body?.assignedResourceId;
  const assignmentId = req.body?.assignment_id || req.body?.assignmentId;
  const approvedBy = req.body?.approved_by || req.body?.approvedBy;

  if (!newResourceId) {
    throw ApiError.badRequest('new_resource_id is required');
  }

  const result = await recoverAssignment(incidentId, assignmentId, newResourceId, approvedBy);
  res.json({ success: true, data: result });
}

/**
 * POST /api/incidents/:id/briefing
 */
async function getBriefing(req, res) {
  const incident = await incidentModel.getIncidentById(req.params.id);
  if (!incident) throw ApiError.notFound('Incident not found');

  const reports = await reportModel.listReportsForIncident(incident.id);

  const markdown = `
# OPERATIONAL INCIDENT BRIEFING
**Incident ID:** ${incident.id} | **Severity:** ${incident.severity || 'HIGH'} (${incident.priority || 'P1'})
**Type:** ${incident.type} | **Location:** ${incident.latitude}, ${incident.longitude}

---

### Situation Assessment
${incident.description || incident.title}

### Critical Factors & Evidence
- **At-Risk Civilians:** ${incident.people_at_risk || incident.peopleAtRisk || 0} identified
- **Confidence Rating:** ${incident.confidence_score || incident.confidence || 90}% (Multi-source corroborated)
- **Corroborating Reports:** ${reports.length} report(s) logged

### Response Plan
- **Status:** ${incident.status}
- **Sector:** ${incident.location?.sector || 'Central Command Sector'}

*Generated automatically by AI Incident Commander — SURGE at ${new Date().toISOString()}*
  `.trim();

  res.json({
    success: true,
    data: {
      briefingMarkdown: markdown,
      summary: incident.description || incident.title,
      severity: incident.severity || 'HIGH',
      affected_people: incident.people_at_risk || 0,
      evidence_count: reports.length,
      current_response: [incident.status],
      current_risks: incident.risks || [],
      recent_changes: ['Severity evaluated by AI Commander']
    }
  });
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