const incidentModel = require('../models/incident.model');
const resourceModel = require('../models/resource.model');
const assignmentModel = require('../models/assignment.model');
const alertModel = require('../models/alert.model');
const { getLatestAnalysis, getNeededResourceTypes, runIncidentScoring } = require('./incidentPipeline.service');
const { rankResources, scoreResource } = require('./resourceRecommendation.service');
const { logActivity } = require('../models/activityLog.model');
const { emitEvent } = require('../config/socket');
const { notify, notifyFromAlert } = require('./notification.service');
const ApiError = require('../utils/ApiError');

/**
 * Simulates a resource assigned to this incident failing mid-response:
 *  1. marks the resource UNAVAILABLE
 *  2. finds the compromised assignment and marks it FAILED
 *  3. raises a CRITICAL alert
 *  4. finds and scores alternative resources
 *  5. estimates the delay impact vs. the original ETA
 * Does NOT reassign anything automatically - returns alternatives for a
 * commander to approve via recoverAssignment().
 *
 * @param {string} incidentId
 * @param {string} resourceId
 */
async function simulateResourceFailure(incidentId, resourceId) {
  const incident = await incidentModel.getIncidentById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');

  const resource = await resourceModel.getResourceById(resourceId);
  if (!resource) throw ApiError.notFound('Resource not found');

  const compromisedAssignment = await assignmentModel.getActiveAssignmentForResource(resourceId);
  if (!compromisedAssignment || compromisedAssignment.incident_id !== incidentId) {
    throw ApiError.conflict('This resource does not have an active assignment on this incident');
  }

  // 1. Mark resource unavailable
  const failedResource = await resourceModel.updateResourceStatus(resourceId, {
    status: 'UNAVAILABLE',
    eta: null,
    current_incident_id: null,
  });

  // 2. Mark the compromised assignment FAILED
  const failedAssignment = await assignmentModel.updateAssignmentStatus(compromisedAssignment.id, {
    status: 'FAILED',
  });

  // 3. Raise a critical alert
  const alert = await alertModel.createAlert({
    incidentId,
    type: 'RESOURCE_FAILURE',
    severity: 'CRITICAL',
    message: `${resource.name} (${resource.type}) failed en route to "${incident.title}" - reassignment needed`,
    metadata: { resourceId, assignmentId: compromisedAssignment.id },
  });

  // 4. Find and score alternatives (resource pool now excludes the failed one, since its status changed)
  const latestAnalysis = await getLatestAnalysis(incidentId);
  const neededResourceTypes = await getNeededResourceTypes(incident, latestAnalysis);
  const resourceResult = await resourceModel.listResources({ status: 'AVAILABLE', page: 1, limit: 1000 });
  const availableResources = resourceResult.items;
  const alternatives = rankResources(incident, availableResources, neededResourceTypes, 5);

  // 5. Delay impact vs. the original ETA
  const originalEta = compromisedAssignment.eta;
  const bestAlternativeEta = alternatives.length > 0 ? alternatives[0].eta : null;
  const delayImpactMinutes = (originalEta != null && bestAlternativeEta != null)
    ? bestAlternativeEta - originalEta
    : null;

  await logActivity({
    incidentId,
    action: 'RESOURCE_FAILED',
    details: {
      resourceId, resourceName: resource.name,
      compromisedAssignmentId: compromisedAssignment.id,
      alternativesFound: alternatives.length,
      delayImpactMinutes,
    },
  });
  await logActivity({
    incidentId,
    action: 'ALERT_CREATED',
    details: { alertId: alert.id, type: alert.type, severity: alert.severity },
  });

  emitEvent('resource:failed', { failed_resource: failedResource, compromised_assignment: failedAssignment });
  emitEvent('alert:created', alert);
  await notifyFromAlert(alert);

  // Resource availability just dropped - rescore severity/priority.
  await runIncidentScoring(incidentId);

  return {
    failed_resource: failedResource,
    compromised_assignment: failedAssignment,
    alert,
    alternatives,
    delay_impact_minutes: delayImpactMinutes,
  };
}

/**
 * Commander-approved recovery: replaces a FAILED assignment with a new
 * resource. This call itself IS the human approval step (the commander
 * chose new_resource_id from the alternatives returned above), so the new
 * assignment is created already APPROVED rather than going through another
 * PENDING_APPROVAL round-trip.
 *
 * @param {string} incidentId
 * @param {string} failedAssignmentId
 * @param {string} newResourceId
 * @param {string} [approvedBy]
 */
async function recoverAssignment(incidentId, failedAssignmentId, newResourceId, approvedBy) {
  const incident = await incidentModel.getIncidentById(incidentId);
  if (!incident) throw ApiError.notFound('Incident not found');

  const failedAssignment = await assignmentModel.getAssignmentById(failedAssignmentId);
  if (!failedAssignment || failedAssignment.incident_id !== incidentId) {
    throw ApiError.notFound('Assignment not found on this incident');
  }
  if (failedAssignment.status !== 'FAILED') {
    throw ApiError.conflict(`Assignment is not in a FAILED state (current status: ${failedAssignment.status})`);
  }

  const newResource = await resourceModel.getResourceById(newResourceId);
  if (!newResource) throw ApiError.notFound('Replacement resource not found');
  if (newResource.status !== 'AVAILABLE') {
    throw ApiError.conflict(`Replacement resource is not available (current status: ${newResource.status})`);
  }

  const latestAnalysis = await getLatestAnalysis(incidentId);
  const neededResourceTypes = await getNeededResourceTypes(incident, latestAnalysis);
  const { score, eta, reasons } = scoreResource({ incident, resource: newResource, neededResourceTypes });

  const newAssignment = await assignmentModel.createAssignment({
    incident_id: incidentId,
    resource_id: newResourceId,
    recommended_score: score,
    recommended_reasons: reasons,
    eta,
    replaced_assignment_id: failedAssignmentId,
    status: 'APPROVED',
  });
  const approvedAssignment = await assignmentModel.updateAssignmentStatus(newAssignment.id, {
    status: 'APPROVED',
    approved_by: approvedBy ?? null,
    setApprovedAt: true,
  });

  const updatedResource = await resourceModel.updateResourceStatus(newResourceId, {
    status: 'ASSIGNED',
    eta,
    current_incident_id: incidentId,
  });

  await assignmentModel.updateAssignmentStatus(failedAssignmentId, { status: 'REASSIGNED' });

  if (['REPORTED', 'VERIFIED'].includes(incident.status)) {
    await incidentModel.updateIncident(incidentId, { status: 'ASSIGNED' });
  }

  await logActivity({
    incidentId,
    action: 'RESOURCE_REASSIGNED',
    details: {
      originalAssignmentId: failedAssignmentId,
      newAssignmentId: approvedAssignment.id,
      newResourceId, newResourceName: updatedResource.name,
      eta,
    },
  });

  emitEvent('resource:reassigned', { assignment: approvedAssignment, resource: updatedResource });
  await notify({
    title: 'Resource Reassigned',
    message: `${updatedResource.name} reassigned to "${incident.title}" after the original resource failed`,
    type: 'resource_reassigned',
    relatedIncidentId: incidentId,
  });
  const finalIncident = await runIncidentScoring(incidentId);
  emitEvent('incident:updated', finalIncident);

  return { assignment: approvedAssignment, resource: updatedResource };
}

module.exports = { simulateResourceFailure, recoverAssignment };
