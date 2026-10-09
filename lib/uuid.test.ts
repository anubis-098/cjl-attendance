import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createUUID } from "./uuid";
import { audit } from "./workspace";
import type { Shift } from "./engine";

test("HTTP browser without randomUUID can create valid unique audit IDs", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto")!;
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) },
  });
  try {
    const shift = { emp_id: "HTTP-TEST", date: "2026-09-30" } as Shift;
    const entry = audit(shift, {}, { shift_code: "N" }, "Change shift");
    assert.match(entry.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(entry.key, "HTTP-TEST|2026-09-30");
    assert.equal(entry.after, '{"shift_code":"N"}');
    assert.equal(new Set(Array.from({ length: 1000 }, createUUID)).size, 1000);
  } finally {
    Object.defineProperty(globalThis, "crypto", descriptor);
  }
});

test("secure contexts still use the native UUID implementation", () => {
  assert.match(createUUID(), /^[0-9a-f-]{36}$/);
});
