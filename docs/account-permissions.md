# Account permissions

| Role | Attendance | Changes / OT approval | Financial reports | Accounts |
|---|---|---|---|---|
| Super Admin | All employees | Yes | View and configure | Manage |
| Supervisor | All employees | Yes | View / export | No |
| Guest | All employees, read only | No | No | No |
| Employee | Linked employee only, read only | No | No | No |

Create Employee accounts in Accounts & Permissions and enter an existing employee ID. Changing the role or linked ID revokes previous sessions. Viewers can change their own password. They cannot import, upload evidence, edit remarks, request or approve OT. Raw master data, financial settings and audit payloads are excluded from their workspace responses. Other management APIs return 403.

## Upgrade an existing installation

Run this additive migration before starting the new web image, from the existing project directory. It preserves accounts and attendance data. Do not delete volumes.

```bash
docker compose exec -T database psql -U cj_app -d employee_db -v ON_ERROR_STOP=1 < sql/011-account-roles.sql
docker compose build web
docker compose up -d --no-deps web
```

New databases include these columns and constraints in the initial schema. The migration is repeatable.
