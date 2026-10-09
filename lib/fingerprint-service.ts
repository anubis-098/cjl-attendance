import { createHash, randomBytes } from "node:crypto";
import { employeeDB } from "./database";

let schema: Promise<unknown> | undefined;
export function ensureServiceSchema() {
  return schema ??= employeeDB.query(`
    CREATE TABLE IF NOT EXISTS fingerprint_services (
      id uuid PRIMARY KEY, name text NOT NULL, token_hash text NOT NULL UNIQUE,
      active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
      last_seen timestamptz, machine_name text, version text);
    CREATE TABLE IF NOT EXISTS fingerprint_service_uploads (
      id uuid PRIMARY KEY, service_id uuid NOT NULL REFERENCES fingerprint_services(id),
      request_id uuid NOT NULL, sha256 text NOT NULL, filename text NOT NULL,
      received_at timestamptz NOT NULL DEFAULT now(), summary jsonb NOT NULL,
      UNIQUE(service_id, request_id));
  `).catch(error => { schema=undefined; throw error; });
}
export const serviceHash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
export const newServiceToken = () => randomBytes(32).toString("base64url");
export async function authenticateService(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!token) return null;
  await ensureServiceSchema();
  const { rows } = await employeeDB.query("SELECT id,name FROM fingerprint_services WHERE token_hash=$1 AND active", [serviceHash(token)]);
  return rows[0] as {id:string;name:string} | undefined;
}
export async function touchService(id:string, request:Request) {
  await employeeDB.query("UPDATE fingerprint_services SET last_seen=now(),machine_name=$2,version=$3 WHERE id=$1", [id,(request.headers.get("x-machine-name")||"Client").slice(0,100),(request.headers.get("x-service-version")||"").slice(0,30)]);
}
export async function boundedBody(request:Request, limit=10*1024*1024) {
  if(Number(request.headers.get("content-length"))>limit) throw Error("File exceeds 10 MB");
  const reader=request.body?.getReader();
  if(!reader) throw Error("TXT file is required");
  const chunks:Uint8Array[]=[]; let size=0;
  for (;;) {
    const {done,value}=await reader.read(); if(done) break;
    size+=value.length;
    if(size>limit) { await reader.cancel(); throw Error("File exceeds 10 MB"); }
    chunks.push(value);
  }
  if(!size) throw Error("TXT file is empty");
  return Buffer.concat(chunks);
}
