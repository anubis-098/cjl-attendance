import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword, signToken, verifyToken, SESSION_SECONDS } from "./auth-crypto";
test("password hashes are salted and only accept the correct password", async () => {
  const password = "a-long-test-password";
  const first = await hashPassword(password), second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
  assert.equal(await verifyPassword(password, "invalid"), false);
});
test("JWT expires exactly after 24 hours and rejects tampering and wrong signatures", () => {
  const secret = "test-only-key-".repeat(8), now = 1800000000;
  const { token, claims } = signToken(randomUUID(), randomUUID(), secret, now);
  assert.equal(claims.exp - claims.iat, SESSION_SECONDS);
  assert.ok(verifyToken(token, secret, now + SESSION_SECONDS - 1));
  assert.equal(verifyToken(token, secret, now + SESSION_SECONDS), null);
  assert.equal(verifyToken(token, "wrong-key", now), null);
  assert.equal(verifyToken(token, secret, now - 1), null);
  const parts = token.split(".");
  parts[1] = Buffer.from(JSON.stringify({ ...claims, exp: claims.exp + 86400 })).toString("base64url");
  assert.equal(verifyToken(parts.join("."), secret, now), null);
  assert.equal(verifyToken("not-a-token", secret, now), null);
});
