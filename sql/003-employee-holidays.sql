CREATE TABLE IF NOT EXISTS employee_holidays (
  employee_id text NOT NULL,
  holiday_date date NOT NULL,
  holiday_code text NOT NULL CHECK (holiday_code IN ('H','H8','PH','PH8','WOP','PL','SL','AB')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, holiday_date)
);
