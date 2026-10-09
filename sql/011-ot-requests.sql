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
