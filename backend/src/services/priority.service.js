const SPREAD_PRONE_TYPES = new Set(['fire', 'flood', 'chemical_hazard', 'landslide', 'industrial_accident']);
const URGENCY_POINTS = { critical: 15, high: 10, medium: 5, low: 2 };

// Incident is still awaiting a resource response in these statuses - the
// "time" factor only matters while nothing has been dispatched yet.
const AWAITING_RESPONSE_STATUSES = new Set(['REPORTED', 'VERIFIED']);

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function priorityForScore(score) {
  if (score >= 75) return 'P1';
  if (score >= 50) return 'P2';
  if (score >= 25) return 'P3';
  return 'P4';
}

function minutesSince(date) {
  return (Date.now() - new Date(date).getTime()) / 60000;
}

/**
 * @param {object} params
 * @param {object} params.incident - incident row (severity_score, people_at_risk, type, status, created_at)
 * @param {object|null} params.latestAnalysis - most recent ai_analyses row
 * @param {number} params.availableResourceCount - count of AVAILABLE resources matching the incident's needed types
 * @param {string[]} params.neededResourceTypes - resource types this incident needs (for the reason text)
 * @returns {{ score: number, priority: string, reasons: string[] }}
 */
function computePriority({ incident, latestAnalysis, availableResourceCount = 0, neededResourceTypes = [] }) {
  const parsed = latestAnalysis && latestAnalysis.parsed_output ? latestAnalysis.parsed_output : null;
  const urgency = parsed && URGENCY_POINTS[parsed.urgency] !== undefined ? parsed.urgency : null;

  const reasons = [];
  let score = 0;

  // 1. Severity (max 40) - the priority engine builds directly on top of the severity engine
  const severityScore = incident.severity_score || 0;
  const severityPoints = clamp(Math.round(severityScore * 0.4), 0, 40);
  score += severityPoints;
  if (incident.severity === 'CRITICAL' || incident.severity === 'HIGH') {
    reasons.push(`${incident.severity} severity`);
  }

  // 2. People at risk (max 15)
  const peopleAtRisk = incident.people_at_risk || 0;
  const peoplePoints = clamp(Math.round(peopleAtRisk * 0.3), 0, 15);
  score += peoplePoints;
  if (peopleAtRisk > 0) reasons.push(`${peopleAtRisk} people at risk`);

  // 3. AI-assessed urgency (max 15)
  const urgencyPoints = urgency ? URGENCY_POINTS[urgency] : 0;
  score += urgencyPoints;
  if (urgency === 'critical' || urgency === 'high') reasons.push(`Urgency assessed as ${urgency}`);

  // 4. Spread potential (max 10)
  const spreadPoints = SPREAD_PRONE_TYPES.has(incident.type) ? 10 : 0;
  score += spreadPoints;
  if (spreadPoints > 0) reasons.push('High spread potential');

  // 5. Resource availability (max 10) - scarcity raises priority
  let availabilityPoints = 0;
  if (neededResourceTypes.length > 0) {
    if (availableResourceCount === 0) {
      availabilityPoints = 10;
      reasons.push('No matching resources currently available');
    } else if (availableResourceCount <= 2) {
      availabilityPoints = 5;
      reasons.push('Limited matching resources available');
    }
  }
  score += availabilityPoints;

  // 6. Time since report, while still awaiting response (max 10)
  let timePoints = 0;
  if (AWAITING_RESPONSE_STATUSES.has(incident.status)) {
    const elapsedMinutes = minutesSince(incident.created_at);
    if (elapsedMinutes >= 60) timePoints = 10;
    else if (elapsedMinutes >= 30) timePoints = 6;
    else if (elapsedMinutes >= 10) timePoints = 3;
    if (timePoints > 0) reasons.push(`Unresolved for ${Math.round(elapsedMinutes)} minutes`);
  }
  score += timePoints;

  score = clamp(Math.round(score), 0, 100);
  const priority = priorityForScore(score);

  if (reasons.length === 0) reasons.push('No aggravating factors identified');

  return { score, priority, reasons };
}

module.exports = { computePriority, priorityForScore };