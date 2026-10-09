import { test } from "node:test";
import assert from "node:assert/strict";
import { auditChanges } from "./audit-changes";
test("audit diff includes changed nested fields, additions and removals", () => {
  assert.deepEqual(auditChanges('{"shift":{"code":"M"},"approved":false,"note":"old"}', '{"shift":{"code":"N"},"approved":true,"file":"proof"}'), [
    { field: "shift.code", before: "M", after: "N" },
    { field: "approved", before: false, after: true },
    { field: "note", before: "old", after: undefined },
    { field: "file", before: undefined, after: "proof" },
  ]);
});
test("audit diff tolerates legacy text and ignores object property order", () => {
  assert.deepEqual(auditChanges('{"a":1,"b":2}', '{"b":2,"a":1}'), []);
  assert.deepEqual(auditChanges('', 'legacy text'), [{ field: "value", before: undefined, after: "legacy text" }]);
  assert.deepEqual(auditChanges('null', '{"note":"new"}'), [{ field: "note", before: undefined, after: "new" }]);
});
