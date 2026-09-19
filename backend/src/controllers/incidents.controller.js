const incidentModel = require('../models/incident.model');
const { logActivity } = require('../models/activityLog.model');
const { emitEvent } = require('../config/socket');
const ApiError = require('../utils/ApiError');
const { createIncidentSchema, updateIncidentSchema, listIncidentsQuerySchema } = require('../utils/validators');

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

module.exports = { create, list, getOne, update };
