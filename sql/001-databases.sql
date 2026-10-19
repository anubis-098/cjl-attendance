CREATE DATABASE employee_db;
CREATE DATABASE fingerprint_db;
\connect employee_db
CREATE TABLE employee_master (
  employee_id text PRIMARY KEY,
  source_row integer NOT NULL,
  source_data jsonb NOT NULL,
  shift_data jsonb,
  issue text NOT NULL DEFAULT ''
);
CREATE TABLE employee_profiles (
  employee_id text PRIMARY KEY REFERENCES employee_master(employee_id) ON DELETE CASCADE,
  photo bytea NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp')),
  filename text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workspace (
  id integer PRIMARY KEY CHECK (id = 1),
  revision bigint NOT NULL DEFAULT 0,
  active_punch_batch uuid,
  data jsonb NOT NULL DEFAULT '{"calculationVersion":2,"shifts":[],"reviews":{},"audit":[]}'::jsonb
);
INSERT INTO workspace(id) VALUES (1);
CREATE TABLE company_holidays (
  holiday_date date PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS calendar_remarks (
  remark_date date NOT NULL,
  employee_id text NOT NULL DEFAULT '',
  remark text NOT NULL CHECK (length(remark) BETWEEN 1 AND 1000),
  PRIMARY KEY (remark_date, employee_id)
);
CREATE TABLE employee_holidays (
  employee_id text NOT NULL,
  holiday_date date NOT NULL,
  holiday_code text NOT NULL CHECK (holiday_code IN ('H','H8','PH','PH8','WOP','PL','SL','AB')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, holiday_date)
);
CREATE TABLE IF NOT EXISTS attendance_evidence (
  id uuid PRIMARY KEY,
  employee_id text NOT NULL,
  shift_date date NOT NULL,
  filename text NOT NULL,
  content_type text NOT NULL,
  file_size integer NOT NULL CHECK (file_size > 0 AND file_size <= 5242880),
  content bytea NOT NULL,
  source text NOT NULL CHECK (source IN ('employee','supervisor')),
  provider_name text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS attendance_evidence_employee_date ON attendance_evidence(employee_id,shift_date);

CREATE VIEW employee_file AS SELECT
 source_data->>'ลำดับ' AS "ลำดับ", employee_id AS "รหัส",
 source_data->>'ชื่อ-นามสกุล' AS "ชื่อ-นามสกุล", source_data->>'แผนก' AS "แผนก",
 source_data->>'คลัง' AS "คลัง", source_data->>'กะทำงาน' AS "กะทำงาน",
 source_data->>'เวลาทำงาน' AS "เวลาทำงาน", source_data->>'First Time' AS "First Time",
 source_data->>'Last Time' AS "Last Time", source_data->>'เริ่มงาน' AS "เริ่มงาน",
 source_data->>'End ' AS "End ", source_data->>'Satatus' AS "Satatus", source_data->>'Sup' AS "Sup",
 source_data->>'Cost per head' AS "Cost per head", source_data->>'OT per hrs.' AS "OT per hrs.",
 source_data->>'OT Holiday' AS "OT Holiday", source_data->>'Shift Allowance' AS "Shift Allowance",
 source_data->>'FF Allowance' AS "FF Allowance", source_data->>'Area' AS "Area", source_data->>'Status' AS "Status"
 FROM employee_master;
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  email text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('super_admin','supervisor','guest','employee')),
  employee_id text,
  CONSTRAINT app_users_employee_link_check CHECK (role <> 'employee' OR (employee_id IS NOT NULL AND length(trim(employee_id)) > 0)),
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_settings (
  id integer PRIMARY KEY CHECK (id=1),
  jwt_secret text NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  user_version integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_session_user ON auth_sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_login_attempts (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS account_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ot_requests (
  employee_id text NOT NULL,
  shift_date date NOT NULL,
  before_hours numeric(4,1) NOT NULL,
  after_hours numeric(4,1) NOT NULL,
  reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 1000),
  shift_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, shift_date),
  CHECK (before_hours >= 0 AND after_hours >= 0 AND before_hours + after_hours BETWEEN 1 AND 24)
);

\connect fingerprint_db
CREATE TABLE import_batches (id uuid PRIMARY KEY, filename text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE fingerprint_logs (
  batch_id uuid NOT NULL REFERENCES import_batches(id),
  employee_id text NOT NULL,
  punch_timestamp timestamp NOT NULL,
  punch_type text NOT NULL CHECK (punch_type IN ('IN','OUT','UNKNOWN')),
  PRIMARY KEY(batch_id, employee_id, punch_timestamp, punch_type)
);
CREATE INDEX fingerprint_employee_time ON fingerprint_logs(batch_id, employee_id, punch_timestamp);
CREATE INDEX fingerprint_identity ON fingerprint_logs(employee_id,punch_timestamp,punch_type);
CREATE VIEW fingerprint_file AS SELECT batch_id, employee_id AS "รหัสพนักงาน", to_char(punch_timestamp,'YYYYMMDD') AS "ปี/เดือน/วัน", to_char(punch_timestamp,'HH24MI') AS "เวลาสแกนนิ้ว" FROM fingerprint_logs;
