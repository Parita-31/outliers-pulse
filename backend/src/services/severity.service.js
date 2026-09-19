const SEVERITY_THRESHOLDS = [
  { max: 25, level: 'LOW' },
  { max: 50, level: 'MODERATE' },
  { max: 75, level: 'HIGH' },
  { max: 100, level: 'CRITICAL' },
];

// Base hazard weight per incident type (out of 15) - how inherently dangerous
// this category of incident tends to be, independent of this specific report.
const TYPE_BASE_WEIGHT = {
  fire: 15,
  chemical_hazard: 15,
  building_collapse: 15,
  industrial_accident: 14,
  flood: 12,
  landslide: 12,
  medical_emergency: 10,
  road_accident: 8,
  other: 5,
};

// Types that inherently tend to spread/escalate if unaddressed (out of 10).
const SPREAD_PRONE_TYPES = new Set(['fire', 'flood', 'chemical_hazard', 'landslide', 'industrial_accident']);

// Types whose typical failure mode threatens structures/infrastructure (out of 10).
const INFRASTRUCTURE_IMPACT_TYPES = new Set(['building_collapse', 'industrial_accident', 'chemical_hazard', 'fire']);

const URGENCY_POINTS = { critical: 15, high: 10, medium: 5, low: 2 };

function levelForScore(score) {
  return SEVERITY_THRESHOLDS.find((t) => score <= t.max).level;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * @param {object} params
 * @param {object} params.incident - incident row (type, people_at_risk)
 * @param {object[]} params.reports - all reports attached to the incident
 * @param {object|null} params.latestAnalysis - most recent ai_analyses row (parsed_output has urgency/hazards)
 * @returns {{ score: number, severity: string, factors: Array<{factor: string, value: number, points: number, maxPoints: number}> }}
 */
function computeSeverity({ incident, reports = [], latestAnalysis = null }) {
  const parsed = latestAnalysis && latestAnalysis.parsed_output ? latestAnalysis.parsed_output : null;
  const urgency = parsed && URGENCY_POINTS[parsed.urgency] !== undefined ? parsed.urgency : null;
  const hazards = parsed && Array.isArray(parsed.hazards) ? parsed.hazards : [];

  const factors = [];

  // 1. People at risk (max 20)
  const peopleAtRisk = incident.people_at_risk || 0;
  const peoplePoints = clamp(Math.round(peopleAtRisk * 0.4), 0, 20);
  factors.push({ factor: 'People at risk', value: peopleAtRisk, points: peoplePoints, maxPoints: 20 });

  // 2. Incident type base hazard weight (max 15)
  const typePoints = TYPE_BASE_WEIGHT[incident.type] ?? TYPE_BASE_WEIGHT.other;
  factors.push({ factor: 'Incident type hazard level', value: incident.type, points: typePoints, maxPoints: 15 });

  // 3. Urgency from AI classification (max 15)
  const urgencyPoints = urgency ? URGENCY_POINTS[urgency] : 0;
  factors.push({ factor: 'AI-assessed urgency', value: urgency ?? 'unknown', points: urgencyPoints, maxPoints: 15 });

  // 4. Spread potential (max 10)
  const spreadPoints = SPREAD_PRONE_TYPES.has(incident.type) ? 10 : 0;
  factors.push({ factor: 'Spread potential', value: spreadPoints > 0 ? 'high' : 'low', points: spreadPoints, maxPoints: 10 });

  // 5. Infrastructure impact (max 10)
  const infraPoints = INFRASTRUCTURE_IMPACT_TYPES.has(incident.type) ? 10 : 0;
  factors.push({ factor: 'Infrastructure impact', value: infraPoints > 0 ? 'likely' : 'unlikely', points: infraPoints, maxPoints: 10 });

  // 6. Hazard level - number of distinct hazards identified (max 10, 3 pts each)
  const hazardPoints = clamp(hazards.length * 3, 0, 10);
  factors.push({ factor: 'Identified hazards', value: hazards.length, points: hazardPoints, maxPoints: 10 });

  // 7. Corroborating reports (max 10, 3 pts per report beyond the first)
  const corroboratingPoints = clamp(Math.max(0, reports.length - 1) * 3, 0, 10);
  factors.push({ factor: 'Corroborating reports', value: reports.length, points: corroboratingPoints, maxPoints: 10 });

  // 8. Sensor confirmation (max 5)
  const hasSensor = reports.some((r) => r.source === 'sensor');
  factors.push({ factor: 'Sensor confirmation', value: hasSensor, points: hasSensor ? 5 : 0, maxPoints: 5 });

  // 9. Field verification (max 5)
  const hasFieldTeam = reports.some((r) => r.source === 'field_team');
  factors.push({ factor: 'Field verification', value: hasFieldTeam, points: hasFieldTeam ? 5 : 0, maxPoints: 5 });

  const rawScore = factors.reduce((sum, f) => sum + f.points, 0);
  const score = clamp(Math.round(rawScore), 0, 100);
  const severity = levelForScore(score);

  return { score, severity, factors };
}

module.exports = { computeSeverity, levelForScore, SEVERITY_THRESHOLDS };
