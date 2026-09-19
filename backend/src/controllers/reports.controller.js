const reportModel = require('../models/report.model');
const incidentModel = require('../models/incident.model');
const { logActivity } = require('../models/activityLog.model');
const { emitEvent } = require('../config/socket');
const ApiError = require('../utils/ApiError');
const { createReportSchema } = require('../utils/validators');

/**
 * POST /api/reports
 *
 * Stage 3 behavior: normalizes and stores the raw report. If incident_id is
 * given, attaches it to that incident. Otherwise the report is stored
 * unattached (incident_id = null) - Stage 5 adds the AI classification step
 * that decides whether to create a new incident or attach to an existing one
 * via duplicate detection.
 */
async function create(req, res) {
  const data = createReportSchema.parse(req.body);

  if (data.incident_id) {
    const incident = await incidentModel.getIncidentById(data.incident_id);
    if (!incident) throw ApiError.badRequest('incident_id does not reference an existing incident');
  }

  const report = await reportModel.createReport(data);

  await logActivity({
    incidentId: report.incident_id,
    action: 'REPORT_RECEIVED',
    details: { source: report.source, reportId: report.id },
  });

  emitEvent('report:created', report);
  if (report.incident_id) {
    const incident = await incidentModel.getIncidentById(report.incident_id);
    emitEvent('incident:updated', incident);
  }

  res.status(201).json({ success: true, data: report });
}

async function listForIncident(req, res) {
  const incident = await incidentModel.getIncidentById(req.params.id);
  if (!incident) throw ApiError.notFound('Incident not found');
  const reports = await reportModel.listReportsForIncident(req.params.id);
  res.json({ success: true, data: reports });
}

module.exports = { create, listForIncident };
