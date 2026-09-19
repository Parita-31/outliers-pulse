const { z } = require('zod');
const geminiClient = require('./gemini.client');
const { INCIDENT_TYPES, RESOURCE_TYPES } = require('../utils/validators');

const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'];

const classificationSchema = z.object({
  incidentType: z.enum(INCIDENT_TYPES),
  urgency: z.enum(URGENCY_LEVELS),
  peopleAtRisk: z.number().int().min(0).max(100000),
  hazards: z.array(z.string()).default([]),
  resourceTypes: z.array(z.enum(RESOURCE_TYPES)).default([]),
  summary: z.string().min(1).max(500),
  confidence: z.number().min(0).max(100),
});

function buildPrompt(reportText) {
  return `You are an emergency-dispatch classification system. Read the incoming field report and
respond with ONLY a JSON object (no markdown, no commentary) matching exactly this shape:

{
  "incidentType": one of ${JSON.stringify(INCIDENT_TYPES)},
  "urgency": one of ${JSON.stringify(URGENCY_LEVELS)},
  "peopleAtRisk": integer estimate of people in danger (0 if unclear),
  "hazards": array of short hazard strings (e.g. "structural collapse", "toxic smoke"),
  "resourceTypes": array of resource types needed, from ${JSON.stringify(RESOURCE_TYPES)},
  "summary": one-sentence operational summary (max 40 words),
  "confidence": integer 0-100, your confidence in this classification given the report's clarity
}

Report:
"""
${reportText}
"""`;
}

// ---------------------------------------------------------------------------
// Deterministic fallback — keyword-based, zero external dependencies.
// Used whenever GEMINI_API_KEY is unset, the API call fails/times out, or the
// AI's response fails schema validation. The app must never be blocked by AI.
// ---------------------------------------------------------------------------
const TYPE_KEYWORDS = [
  { type: 'fire', words: ['fire', 'burning', 'smoke', 'flames', 'blaze'] },
  { type: 'flood', words: ['flood', 'flooding', 'water rising', 'submerged', 'overflow'] },
  { type: 'road_accident', words: ['accident', 'collision', 'crash', 'vehicle', 'car hit', 'overturned', 'fender bender', 'hit and run', 'pile-up', 'pileup'] },
  { type: 'medical_emergency', words: ['unconscious', 'not breathing', 'heart attack', 'injured', 'bleeding', 'medical emergency', 'seizure', 'overdose'] },
  { type: 'industrial_accident', words: ['factory', 'plant explosion', 'machinery', 'industrial'] },
  { type: 'building_collapse', words: ['collapse', 'collapsed', 'building down', 'rubble', 'caved in'] },
  { type: 'chemical_hazard', words: ['chemical', 'gas leak', 'toxic', 'fumes', 'spill'] },
  { type: 'landslide', words: ['landslide', 'mudslide', 'debris flow', 'hillside'] },
];

const HAZARD_KEYWORDS = [
  'smoke', 'gas leak', 'toxic', 'structural collapse', 'live wires',
  'flooding', 'fire spreading', 'explosion risk', 'debris',
];

const URGENT_KEYWORDS = ['trapped', 'unconscious', 'not breathing', 'dying', 'spreading fast', 'collapsing', 'critical'];
const MODERATE_KEYWORDS = ['injured', 'spreading', 'rising', 'worsening'];

const TYPE_TO_RESOURCES = {
  fire: ['fire_team', 'ambulance'],
  flood: ['rescue_team', 'rescue_vehicle', 'shelter'],
  road_accident: ['ambulance', 'police_unit'],
  medical_emergency: ['ambulance', 'medical_team'],
  industrial_accident: ['fire_team', 'rescue_team', 'medical_team'],
  building_collapse: ['rescue_team', 'ambulance', 'equipment'],
  chemical_hazard: ['fire_team', 'medical_team', 'equipment'],
  landslide: ['rescue_team', 'equipment'],
  other: ['rescue_team'],
};

function extractPeopleAtRisk(text) {
  const match = text.match(/(\d+)\s*(people|persons|victims|residents|workers|children)/i);
  if (match) return Math.min(parseInt(match[1], 10), 10000);
  if (/\b(everyone|many people|crowd)\b/i.test(text)) return 20;
  return 0;
}

function classifyType(lower) {
  // Score every type by keyword-match count rather than stopping at the first
  // match - otherwise a fixed priority order misclassifies reports that
  // happen to contain an earlier category's keyword incidentally (e.g. a
  // building-collapse report mentioning "unconscious" would wrongly win as
  // medical_emergency under first-match-wins).
  let best = { type: 'other', score: 0 };
  for (const entry of TYPE_KEYWORDS) {
    const score = entry.words.reduce((acc, w) => (lower.includes(w) ? acc + 1 : acc), 0);
    if (score > best.score) best = { type: entry.type, score };
  }
  return best.type;
}

function deterministicClassify(reportText) {
  const lower = reportText.toLowerCase();

  const incidentType = classifyType(lower);

  let urgency = 'medium';
  if (URGENT_KEYWORDS.some((w) => lower.includes(w))) urgency = 'critical';
  else if (MODERATE_KEYWORDS.some((w) => lower.includes(w))) urgency = 'high';
  else if (lower.length < 40) urgency = 'low';

  const hazards = HAZARD_KEYWORDS.filter((h) => lower.includes(h));
  const peopleAtRisk = extractPeopleAtRisk(reportText);
  const resourceTypes = TYPE_TO_RESOURCES[incidentType] || ['rescue_team'];
  const summary = reportText.length > 140 ? `${reportText.slice(0, 137)}...` : reportText;

  return {
    incidentType,
    urgency,
    peopleAtRisk,
    hazards,
    resourceTypes,
    summary,
    // Deliberately capped below AI-derived confidence so downstream logic
    // (and the frontend) can tell fallback classifications apart.
    confidence: hazards.length || incidentType !== 'other' ? 55 : 35,
  };
}

/**
 * Classify a raw report/incident text into structured JSON.
 * Tries Gemini first (if configured); always succeeds by falling back to
 * deterministic keyword classification on any failure.
 *
 * @param {string} reportText
 * @returns {Promise<{ result: object, usedFallback: boolean, rawResponse: string|null, model: string|null }>}
 */
async function classify(reportText) {
  try {
    const raw = await geminiClient.generateJSON(buildPrompt(reportText));
    const parsed = JSON.parse(raw);
    const validated = classificationSchema.parse(parsed);
    return {
      result: validated,
      usedFallback: false,
      rawResponse: raw,
      model: require('../config/env').GEMINI_MODEL,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[ai.service] Gemini classification failed, using deterministic fallback:', err.message);
    const result = deterministicClassify(reportText);
    return { result, usedFallback: true, rawResponse: null, model: null };
  }
}

module.exports = { classify, classificationSchema, deterministicClassify, TYPE_TO_RESOURCES };