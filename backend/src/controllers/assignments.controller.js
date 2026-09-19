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
  const { approved_by } = approveAssignmentSchema.parse(req.body ?? {});
  const assignment = await assignmentService.approveAssignment(req.params.id, approved_by);
  res.json({ success: true, data: assignment });
}

async function getOne(req, res) {
  const assignment = await assignmentModel.getAssignmentById(req.params.id);
  if (!assignment) throw ApiError.notFound('Assignment not found');
  res.json({ success: true, data: assignment });
}

module.exports = { create, approve, getOne };
