import { test as base, expect } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { hashPassword } from "../lib/auth-crypto";
import type { Data } from "../lib/engine";
// Isolated Compose test stack only. Never connect to the application database.
const options = {
  host: "127.0.0.1",
  port: 5433,
  user: "cj_app",
  password: "cj_test_only",
  max: 2,
};
const employees = new Pool({ ...options, database: "employee_db" }),
  fingerprints = new Pool({ ...options, database: "fingerprint_db" });
export async function seedData(data: Data) {
  await employees.query("DELETE FROM ot_requests");
  await employees.query("DELETE FROM calendar_remarks");
  await employees.query("DELETE FROM attendance_evidence");
  await employees.query("DELETE FROM company_holidays");
  await employees.query("DELETE FROM employee_holidays");
  await employees.query("DELETE FROM employee_master");
  await fingerprints.query("TRUNCATE fingerprint_logs, import_batches");
  const batch = randomUUID();
  await fingerprints.query(
    "INSERT INTO import_batches(id,filename) VALUES($1,'test-only')",
    [batch],
  );
  await fingerprints.query(
    `INSERT INTO fingerprint_logs SELECT $1,device_emp_id,punch_timestamp::timestamp,punch_type FROM jsonb_to_recordset($2::jsonb) AS x(device_emp_id text,punch_timestamp text,punch_type text) ON CONFLICT DO NOTHING`,
    [batch, JSON.stringify(data.punches)],
  );
  const unique = [...new Map(data.shifts.map((s) => [s.emp_id, s])).values()];
  for (const [i, s] of unique.entries())
    await employees.query(
      "INSERT INTO employee_master VALUES($1,$2,$3,$4,'')",
      [
        s.emp_id,
        i + 2,
        JSON.stringify({
          ลำดับ: String(i + 1),
          รหัส: s.emp_id,
          "ชื่อ-นามสกุล": s.emp_name,
          แผนก: s.department,
          กะทำงาน: s.shift_code,
          "First Time": s.shift_start,
          "Last Time": s.shift_end,
          Sup: s.agency,
        }),
        JSON.stringify(s),
      ],
    );
  await employees.query(
    "UPDATE workspace SET revision=revision+1,active_punch_batch=$1,data=$2 WHERE id=1",
    [batch, JSON.stringify({ ...data, punches: undefined })],
  );
}
async function reset() {
  await employees.query("DELETE FROM ot_requests");
  await employees.query("DELETE FROM calendar_remarks");
  await employees.query("DELETE FROM attendance_evidence");
  await employees.query("DELETE FROM company_holidays");
  await employees.query("DELETE FROM employee_holidays");
  await employees.query(
    "UPDATE workspace SET revision=revision+1,active_punch_batch=NULL,data=$1 WHERE id=1",
    [
      JSON.stringify({
        calculationVersion: 2,
        shifts: [],
        reviews: {},
        audit: [],
      }),
    ],
  );
  await employees.query("DELETE FROM employee_master");
  await fingerprints.query("TRUNCATE fingerprint_logs,import_batches");
}
export const TEST_PASSWORD = "Test-only-account-password-2026";
export const TEST_SECRET = "test-only-jwt-secret-not-used-in-production-".repeat(3);
async function resetAccounts() {
  await employees.query("DELETE FROM auth_sessions");
  await employees.query("DELETE FROM app_users");
  await employees.query("DELETE FROM auth_login_attempts");
  await employees.query("DELETE FROM account_audit");
  await employees.query("INSERT INTO auth_settings(id,jwt_secret) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET jwt_secret=EXCLUDED.jwt_secret", [TEST_SECRET]);
  const hash = await hashPassword(TEST_PASSWORD);
  for (const [username, role] of [["testadmin", "super_admin"], ["testsupervisor", "supervisor"]])
    await employees.query("INSERT INTO app_users(id,username,display_name,password_hash,role) VALUES($1,$2,$2,$3,$4)", [randomUUID(), username, hash, role]);
}
export const test = base.extend<{ _database: void }>({
  _database: [
    async ({ context, request }, use) => {
      await reset();
      await resetAccounts();
      for (const api of [context.request, request]) {
        const response = await api.post("/api/auth/login", { data: { username: "testadmin", password: TEST_PASSWORD } });
        expect(response.ok()).toBeTruthy();
      }
      try {
        await use();
      } finally {
        await reset();
      }
    },
    { auto: true },
  ],
});
export { expect };
