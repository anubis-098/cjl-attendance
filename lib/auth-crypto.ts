import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export const SESSION_SECONDS = 24 * 60 * 60;
export type Claims = { sub: string; jti: string; iat: number; exp: number; iss: string; aud: string };
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [kind, salt, value] = encoded.split(":");
  if (kind !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt || "") || !/^[a-f0-9]{128}$/.test(value || "")) return false;
  const hash = await derive(password, salt, 64) as Buffer;
  return timingSafeEqual(hash, Buffer.from(value, "hex"));
}
export function signToken(sub: string, jti: string, secret: string, now = Math.floor(Date.now() / 1000)) {
  const claims: Claims = { sub, jti, iat: now, exp: now + SESSION_SECONDS, iss: "cj-agent", aud: "cj-attendance" };
  const head = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return { token: `${head}.${body}.${signature}`, claims };
}
export function verifyToken(token: string, secret: string, now = Math.floor(Date.now() / 1000)): Claims | null {
  try {
    if (token.length > 2048) return null;
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) return null;
    const [head, body, signature] = parts;
    const header = JSON.parse(Buffer.from(head, "base64url").toString());
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;
    const expected = createHmac("sha256", secret).update(`${head}.${body}`).digest();
    const actual = Buffer.from(signature, "base64url");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const claims = JSON.parse(Buffer.from(body, "base64url").toString());
    if (claims.iss !== "cj-agent" || claims.aud !== "cj-attendance" ||
      !Number.isInteger(claims.iat) || !Number.isInteger(claims.exp) || claims.iat > now ||
      claims.exp !== claims.iat + SESSION_SECONDS || claims.exp <= now ||
      !/^[a-f0-9-]{36}$/.test(claims.sub) || !/^[a-f0-9-]{36}$/.test(claims.jti)) return null;
    return claims;
  } catch { return null; }
}
