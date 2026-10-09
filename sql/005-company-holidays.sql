CREATE TABLE IF NOT EXISTS company_holidays (
  holiday_date date PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
