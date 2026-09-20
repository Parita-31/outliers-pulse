const env = require('../config/env');
const { haversineMeters } = require('./duplicateDetection.service');

const PRIORITY_URGENCY_POINTS = { P1: 5, P2: 3, P3: 1, P4: 0 };

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * ETA in minutes for a given distance, assuming AVERAGE_RESPONSE_SPEED_KMH.
 */
function estimateEtaMinutes(distanceMeters) {
  const km = distanceMeters / 1000;
  const hours = km / env.AVERAGE_RESPONSE_SPEED_KMH;
  return Math.max(1, Math.round(hours * 60));
}

/**
 * Scores a single resource's fit for a single incident.
 *
 * @param {object} params
 * @param {object} params.incident - incident row (latitude, longitude, priority)
 * @param {object} params.resource - resource row (type, latitude, longitude, status, workload)
 * @param {string[]} params.neededResourceTypes
 * @returns {{ score: number, eta: number, reasons: string[], distanceMeters: number }}
 */
function scoreResource({ incident, resource, neededResourceTypes = [] }) {
  const reasons = [];
  let score = 0;

  // 1. Capability match (max 30)
  const capable = neededResourceTypes.length === 0 || neededResourceTypes.includes(resource.type);
  if (capable) {
    score += 30;
    reasons.push('Capability match');
  }

  // 2. Distance (max 30) - linear decay to 0 at RESOURCE_SEARCH_RADIUS_METERS
  const distanceMeters = haversineMeters(incident.latitude, incident.longitude, resource.latitude, resource.longitude);
  const maxRadius = env.RESOURCE_SEARCH_RADIUS_METERS;
  const distancePoints = distanceMeters <= maxRadius
    ? Math.round(30 * (1 - distanceMeters / maxRadius))
    : 0;
  score += distancePoints;
  reasons.push(`${(distanceMeters / 1000).toFixed(1)} km away`);

  // 3. Availability (max 15)
  const isAvailable = resource.status === 'AVAILABLE';
  if (isAvailable) {
    score += 15;
    reasons.push('Available');
  } else {
    reasons.push(`Currently ${resource.status.toLowerCase().replace('_', ' ')}`);
  }

  // 4. Workload (max 10) - lower is better
  const workload = typeof resource.workload === 'number' ? resource.workload : (parseInt(resource.workload, 10) || 0);
  const workloadPoints = clamp(Math.round(10 * (1 - workload / 100)), 0, 10);
  score += workloadPoints;
  if (workload <= 30) reasons.push('Low workload');
  else if (workload <= 70) reasons.push('Moderate workload');
  else reasons.push('High workload');

  // 5. ETA (max 10) - faster is better, decays to 0 at a 60-minute horizon
  const eta = estimateEtaMinutes(distanceMeters);
  const etaHorizonMinutes = 60;
  const etaPoints = clamp(Math.round(10 * (1 - eta / etaHorizonMinutes)), 0, 10);
  score += etaPoints;
  reasons.push(`ETA ${eta} minutes`);

  // 6. Incident priority urgency (max 5) - same for every candidate on this
  // incident, but kept as an explicit explainability factor per spec.
  const priorityPoints = PRIORITY_URGENCY_POINTS[incident.priority] ?? 0;
  score += priorityPoints;
  if (incident.priority === 'P1' || incident.priority === 'P2') {
    reasons.push(`High incident priority (${incident.priority})`);
  }

  return { score: clamp(Math.round(score), 0, 100), eta, reasons, distanceMeters };
}

/**
 * Scores and ranks every candidate resource for an incident, best first.
 *
 * @param {object} incident
 * @param {object[]} resources
 * @param {string[]} neededResourceTypes
 * @param {number} [limit=5]
 * @returns {Array<{ resource: object, score: number, eta: number, reasons: string[] }>}
 */
function rankResources(incident, resources, neededResourceTypes, limit = 5) {
  return resources
    .map((resource) => {
      const { score, eta, reasons } = scoreResource({ incident, resource, neededResourceTypes });
      return { resource, score, eta, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = { scoreResource, rankResources, estimateEtaMinutes };
