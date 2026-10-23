import test from "node:test";
import assert from "node:assert/strict";
import { MASTER_HEADERS } from "./source-headers";
import { employeeMasterCsv } from "./employee-csv";

test("employee CSV uses Master header order and quotes commas, quotes, and line breaks", () => {
  const result = employeeMasterCsv([
    { source_data: { [MASTER_HEADERS[0]]: "12", [MASTER_HEADERS[2]]: 'นางสาว "เอ", บี\nซี' } },
  ]);
  assert.equal(result.split("\r\n").length, 2);
  const expectedHeader = MASTER_HEADERS.map(h => `"${h.replace(/"/g, '""')}"`).join(",");
  const expectedRow = MASTER_HEADERS.map((h, i) => `"${i === 0 ? "12" : i === 2 ? 'นางสาว ""เอ"", บี\nซี' : ""}"`).join(",");
  assert.equal(result, `${expectedHeader}\r\n${expectedRow}`);
});
