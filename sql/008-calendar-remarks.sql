CREATE TABLE IF NOT EXISTS calendar_remarks (
  remark_date date NOT NULL,
  employee_id text NOT NULL DEFAULT '',
  remark text NOT NULL CHECK (length(remark) BETWEEN 1 AND 1000),
  PRIMARY KEY (remark_date, employee_id)
);
