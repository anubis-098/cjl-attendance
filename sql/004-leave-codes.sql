BEGIN;
ALTER TABLE employee_holidays DROP CONSTRAINT IF EXISTS employee_holidays_holiday_code_check;
ALTER TABLE employee_holidays ADD CONSTRAINT employee_holidays_holiday_code_check
  CHECK (holiday_code IN ('H','H8','PH','PH8','WOP','PL','SL','AB'));
COMMIT;
