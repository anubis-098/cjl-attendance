import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evidenceContentType,
  EVIDENCE_MAX_SIZE,
  validEvidenceDate,
} from "./attendance-evidence";
test("evidence verifies file signatures, size and real calendar dates", () => {
  assert.equal(
    evidenceContentType(Buffer.from("%PDF-1.7\n")),
    "application/pdf",
  );
  assert.equal(
    evidenceContentType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/png",
  );
  assert.equal(
    evidenceContentType(new Uint8Array([255, 216, 255, 224])),
    "image/jpeg",
  );
  assert.equal(evidenceContentType(Buffer.from("RIFF1234WEBP")), "image/webp");
  assert.throws(() =>
    evidenceContentType(Buffer.from("<script>alert(1)</script>")),
  );
  assert.throws(() => evidenceContentType(new Uint8Array()));
  assert.throws(() =>
    evidenceContentType(new Uint8Array(EVIDENCE_MAX_SIZE + 1)),
  );
  assert.equal(validEvidenceDate("2026-02-29"), false);
  assert.equal(validEvidenceDate("2024-02-29"), true);
});
