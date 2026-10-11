BEGIN;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS employee_id text;
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('super_admin','supervisor','guest','employee'));
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_employee_link_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_employee_link_check CHECK (role <> 'employee' OR (employee_id IS NOT NULL AND length(trim(employee_id)) > 0));
COMMIT;
