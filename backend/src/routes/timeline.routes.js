const express = require('express');
const { query } = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 50`
    );

    const formatted = rows.map((a) => ({
      id: a.id,
      timestamp: a.created_at ? new Date(a.created_at).toLocaleTimeString('en-US', { hour12: false }) : new Date().toLocaleTimeString(),
      type: a.action.includes('REPORT') ? 'REPORT' : a.action.includes('CLASSIFIED') || a.action.includes('CREATED') ? 'TRIAGE' : a.action.includes('SEVERITY') || a.action.includes('PRIORITY') ? 'ESCALATION' : 'DISPATCH',
      category: a.action,
      title: a.action.replace(/_/g, ' '),
      description: typeof a.details === 'object' ? JSON.stringify(a.details) : (a.details || a.action),
      incidentId: a.incident_id,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
});

module.exports = router;
