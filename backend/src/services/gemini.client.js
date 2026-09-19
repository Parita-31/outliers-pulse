const env = require('../config/env');

let genAI = null;
function getClient() {
  if (!env.GEMINI_API_KEY) return null;
  if (!genAI) {
    // Lazy require + init so the app can boot even if the package/key is absent.
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }
  return genAI;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini call timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Calls Gemini asking for a strict-JSON response. Returns the raw text of the
 * response (caller is responsible for JSON.parse + validation). Throws on any
 * failure (missing key, network error, timeout) - callers must catch this and
 * fall back to deterministic logic; this function never returns a guessed value.
 *
 * @param {string} prompt
 * @returns {Promise<string>} raw text response from Gemini
 */
async function generateJSON(prompt) {
  const client = getClient();
  if (!client) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = client.getGenerativeModel({
    model: env.GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  });

  const result = await withTimeout(model.generateContent(prompt), env.AI_TIMEOUT_MS);
  const text = result.response.text();
  return text;
}

module.exports = { generateJSON };
