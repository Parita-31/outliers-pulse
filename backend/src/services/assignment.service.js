const incidentModel = require('../models/incident.model');
const resourceModel = require('../models/resource.model');
const assignmentModel = require('../models/assignment.model');
const { getLatestAnalysis, getNeededResourceTypes, runIncidentScoring } = require('./incidentPipeline.service');
const { scoreResource } = require('./resourceRecommendation.service');
const { logActivity } = require('../models/activityLog.model');
const { emitEvent } = require('../config/socket');
const { notify } = require('./notification.service');
const ApiError = require('../utils/ApiError');

/**
 * Proposes a resource for an incident. Does NOT move the resource - it only
 * creates a PENDING_APPROVAL assignment that a commander must approve. This
 * is the "AI must not directly dispatch" boundary from the spec.
 *
 * @param {string} incidentId
 * @param {string} resourceId
 */
async function createAssignment(incidentId, resourceId) {
  const [incident, resource] = await Promise.all([
    incidentModel.getIncidentById(incidentId),
    resourceModel.getResourceById(resourceId),
  ]);
  if (!incident) throw ApiError.notFound('Incident not found');
  if (!resource) throw ApiError.notFound('Resource not found');
  if (resource.status !== 'AVAILABLE') {
    throw ApiError.conflict(`Resource is not available (current status: ${resource.status})`);
  }

  const latestAnalysis = await getLatestAnalysis(incidentId);
  const neededResourceTypes = await getNeededResourceTypes(incident, latestAnalysis);
  const { score, eta, reasons } = scoreResource({ incident, resource, neededResourceTypes });

  const assignment = await assignmentModel.createAssignment({
    incident_id: incidentId,
    resource_id: resourceId,
    recommended_score: score,
    recommended_reasons: reasons,
    eta,
  });

  await logActivity({
    incidentId,
    action: 'RESOURCE_RECOMMENDED',
    details: { assignmentId: assignment.id, resourceId, score, eta, reasons },
  });

  return assignment;
}

/**
 * Commander approval: this is the only path that actually moves a resource.
 * Transitions the assignment to APPROVED, the resource to ASSIGNED, and (if
 * the incident hasn't progressed further already) the incident to ASSIGNED.
 *
 * @param {string} assignmentId
 * @param {string} [approvedBy]
 */
async function approveAssignment(assignmentId, approvedBy) {
  const assignment = await assignmentModel.getAssignmentById(assignmentId);
  if (!assignment) throw ApiError.notFound('Assignment not found');
  if (assignment.status !== 'PENDING_APPROVAL') {
    throw ApiError.conflict(`Assignment is not pending approval (current status: ${assignment.status})`);
  }

  const resource = await resourceModel.getResourceById(assignment.resource_id);
  if (!resource) throw ApiError.notFound('Assigned resource no longer exists');
  if (resource.status !== 'AVAILABLE') {
    throw ApiError.conflict(`Resource is no longer available (current status: ${resource.status})`);
  }

  const updatedAssignment = await assignmentModel.updateAssignmentStatus(assignmentId, {
    status: 'APPROVED',
    approved_by: approvedBy ?? null,
    setApprovedAt: true,
  });

  const updatedResource = await resourceModel.updateResourceStatus(assignment.resource_id, {
    status: 'ASSIGNED',
    eta: assignment.eta,
    current_incident_id: assignment.incident_id,
  });

  const incident = await incidentModel.getIncidentById(assignment.incident_id);
  if (incident && ['REPORTED', 'VERIFIED'].includes(incident.status)) {
    await incidentModel.updateIncident(assignment.incident_id, { status: 'ASSIGNED' });
  }

  await logActivity({
    incidentId: assignment.incident_id,
    action: 'RESOURCE_ASSIGNED',
    details: {
      assignmentId: updatedAssignment.id,
      resourceId: updatedResource.id,
      resourceName: updatedResource.name,
      approvedBy: approvedBy ?? null,
    },
  });

  emitEvent('resource:assigned', updatedAssignment);
  emitEvent('resource:updated', updatedResource);
  await notify({
    title: 'Resource Assigned',
    message: `${updatedResource.name} dispatched to "${incident ? incident.title : assignment.incident_id}"`,
    type: 'resource_assigned',
    relatedIncidentId: assignment.incident_id,
  });

  // Resource availability and incident status both just changed, which feed
  // into the priority engine's scarcity and time factors - rescore.
  await runIncidentScoring(assignment.incident_id);

  return updatedAssignment;
}

module.exports = { createAssignment, approveAssignment };
