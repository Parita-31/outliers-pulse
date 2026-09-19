const resourceModel = require('../models/resource.model');
const { logActivity } = require('../models/activityLog.model');
const { emitEvent } = require('../config/socket');
const ApiError = require('../utils/ApiError');
const { createResourceSchema, updateResourceStatusSchema } = require('../utils/validators');

async function create(req, res) {
  const data = createResourceSchema.parse(req.body);
  const resource = await resourceModel.createResource(data);
  emitEvent('resource:updated', resource);
  res.status(201).json({ success: true, data: resource });
}

async function list(req, res) {
  const { status, type } = req.query;
  const resources = await resourceModel.listResources({ status, type });
  res.json({ success: true, data: resources });
}

async function getOne(req, res) {
  const resource = await resourceModel.getResourceById(req.params.id);
  if (!resource) throw ApiError.notFound('Resource not found');
  res.json({ success: true, data: resource });
}

async function updateStatus(req, res) {
  const data = updateResourceStatusSchema.parse(req.body);

  const existing = await resourceModel.getResourceById(req.params.id);

  if (!existing) {
    throw ApiError.notFound('Resource not found');
  }

  const updated = await resourceModel.updateResourceStatus(
    req.params.id,
    data.status
  );

  // Only log a semantic RESOURCE_ASSIGNED event when the resource is actually
  // being tied to an incident here (e.g. a manual status override).
  if (data.status === 'ASSIGNED' && existing.status !== 'ASSIGNED') {
    await logActivity({
      incidentId: updated.current_incident_id,
      action: 'RESOURCE_ASSIGNED',
      details: {
        resourceId: updated.id,
        resourceName: updated.name,
        fromStatus: existing.status,
      },
    });
  }

  emitEvent('resource:updated', updated);

  res.json({
    success: true,
    data: updated,
  });
}

module.exports = { create, list, getOne, updateStatus };
