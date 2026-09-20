const { z } = require('zod');

const INCIDENT_TYPES = [
  'fire', 'flood', 'road_accident', 'medical_emergency',
  'industrial_accident', 'building_collapse', 'chemical_hazard',
  'landslide', 'other',
];
const INCIDENT_STATUSES = [
  'REPORTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS',
  'RESOLVED', 'MERGED', 'CLOSED',
];
const SEVERITY_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
const PRIORITY_LEVELS = ['P1', 'P2', 'P3', 'P4'];
const REPORT_SOURCES = ['citizen', 'emergency_call', 'sensor', 'field_team', 'admin'];
const RESOURCE_TYPES = [
  'ambulance', 'fire_team', 'police_unit', 'rescue_team',
  'medical_team', 'rescue_vehicle', 'equipment', 'hospital', 'shelter',
];
const RESOURCE_STATUSES = [
  'AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE',
  'BUSY', 'UNAVAILABLE', 'OFFLINE',
];

const createIncidentSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.enum(INCIDENT_TYPES).default('other'),
  description: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  people_at_risk: z.number().int().min(0).default(0),
  status: z.enum(INCIDENT_STATUSES).optional(),
});

const updateIncidentSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    type: z.enum(INCIDENT_TYPES).optional(),
    description: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    people_at_risk: z.number().int().min(0).optional(),
    status: z.enum(INCIDENT_STATUSES).optional(),
    severity: z.enum(SEVERITY_LEVELS).optional(),
    priority: z.enum(PRIORITY_LEVELS).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided to update',
  });

const listIncidentsQuerySchema = z.object({
  status: z.enum(INCIDENT_STATUSES).optional(),
  type: z.enum(INCIDENT_TYPES).optional(),
  severity: z.enum(SEVERITY_LEVELS).optional(),
  priority: z.enum(PRIORITY_LEVELS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['created_at', '-created_at', 'severity_score', '-severity_score']).default('-created_at'),
});

const createReportSchema = z.object({
  incident_id: z.string().uuid().optional(),
  source: z.enum(REPORT_SOURCES),
  message: z.string().min(1),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  reporter_name: z.string().optional(),
  reporter_contact: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
  metadata: z.record(z.any()).optional(),
});

const createResourceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(RESOURCE_TYPES),
  capability: z.array(z.string()).default([]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  status: z.enum(RESOURCE_STATUSES).default('AVAILABLE'),
  workload: z.number().int().min(0).max(100).default(0),
});

const updateResourceStatusSchema = z.object({
  status: z.enum(RESOURCE_STATUSES),
  eta: z.number().int().min(0).optional(),
  current_incident_id: z.string().uuid().nullable().optional(),
});

const mergeIncidentSchema = z.object({
  target_incident_id: z.string().uuid(),
});

const createAssignmentSchema = z.object({
  incident_id: z.string().uuid(),
  resource_id: z.string().uuid(),
});

const approveAssignmentSchema = z.object({
  approved_by: z.string().uuid().optional(),
});

const simulateResourceFailureSchema = z.object({
  resource_id: z.string().uuid(),
});

const recoverSchema = z.object({
  assignment_id: z.string().uuid(),
  new_resource_id: z.string().uuid(),
  approved_by: z.string().uuid().optional(),
});

const ALERT_TYPES = [
  'CRITICAL_INCIDENT', 'SEVERITY_ESCALATION', 'RESOURCE_FAILURE',
  'RESPONSE_DELAY', 'RESOURCE_SHORTAGE', 'UNRESOLVED_HIGH_PRIORITY',
  'CASCADING_IMPACT',
];

const listAlertsQuerySchema = z.object({
  acknowledged: z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true')),
  type: z.enum(ALERT_TYPES).optional(),
  incident_id: z.string().uuid().optional(),
});

const acknowledgeAlertSchema = z.object({
  acknowledged_by: z.string().uuid().optional(),
});

module.exports = {
  INCIDENT_TYPES,
  INCIDENT_STATUSES,
  SEVERITY_LEVELS,
  PRIORITY_LEVELS,
  REPORT_SOURCES,
  RESOURCE_TYPES,
  RESOURCE_STATUSES,
  ALERT_TYPES,
  createIncidentSchema,
  updateIncidentSchema,
  listIncidentsQuerySchema,
  createReportSchema,
  createResourceSchema,
  updateResourceStatusSchema,
  mergeIncidentSchema,
  createAssignmentSchema,
  approveAssignmentSchema,
  simulateResourceFailureSchema,
  recoverSchema,
  listAlertsQuerySchema,
  acknowledgeAlertSchema,
};
