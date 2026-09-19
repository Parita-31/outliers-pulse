const incidentModel = require('../models/incident.model');
const resourceModel = require('../models/resource.model');
const assignmentModel = require('../models/assignment.model');

const {
  logActivity,
} = require('../models/activityLog.model');

const {
  emitEvent,
} = require('../config/socket');

const ApiError = require('../utils/ApiError');


/**
 * Simulate failure of the resource currently assigned
 * to an incident.
 *
 * Flow:
 *
 * ASSIGNED resource
 *       ↓
 * UNAVAILABLE
 *
 * Active assignment
 *       ↓
 * FAILED
 *
 * Create critical RESOURCE_FAILURE alert
 * Find alternative resources
 * Calculate delay impact
 */
async function simulateResourceFailure(
  incidentId,
  resourceId
) {
  // --------------------------------------------------
  // 1. Get incident
  // --------------------------------------------------

  const incident =
    await incidentModel.getIncidentById(
      incidentId
    );

  if (!incident) {
    throw ApiError.notFound(
      'Incident not found'
    );
  }


  // --------------------------------------------------
  // 2. Get resource
  // --------------------------------------------------

  const resource =
    await resourceModel.getResourceById(
      resourceId
    );

  if (!resource) {
    throw ApiError.notFound(
      'Resource not found'
    );
  }


  // --------------------------------------------------
  // 3. Verify resource belongs to this incident
  // --------------------------------------------------

  if (
    resource.current_incident_id !== incidentId
  ) {
    throw ApiError.conflict(
      'Resource is not currently assigned to this incident'
    );
  }


  // --------------------------------------------------
  // 4. Find active assignment
  // --------------------------------------------------

  const assignment =
    await assignmentModel.getActiveAssignmentForResource(
      resourceId
    );

  if (!assignment) {
    throw ApiError.conflict(
      'No active assignment found for this resource'
    );
  }


  // --------------------------------------------------
  // 5. Mark resource UNAVAILABLE
  //
  // IMPORTANT:
  // updateResourceStatus() accepts ONLY the
  // status string.
  // --------------------------------------------------

  await resourceModel.updateResourceStatus(
    resourceId,
    'UNAVAILABLE'
  );


  // --------------------------------------------------
  // 6. Clear current incident / ETA
  // --------------------------------------------------

  const updatedResource =
    await resourceModel.updateResource(
      resourceId,
      {
        eta: null,
        current_incident_id: null,
      }
    );


  // --------------------------------------------------
  // 7. Mark assignment as FAILED
  // --------------------------------------------------

  const failedAssignment =
    await assignmentModel.updateAssignmentStatus(
      assignment.id,
      {
        status: 'FAILED',
      }
    );


  // --------------------------------------------------
  // 8. Create resource failure activity log
  // --------------------------------------------------

  await logActivity({
    incidentId,
    action: 'RESOURCE_FAILED',
    details: {
      assignmentId:
        assignment.id,

      resourceId:
        resource.id,

      resourceName:
        resource.name,

      previousStatus:
        'ASSIGNED',

      newStatus:
        'UNAVAILABLE',
    },
  });


  // --------------------------------------------------
  // 9. Create CRITICAL alert
  //
  // NOTE:
  // This assumes your project already has an alert
  // creation service/model.
  // --------------------------------------------------

  let alert = null;

  try {
    const alertModel =
      require('../models/alert.model');

    if (
      typeof alertModel.createAlert === 'function'
    ) {
      alert =
        await alertModel.createAlert({
          incident_id: incidentId,
          type: 'RESOURCE_FAILURE',
          severity: 'CRITICAL',
          title: 'Critical resource failure',
          message:
            `Resource ${resource.name} failed while assigned to the incident.`,
        });
    }
  } catch (error) {
    // If alert model is not present, don't hide
    // the primary resource-failure operation.
    console.error(
      'Alert creation failed:',
      error.message
    );
  }


  // --------------------------------------------------
  // 10. Find alternative AVAILABLE resources
  // --------------------------------------------------

  const resourceResult =
    await resourceModel.listResources({
      status: 'AVAILABLE',
      page: 1,
      limit: 1000,
    });

  const alternatives =
    resourceResult.items.filter(
      (candidate) =>
        candidate.id !== resourceId
    );


  // --------------------------------------------------
  // 11. Calculate delay impact
  //
  // Use the failed resource ETA as the baseline.
  // If unavailable, use assignment ETA.
  // --------------------------------------------------

  const originalEta =
    assignment.eta ??
    resource.eta ??
    0;

  let replacementEta = null;

  if (alternatives.length > 0) {
    const etaValues = alternatives
      .map((candidate) => candidate.eta)
      .filter(
        (eta) =>
          typeof eta === 'number' &&
          Number.isFinite(eta)
      );

    if (etaValues.length > 0) {
      replacementEta =
        Math.min(...etaValues);
    }
  }

  const delayImpactMinutes =
    replacementEta !== null
      ? Math.max(
          0,
          replacementEta - originalEta
        )
      : null;


  // --------------------------------------------------
  // 12. Socket events
  // --------------------------------------------------

  emitEvent(
    'resource:failed',
    {
      resource:
        updatedResource,

      assignment:
        failedAssignment,

      incidentId,
    }
  );

  if (alert) {
    emitEvent(
      'alert:created',
      alert
    );
  }


  // --------------------------------------------------
  // 13. Re-score incident
  // --------------------------------------------------

  try {
    const {
      runIncidentScoring,
    } = require('./incidentPipeline.service');

    await runIncidentScoring(
      incidentId
    );
  } catch (error) {
    console.error(
      'Incident rescoring failed:',
      error.message
    );
  }


  // --------------------------------------------------
  // 14. Return failure information
  // --------------------------------------------------

  return {
    incident,
    resource: updatedResource,
    assignment: failedAssignment,

    alert,

    alternatives,

    delay_impact_minutes:
      delayImpactMinutes,
  };
}


module.exports = {
  simulateResourceFailure,
};