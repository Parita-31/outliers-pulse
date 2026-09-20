const analyticsModel = require('../models/analytics.model');

async function get(req, res) {
  const data = await analyticsModel.getAnalyticsSnapshot();
  res.json({ success: true, data });
}

module.exports = { get };
