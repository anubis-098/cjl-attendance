import pg from "pg";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
const pool = new pg.Pool({ database: process.env.EMPLOYEE_DB || "employee_db" });
const c = await pool.connect();
try {
  await c.query("BEGIN");
  await c.query("SELECT pg_advisory_xact_lock(73125009)");
  const existing = await c.query("SELECT count(*) FROM app_users");
  if (Number(existing.rows[0].count)) throw Error("Accounts already exist; no credentials were changed.");
  await c.query("INSERT INTO auth_settings(id,jwt_secret) VALUES(1,$1) ON CONFLICT DO NOTHING", [randomBytes(64).toString("hex")]);
  const credentials = [];
  for (const [username, displayName, role] of [["superadmin", "Super Admin", "super_admin"], ["supervisor", "Supervisor", "supervisor"]]) {
    const password = randomBytes(18).toString("base64url");
    const salt = randomBytes(16).toString("hex");
    const encoded = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
    await c.query("INSERT INTO app_users(id,username,display_name,password_hash,role) VALUES($1,$2,$3,$4,$5)", [randomUUID(), username, displayName, encoded, role]);
    credentials.push({ username, password, role });
  }
  await c.query("COMMIT");
  process.stdout.write(JSON.stringify(credentials, null, 2) + "\n");
} catch (e) {
  await c.query("ROLLBACK");
  console.error(e.message);
  process.exitCode = 1;
} finally { c.release(); await pool.end(); }
