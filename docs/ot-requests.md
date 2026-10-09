# Employee calendar OT requests

Supervisor and Super Admin activate Request OT using the blue button on the right of the employee calendar toolbar. Clicking a date in the existing calendar opens a compact anchored popover to enter pre/post-shift hours and a reason. Existing pending requests load for editing. Each period is either zero or at least one hour in half-hour increments. Preview timestamps use Bangkok time and handle overnight shifts. The API also supports multi-date requests.

Pending requests can be edited. Requests are stored separately in `ot_requests`, with a shift snapshot, requesting account, timestamp and audit history. No attendance approval, scan time or payroll calculation is changed by requesting OT. Request approval/rejection controls are a separate workflow, not added here. Access currently follows existing calendar permissions: both roles can access all employees; team assignment restrictions do not yet exist.

Apply `sql/011-ot-requests.sql` to employee_db for existing installations. Fresh databases include the table in `001-databases.sql`. Updates use the workspace revision and a transaction to prevent stale changes and partial multi-date saves. Reviewed requests cannot be overwritten.
