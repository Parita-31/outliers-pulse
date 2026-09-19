const { withTransaction } = require('../config/db');
const incidentModel = require('../models/incident.model');
const { logActivity } = require('../models/activityLog.model');
const { emitEvent } = require('../config/socket');
const { runIncidentScoring } = require('./incidentPipeline.service');
const ApiError = require('../utils/ApiError');

/**
 * Merges sourceIncidentId into targetIncidentId:
 *  - moves all of the source's reports onto the target (reports are preserved, not deleted)
 *  - marks the source incident as status=MERGED, merged_into_incident_id=target
 *  - bumps the target's people_at_risk to the max of the two
 *  - reruns severity/priority scoring on the target (it now has more corroborating reports)
 *  - logs INCIDENT_MERGED and emits incident:merged
 *
 * @param {string} sourceIncidentId
 * @param {string} targetIncidentId
 * @returns {Promise<{ merged_incident: object, target_incident: object, reports_moved: number }>}
 */
async function mergeIncidents(sourceIncidentId, targetIncidentId) {
  if (sourceIncidentId === targetIncidentId) {
    throw ApiError.badRequest('Cannot merge an incident into itself');
  }

  const [source, target] = await Promise.all([
    incidentModel.getIncidentById(sourceIncidentId),
    incidentModel.getIncidentById(targetIncidentId),
  ]);
  if (!source) throw ApiError.notFound('Source incident not found');
  if (!target) throw ApiError.notFound('Target incident not found');
  if (source.status === 'MERGED') {
    throw ApiError.conflict('Source incident has already been merged', { mergedInto: source.merged_into_incident_id });
  }
  if (target.status === 'MERGED') {
    throw ApiError.conflict('Target incident is itself a merged (non-canonical) incident', { mergedInto: target.merged_into_incident_id });
  }

  const { reportsMoved, mergedSource } = await withTransaction(async (client) => {
    const moveRes = await client.query(
      `UPDATE reports SET incident_id = $1 WHERE incident_id = $2 RETURNING id`,
      [targetIncidentId, sourceIncidentId]
    );
    const sourceRes = await client.query(
      `UPDATE incidents
       SET status = 'MERGED', merged_into_incident_id = $1
       WHERE id = $2
       RETURNING *`,
      [targetIncidentId, sourceIncidentId]
    );
    return { reportsMoved: moveRes.rowCount, mergedSource: sourceRes.rows[0] };
  });

  await incidentModel.updateIncident(targetIncidentId, {
    people_at_risk: Math.max(target.people_at_risk || 0, source.people_at_risk || 0),
  });

  await logActivity({
    incidentId: sourceIncidentId,
    action: 'INCIDENT_MERGED',
    details: { mergedInto: targetIncidentId, reportsMoved },
  });
  await logActivity({
    incidentId: targetIncidentId,
    action: 'INCIDENT_MERGED',
    details: { mergedFrom: sourceIncidentId, reportsMoved },
  });

  const finalTarget = await runIncidentScoring(targetIncidentId);

  emitEvent('incident:merged', { merged_incident: mergedSource, target_incident: finalTarget });
  emitEvent('incident:updated', mergedSource);

  return { merged_incident: mergedSource, target_incident: finalTarget, reports_moved: reportsMoved };
}

module.exports = { mergeIncidents };
