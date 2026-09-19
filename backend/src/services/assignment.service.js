const incidentModel = require('../models/incident.model');
const resourceModel = require('../models/resource.model');
const assignmentModel = require('../models/assignment.model');

const {
  getLatestAnalysis,
  getNeededResourceTypes,
  runIncidentScoring,
} = require('./incidentPipeline.service');

const {
  scoreResource,
} = require('./resourceRecommendation.service');

const {
  logActivity,
} = require('../models/activityLog.model');

const {
  emitEvent,
} = require('../config/socket');

const ApiError = require('../utils/ApiError');


/**
 * Proposes a resource for an incident.
 *
 * IMPORTANT:
 * This function NEVER changes the resource status.
 *
 * It only creates a PENDING_APPROVAL assignment.
 */
async function createAssignment(incidentId, resourceId) {
  const [incident, resource] = await Promise.all([
    incidentModel.getIncidentById(incidentId),
    resourceModel.getResourceById(resourceId),
  ]);

  if (!incident) {
    throw ApiError.notFound('Incident not found');
  }

  if (!resource) {
    throw ApiError.notFound('Resource not found');
  }

  // Resource must be available when proposal is created.
  if (resource.status !== 'AVAILABLE') {
    throw ApiError.conflict(
      `Resource is not available (current status: ${resource.status})`
    );
  }

  const latestAnalysis =
    await getLatestAnalysis(incidentId);

  const neededResourceTypes =
    await getNeededResourceTypes(
      incident,
      latestAnalysis
    );

  const {
    score,
    eta,
    reasons,
  } = scoreResource({
    incident,
    resource,
    neededResourceTypes,
  });

  const assignment =
    await assignmentModel.createAssignment({
      incident_id: incidentId,
      resource_id: resourceId,
      recommended_score: score,
      recommended_reasons: reasons,
      eta,
      // assignment.model defaults this to PENDING_APPROVAL
    });

  await logActivity({
    incidentId,
    action: 'RESOURCE_RECOMMENDED',
    details: {
      assignmentId: assignment.id,
      resourceId,
      score,
      eta,
      reasons,
    },
  });

  emitEvent(
    'resource:recommended',
    assignment
  );

  return assignment;
}


/**
 * Commander approval.
 *
 * This is the ONLY path that actually dispatches
 * a resource.
 *
 * Flow:
 *
 * PENDING_APPROVAL
 *        ↓
 *     APPROVED
 *
 * Resource:
 *
 * AVAILABLE
 *        ↓
 *     ASSIGNED
 *
 * Incident:
 *
 * REPORTED / VERIFIED
 *        ↓
 *     ASSIGNED
 */
async function approveAssignment(
  assignmentId,
  approvedBy
) {
  // --------------------------------------------------
  // 1. Get assignment
  // --------------------------------------------------

  const assignment =
    await assignmentModel.getAssignmentById(
      assignmentId
    );

  if (!assignment) {
    throw ApiError.notFound(
      'Assignment not found'
    );
  }


  // --------------------------------------------------
  // 2. Assignment must still be pending
  // --------------------------------------------------

  if (
    assignment.status !== 'PENDING_APPROVAL'
  ) {
    throw ApiError.conflict(
      `Assignment is not pending approval (current status: ${assignment.status})`
    );
  }


  // --------------------------------------------------
  // 3. Get resource
  // --------------------------------------------------

  const resource =
    await resourceModel.getResourceById(
      assignment.resource_id
    );

  if (!resource) {
    throw ApiError.notFound(
      'Assigned resource no longer exists'
    );
  }


  // --------------------------------------------------
  // 4. Resource must STILL be available
  // --------------------------------------------------

  if (resource.status !== 'AVAILABLE') {
    throw ApiError.conflict(
      `Resource is no longer available (current status: ${resource.status})`
    );
  }


  // --------------------------------------------------
  // 5. Approve assignment
  // --------------------------------------------------

  const updatedAssignment =
    await assignmentModel.updateAssignmentStatus(
      assignmentId,
      {
        status: 'APPROVED',
        approved_by: approvedBy ?? null,
        setApprovedAt: true,
      }
    );


  // --------------------------------------------------
  // 6. Change resource status
  //
  // IMPORTANT:
  // updateResourceStatus() accepts ONLY:
  //
  // updateResourceStatus(id, 'ASSIGNED')
  //
  // Do NOT pass eta/current_incident_id here.
  // --------------------------------------------------

  await resourceModel.updateResourceStatus(
    assignment.resource_id,
    'ASSIGNED'
  );


  // --------------------------------------------------
  // 7. Update resource assignment information
  //
  // eta and current_incident_id are separate columns.
  // --------------------------------------------------

  const updatedResource =
    await resourceModel.updateResource(
      assignment.resource_id,
      {
        eta: assignment.eta,
        current_incident_id:
          assignment.incident_id,
      }
    );


  // --------------------------------------------------
  // 8. Update incident status
  // --------------------------------------------------

  const incident =
    await incidentModel.getIncidentById(
      assignment.incident_id
    );

  let updatedIncident = incident;

  if (
    incident &&
    ['REPORTED', 'VERIFIED'].includes(
      incident.status
    )
  ) {
    updatedIncident =
      await incidentModel.updateIncident(
        assignment.incident_id,
        {
          status: 'ASSIGNED',
        }
      );
  }


  // --------------------------------------------------
  // 9. Activity log
  // --------------------------------------------------

  await logActivity({
    incidentId: assignment.incident_id,
    action: 'RESOURCE_ASSIGNED',
    details: {
      assignmentId:
        updatedAssignment.id,

      resourceId:
        updatedResource.id,

      resourceName:
        updatedResource.name,

      approvedBy:
        approvedBy ?? null,

      eta:
        assignment.eta,
    },
  });


  // --------------------------------------------------
  // 10. Socket events
  // --------------------------------------------------

  emitEvent(
    'resource:assigned',
    updatedAssignment
  );

  emitEvent(
    'resource:updated',
    updatedResource
  );

  if (updatedIncident) {
    emitEvent(
      'incident:updated',
      updatedIncident
    );
  }


  // --------------------------------------------------
  // 11. Re-score incident priority
  // --------------------------------------------------

  await runIncidentScoring(
    assignment.incident_id
  );


  // --------------------------------------------------
  // 12. Return approved assignment
  // --------------------------------------------------

  return updatedAssignment;
}


module.exports = {
  createAssignment,
  approveAssignment,
};