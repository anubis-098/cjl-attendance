-- Repair legacy Master rows where 24.00 (midnight) was previously held for review.
-- 24.00 is normalized to 00:00 on the same shift date. Raw fingerprint logs are untouched.
BEGIN;

UPDATE employee_master
SET
  issue = '',
  shift_data = jsonb_build_object(
    'emp_id', employee_id,
    'device_emp_id', employee_id,
    'emp_name', source_data->>'ชื่อ-นามสกุล',
    'department', source_data->>'แผนก',
    'agency', source_data->>'Sup',
    'shift_code', source_data->>'กะทำงาน',
    'shift_start', '00:00',
    'shift_end', replace(source_data->>'Last Time', '.', ':')
  )
WHERE issue = 'ต้องยืนยันวันอ้างอิงของ 24.00'
  AND shift_data IS NULL
  AND source_data->>'First Time' IN ('24.00', '24:00')
  AND source_data->>'Last Time' ~ '^([01]?[0-9]|2[0-3])[.:][0-5][0-9]$';

COMMIT;
