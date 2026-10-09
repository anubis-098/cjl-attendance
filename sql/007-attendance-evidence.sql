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
