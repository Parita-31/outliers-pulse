const { query } = require('../config/db');

async function saveAnalysis({
  incidentId, reportId, inputText, rawResponse, parsedOutput, model, usedFallback, confidence,
}) {
  const { rows } = await query(
    `INSERT INTO ai_analyses
       (incident_id, report_id, input_text, raw_response, parsed_output, model, used_fallback, confidence)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      incidentId ?? null,
      reportId ?? null,
      inputText,
      rawResponse ? JSON.stringify({ raw: rawResponse }) : null,
      JSON.stringify(parsedOutput),
      model ?? null,
      usedFallback,
      confidence ?? null,
    ]
  );
  return rows[0];
}

async function listForIncident(incidentId) {
  const { rows } = await query(
    `SELECT * FROM ai_analyses WHERE incident_id = $1 ORDER BY created_at DESC`,
    [incidentId]
  );
  return rows;
}

module.exports = { saveAnalysis, listForIncident };
