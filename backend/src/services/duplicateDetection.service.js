const env = require('../config/env');

const EARTH_RADIUS_M = 6371000;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two lat/lon points, in meters.
 */
function haversineMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'and', 'or', 'to', 'of', 'in',
  'on', 'at', 'near', 'with', 'for', 'from', 'this', 'that', 'it', 'be', 'has',
  'have', 'had', 'there', 'here', 'by', 'as',
]);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Cosine similarity between two texts using simple term-frequency vectors.
 * No external embeddings call - deterministic and free.
 * @returns {number} 0..1
 */
function textSimilarity(textA, textB) {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const freqA = {};
  for (const t of tokensA) freqA[t] = (freqA[t] || 0) + 1;
  const freqB = {};
  for (const t of tokensB) freqB[t] = (freqB[t] || 0) + 1;

  const allTerms = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const term of allTerms) {
    const a = freqA[term] || 0;
    const b = freqB[term] || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function minutesBetween(dateA, dateB) {
  return Math.abs(new Date(dateA).getTime() - new Date(dateB).getTime()) / 60000;
}

/**
 * Scores how related an incoming report is to an existing candidate incident.
 *
 * @param {object} params
 * @param {{latitude:number, longitude:number, type:string, message:string, timestamp:string|Date}} params.report
 * @param {object} params.incident - candidate incident row (latitude, longitude, type, title, description, created_at)
 * @returns {{ score: number, reasons: string[], distanceMeters: number|null }}
 */
function scoreRelatedness({ report, incident }) {
  const reasons = [];
  let score = 0;

  // 1. Same incident category (max 25)
  if (report.type && incident.type && report.type === incident.type) {
    score += 25;
    reasons.push('same incident type');
  }

  // 2. Geographic distance (max 35) - linear decay to 0 at DUPLICATE_DISTANCE_METERS
  let distanceMeters = null;
  if (
    Number.isFinite(report.latitude) && Number.isFinite(report.longitude) &&
    Number.isFinite(incident.latitude) && Number.isFinite(incident.longitude)
  ) {
    distanceMeters = haversineMeters(report.latitude, report.longitude, incident.latitude, incident.longitude);
    const maxDist = env.DUPLICATE_DISTANCE_METERS;
    if (distanceMeters <= maxDist) {
      const distancePoints = Math.round(35 * (1 - distanceMeters / maxDist));
      score += distancePoints;
      reasons.push(`${Math.round(distanceMeters)}m apart`);
    }
  }

  // 3. Text similarity (max 25)
  const candidateText = [incident.title, incident.description].filter(Boolean).join(' ');
  const similarity = textSimilarity(report.message, candidateText);
  if (similarity > 0) {
    const textPoints = Math.round(25 * similarity);
    score += textPoints;
    if (similarity >= 0.3) reasons.push('similar text');
  }

  // 4. Time proximity (max 15) - linear decay to 0 at DUPLICATE_TIME_WINDOW_MIN
  const elapsedMinutes = minutesBetween(report.timestamp || new Date(), incident.created_at);
  const maxWindow = env.DUPLICATE_TIME_WINDOW_MIN;
  if (elapsedMinutes <= maxWindow) {
    const timePoints = Math.round(15 * (1 - elapsedMinutes / maxWindow));
    score += timePoints;
    reasons.push(`reports received within ${Math.ceil(elapsedMinutes)} minutes`);
  }

  return { score: Math.min(100, score), reasons, distanceMeters };
}

/**
 * Finds the best-matching candidate incident for an incoming report, if any
 * candidate scores at or above the relatedness threshold.
 *
 * @param {{latitude:number, longitude:number, type:string, message:string, timestamp:string|Date}} report
 * @param {object[]} candidateIncidents - active/recent incidents to compare against
 * @param {number} [threshold=60]
 * @returns {{ incident: object, score: number, reasons: string[] } | null}
 */
function findBestMatch(report, candidateIncidents, threshold = 60) {
  let best = null;
  for (const incident of candidateIncidents) {
    const { score, reasons } = scoreRelatedness({ report, incident });
    if (score >= threshold && (!best || score > best.score)) {
      best = { incident, score, reasons };
    }
  }
  return best;
}

module.exports = { haversineMeters, textSimilarity, scoreRelatedness, findBestMatch };
