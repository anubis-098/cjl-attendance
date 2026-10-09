// Read-only diagnostic. Input is a JSON array of Punch records; never writes SQL.
import { readFileSync } from "node:fs";
import { pairActualScans } from "../lib/actual-timeline";
import type { Punch } from "../lib/engine";
const scans: Punch[] = JSON.parse(readFileSync(process.argv[2], "utf8"));
const employees = new Map<string, Punch[]>();
for (const scan of scans) {
  const list = employees.get(scan.device_emp_id) || [];
  list.push(scan); employees.set(scan.device_emp_id, list);
}
const report = { employees: employees.size, scans: scans.length, pairs: 0, singles: 0, uncertainPairs: 0,
  overnightPairs: 0, sourceMutations: 0, overlappingPairs: 0, repeatedEndpoints: 0, invalidDurations: 0, unstableEmployees: 0,
  exitExtensions: 0, changedConfidentPairs: 0, changedPairsStillConfident: 0 };
for (const list of employees.values()) {
  const original = JSON.stringify(list);
  const intervals = pairActualScans(list);
  if (JSON.stringify(list) !== original) report.sourceMutations++;
  const complete = intervals.filter(x => !x.estimated);
  report.pairs += complete.length;
  report.singles += intervals.length - complete.length;
  report.uncertainPairs += complete.filter(x => x.uncertain).length;
  const used = new Set<number>();
  for (const [i, interval] of complete.entries()) {
    if (interval.end <= interval.start || interval.end - interval.start > 20 * 3600000) report.invalidDurations++;
    if (i && complete[i - 1].end > interval.start) report.overlappingPairs++;
    for (const endpoint of [interval.inMs!, interval.outMs!]) {
      if (used.has(endpoint)) report.repeatedEndpoints++;
      used.add(endpoint);
    }
    if (Math.floor((interval.start + 7 * 3600000) / 86400000) !== Math.floor((interval.end + 7 * 3600000) / 86400000)) report.overnightPairs++;
  }
  const previous = pairActualScans([...list].sort((a,b) => a.punch_timestamp.localeCompare(b.punch_timestamp)).slice(0, -1));
  const finalPairs = new Set(complete.map(x => `${x.inMs}|${x.outMs}`));
  if (previous.some(x => !x.estimated && !x.uncertain && !finalPairs.has(`${x.inMs}|${x.outMs}`))) report.unstableEmployees++;
  for (const old of previous.filter(x => !x.estimated && !x.uncertain && !finalPairs.has(`${x.inMs}|${x.outMs}`))) {
    const next = complete.find(x => x.inMs === old.inMs);
    if (next && next.outMs! > old.outMs! && next.outMs! - old.outMs! <= 3 * 3600000) report.exitExtensions++;
    else {
      report.changedConfidentPairs++;
      if (complete.some(x => !x.uncertain && (x.inMs === old.inMs || x.outMs === old.outMs || x.inMs === old.outMs))) report.changedPairsStillConfident++;
    }
  }
}
console.log(JSON.stringify(report, null, 2));
