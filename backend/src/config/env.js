require('dotenv').config();

function bool(val, fallback) {
  if (val === undefined || val === '') return fallback;
  return val === 'true' || val === '1';
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  DATABASE_URL:
    process.env.DATABASE_URL ||
    'postgresql://incident_user:incident_pass@localhost:5432/incident_commander',

  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  AI_TIMEOUT_MS: parseInt(process.env.AI_TIMEOUT_MS || '8000', 10),

  DUPLICATE_DISTANCE_METERS: parseInt(
    process.env.DUPLICATE_DISTANCE_METERS || '1000',
    10
  ),
  DUPLICATE_TIME_WINDOW_MIN: parseInt(
    process.env.DUPLICATE_TIME_WINDOW_MIN || '30',
    10
  ),

  RESOURCE_SEARCH_RADIUS_METERS: parseInt(
    process.env.RESOURCE_SEARCH_RADIUS_METERS || '20000',
    10
  ),
  AVERAGE_RESPONSE_SPEED_KMH: parseInt(
    process.env.AVERAGE_RESPONSE_SPEED_KMH || '40',
    10
  ),

  IS_PROD: process.env.NODE_ENV === 'production',
};

if (!env.GEMINI_API_KEY) {
  // Not fatal - the AI service falls back to deterministic logic.
  // eslint-disable-next-line no-console
  console.warn(
    '[env] GEMINI_API_KEY not set - AI classification will use deterministic fallback only.'
  );
}

module.exports = env;
