const assignmentService = require('../services/assignment.service');
const assignmentModel = require('../models/assignment.model');
const ApiError = require('../utils/ApiError');
const { createAssignmentSchema, approveAssignmentSchema } = require('../utils/validators');

async function create(req, res) {
  const { incident_id, resource_id } = createAssignmentSchema.parse(req.body);
  const assignment = await assignmentService.createAssignment(incident_id, resource_id);
  res.status(201).json({ success: true, data: assignment });
}

async function approve(req, res) {
  let targetId = req.params.id;
  const { approved_by, incidentId, resourceId, incident_id, resource_id } = req.body ?? {};

  const incId = incidentId || incident_id;
  const resId = resourceId || resource_id;

  let assignment = await assignmentModel.getAssignmentById(targetId).catch(() => null);

  if (!assignment && incId && resId) {
    assignment = await assignmentService.createAssignment(incId, resId);
    targetId = assignment.id;
  } else if (!assignment) {
    const { query } = require('../config/db');
    const existing = await query(
      `SELECT * FROM assignments WHERE (incident_id = $1 OR resource_id = $2) AND status = 'PENDING_APPROVAL' ORDER BY created_at DESC LIMIT 1`,
      [incId || null, resId || null]
    );
    if (existing.rows.length > 0) {
      targetId = existing.rows[0].id;
    } else if (incId && resId) {
      assignment = await assignmentService.createAssignment(incId, resId);
      targetId = assignment.id;
    } else {
      throw ApiError.notFound('Assignment not found');
    }
  }

  const approvedAssignment = await assignmentService.approveAssignment(targetId, approved_by);
  res.json({
    success: true,
    data: {
      ...approvedAssignment,
      assignmentId: approvedAssignment.id,
      status: approvedAssignment.status,
      dispatchStatus: 'DISPATCHED',
      timestamp: new Date().toISOString(),
    },
  });
}

async function getOne(req, res) {
  const assignment = await assignmentModel.getAssignmentById(req.params.id);
  if (!assignment) throw ApiError.notFound('Assignment not found');
  res.json({ success: true, data: assignment });
}

module.exports = { create, approve, getOne };
