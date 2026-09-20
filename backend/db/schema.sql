-- ============================================================================
-- AI INCIDENT COMMANDER — DATABASE SCHEMA
-- Idempotent: safe to re-run (enum creation is guarded, tables use IF NOT EXISTS)
-- ============================================================================

-- gen_random_uuid() is built into Postgres core since v13 — no extension needed.

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'commander', 'dispatcher', 'field_team');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_type AS ENUM (
    'fire', 'flood', 'road_accident', 'medical_emergency',
    'industrial_accident', 'building_collapse', 'chemical_hazard',
    'landslide', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE severity_level AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM ('P1', 'P2', 'P3', 'P4');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM (
    'REPORTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS',
    'RESOLVED', 'MERGED', 'CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_source AS ENUM (
    'citizen', 'emergency_call', 'sensor', 'field_team', 'admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE resource_type AS ENUM (
    'ambulance', 'fire_team', 'police_unit', 'rescue_team',
    'medical_team', 'rescue_vehicle', 'equipment', 'hospital', 'shelter'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE resource_status AS ENUM (
    'AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE',
    'BUSY', 'UNAVAILABLE', 'OFFLINE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM (
    'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ACTIVE',
    'COMPLETED', 'FAILED', 'REASSIGNED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_type AS ENUM (
    'CRITICAL_INCIDENT', 'SEVERITY_ESCALATION', 'RESOURCE_FAILURE',
    'RESPONSE_DELAY', 'RESOURCE_SHORTAGE', 'UNRESOLVED_HIGH_PRIORITY',
    'CASCADING_IMPACT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE activity_action AS ENUM (
    'REPORT_RECEIVED', 'INCIDENT_CREATED', 'INCIDENT_CLASSIFIED',
    'INCIDENT_MERGED', 'SEVERITY_CHANGED', 'PRIORITY_CHANGED',
    'RESOURCE_RECOMMENDED', 'RESOURCE_ASSIGNED', 'RESOURCE_FAILED',
    'RESOURCE_REASSIGNED', 'ALERT_CREATED', 'ALERT_ACKNOWLEDGED',
    'INCIDENT_RESOLVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  role          user_role NOT NULL DEFAULT 'dispatcher',
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- INCIDENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
  id                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title                   TEXT NOT NULL,
  type                    incident_type NOT NULL DEFAULT 'other',
  description             TEXT,
  latitude                DOUBLE PRECISION NOT NULL,
  longitude               DOUBLE PRECISION NOT NULL,
  severity                severity_level,
  severity_score          INTEGER CHECK (severity_score BETWEEN 0 AND 100),
  severity_factors        JSONB DEFAULT '[]'::jsonb,
  priority                priority_level,
  priority_reasons        JSONB DEFAULT '[]'::jsonb,
  confidence_score        NUMERIC(5,2) CHECK (confidence_score BETWEEN 0 AND 100),
  people_at_risk          INTEGER NOT NULL DEFAULT 0,
  status                  incident_status NOT NULL DEFAULT 'REPORTED',
  merged_into_incident_id TEXT REFERENCES incidents(id) ON DELETE SET NULL,
  created_by              TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(type);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents(latitude, longitude);

-- ----------------------------------------------------------------------------
-- REPORTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  incident_id       TEXT REFERENCES incidents(id) ON DELETE SET NULL,
  source            report_source NOT NULL,
  message           TEXT NOT NULL,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  reporter_name     TEXT,
  reporter_contact  TEXT,
  "timestamp"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  confidence        NUMERIC(5,2) CHECK (confidence BETWEEN 0 AND 100),
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_incident_id ON reports(incident_id);
CREATE INDEX IF NOT EXISTS idx_reports_source ON reports(source);
CREATE INDEX IF NOT EXISTS idx_reports_timestamp ON reports("timestamp");
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(latitude, longitude);

-- ----------------------------------------------------------------------------
-- RESOURCES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resources (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                TEXT NOT NULL,
  type                resource_type NOT NULL,
  capability          JSONB DEFAULT '[]'::jsonb,
  latitude            DOUBLE PRECISION NOT NULL,
  longitude           DOUBLE PRECISION NOT NULL,
  status              resource_status NOT NULL DEFAULT 'AVAILABLE',
  workload            INTEGER NOT NULL DEFAULT 0 CHECK (workload BETWEEN 0 AND 100),
  eta                 INTEGER,
  current_incident_id TEXT REFERENCES incidents(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_location ON resources(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_resources_current_incident ON resources(current_incident_id);

-- ----------------------------------------------------------------------------
-- HOSPITALS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hospitals (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name             TEXT NOT NULL,
  latitude         DOUBLE PRECISION NOT NULL,
  longitude        DOUBLE PRECISION NOT NULL,
  capacity         INTEGER NOT NULL DEFAULT 0,
  available_beds   INTEGER NOT NULL DEFAULT 0,
  specialties      JSONB DEFAULT '[]'::jsonb,
  contact          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hospitals_location ON hospitals(latitude, longitude);

-- ----------------------------------------------------------------------------
-- ASSIGNMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  incident_id           TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  resource_id           TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  status                assignment_status NOT NULL DEFAULT 'PENDING_APPROVAL',
  recommended_score     NUMERIC(5,2),
  recommended_reasons   JSONB DEFAULT '[]'::jsonb,
  eta                   INTEGER,
  replaced_assignment_id TEXT REFERENCES assignments(id) ON DELETE SET NULL,
  approved_by           TEXT REFERENCES users(id) ON DELETE SET NULL,
  approved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_incident_id ON assignments(incident_id);
CREATE INDEX IF NOT EXISTS idx_assignments_resource_id ON assignments(resource_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

-- ----------------------------------------------------------------------------
-- ALERTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  incident_id       TEXT REFERENCES incidents(id) ON DELETE CASCADE,
  type              alert_type NOT NULL,
  severity          severity_level NOT NULL DEFAULT 'MODERATE',
  message           TEXT NOT NULL,
  metadata          JSONB DEFAULT '{}'::jsonb,
  acknowledged      BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_incident_id ON alerts(incident_id);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id               TEXT REFERENCES users(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  message               TEXT NOT NULL,
  type                  TEXT NOT NULL DEFAULT 'general',
  related_incident_id   TEXT REFERENCES incidents(id) ON DELETE SET NULL,
  read                  BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ----------------------------------------------------------------------------
-- ACTIVITY LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  incident_id   TEXT REFERENCES incidents(id) ON DELETE CASCADE,
  action        activity_action NOT NULL,
  actor_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  details       JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_incident_id ON activity_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- ----------------------------------------------------------------------------
-- AI ANALYSES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_analyses (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  incident_id     TEXT REFERENCES incidents(id) ON DELETE CASCADE,
  report_id       TEXT REFERENCES reports(id) ON DELETE CASCADE,
  input_text      TEXT,
  raw_response    JSONB,
  parsed_output   JSONB,
  model           TEXT,
  used_fallback   BOOLEAN NOT NULL DEFAULT false,
  confidence      NUMERIC(5,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_incident_id ON ai_analyses(incident_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_report_id ON ai_analyses(report_id);

-- ----------------------------------------------------------------------------
-- updated_at AUTO-TOUCH TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'incidents', 'resources', 'hospitals', 'assignments']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON %I; ' ||
      'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I ' ||
      'FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t
    );
  END LOOP;
END $$;
