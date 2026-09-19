const incidentModel = require('../models/incident.model');
const resourceModel = require('../models/resource.model');
const { getLatestAnalysis, getNeededResourceTypes } = require('../services/incidentPipeline.service');
const { rankResources } = require('../services/resourceRecommendation.service');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/incidents/:id/recommendations
 * Ranks available resources by fit for this incident (capability, distance,
 * availability, workload, ETA, incident priority urgency).
 */
async function getForIncident(req, res) {
  const incident = await incidentModel.getIncidentById(req.params.id);
  if (!incident) throw ApiError.notFound('Incident not found');

  const latestAnalysis = await getLatestAnalysis(incident.id);
  const neededResourceTypes = await getNeededResourceTypes(incident, latestAnalysis);

  const resourceResult = await resourceModel.listResources({
  status: 'AVAILABLE',
  page: 1,
  limit: 1000,
});

const resources = resourceResult.items;

const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;

const ranked = rankResources(
  incident,
  resources,
  neededResourceTypes,
  limit
);

  res.json({ success: true, data: ranked });
}

module.exports = { getForIncident };
