const alertModel = require('../models/alert.model');
const ApiError = require('../utils/ApiError');
const { logActivity } = require('../models/activityLog.model');
const { listAlertsQuerySchema, acknowledgeAlertSchema } = require('../utils/validators');

async function list(req, res) {
  const { acknowledged, type, incident_id } = listAlertsQuerySchema.parse(req.query);
  const alerts = await alertModel.listAlerts({ acknowledged, type, incidentId: incident_id });
  res.json({ success: true, data: alerts });
}

async function acknowledge(req, res) {
  const { acknowledged_by } = acknowledgeAlertSchema.parse(req.body ?? {});
  const existing = await alertModel.getAlertById(req.params.id);
  if (!existing) throw ApiError.notFound('Alert not found');

  const alert = await alertModel.acknowledgeAlert(req.params.id, acknowledged_by);

  await logActivity({
    incidentId: alert.incident_id,
    action: 'ALERT_ACKNOWLEDGED',
    details: { alertId: alert.id, acknowledgedBy: acknowledged_by ?? null },
  });

  res.json({ success: true, data: alert });
}

module.exports = { list, acknowledge };
