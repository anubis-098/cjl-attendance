import { type Data, type Review, isoLocal, OT_RULES_VERSION } from "./engine";
import { punchTime, shiftWindow } from "./shift-window";
import { createUUID } from "./uuid";

export type ScanPair = { inMs: number; outMs: number };
const localTime = (ms: number) => ms % 60000 === 0 ? isoLocal(ms)
  : new Date(ms + 7 * 3600000).toISOString().slice(0, 19);

function shiftForPair(data: Data, employeeId: string, deviceId: string, pair: ScanPair) {
  const candidates = data.shifts.filter(s => s.emp_id === employeeId && s.device_emp_id === deviceId);
  const matching = candidates.flatMap(shift => {
    const window = shiftWindow(shift, shift.date);
    if (pair.inMs < window.from || pair.inMs >= window.to) return [];
    const containsEnd = pair.outMs >= window.from && pair.outMs < window.to;
    const [start, end] = [pair.inMs, pair.outMs];
    const midpoint = (start + end) / 2;
    const scheduledMidpoint = (window.start + window.end) / 2;
    return [{ shift, score: (containsEnd ? 0 : 1e12) + Math.abs(midpoint - scheduledMidpoint) }];
  }).sort((a, b) => a.score - b.score);
  return matching[0]?.shift || candidates.find(s => s.date === isoLocal(pair.inMs).slice(0, 10));
}

// Shared by the preview and API. Only existing scans can be linked; never invent a punch.
export function applyManualPairs(data: Data, employeeId: string, deviceId: string, pairs: ScanPair[], actor: string, ignoredScans?: number[]): Data {
  if (!Array.isArray(pairs) || pairs.length > 62 || (!pairs.length && ignoredScans === undefined)) throw Error("กรุณาเลือกคู่สแกนหรือสแกนที่ต้องการปิด");
  const scans = new Set(data.punches.filter(p => p.device_emp_id === deviceId).map(p => punchTime(p.punch_timestamp)));
  const ordered = [...pairs].sort((a, b) => a.inMs - b.inMs);
  const keys = new Set<string>();
  for (let i = 0; i < ordered.length; i++) {
    const pair = ordered[i];
    if (!Number.isSafeInteger(pair.inMs) || !Number.isSafeInteger(pair.outMs) || !scans.has(pair.inMs) || !scans.has(pair.outMs))
      throw Error("กรุณาเลือกเวลาสแกนจริงของพนักงานคนนี้");
    if (pair.outMs <= pair.inMs || pair.outMs - pair.inMs > 24 * 3600000)
      throw Error("เวลาออกต้องหลังเวลาเข้าและห่างกันไม่เกิน 24 ชั่วโมง");
    const shift = shiftForPair(data, employeeId, deviceId, pair);
    if (!shift) throw Error("ไม่พบกะ Master ที่ตรงกับเวลาสแกนนี้");
    const key = employeeId + "|" + shift.date;
    if (keys.has(key)) throw Error("บันทึกได้หนึ่งคู่ต่อวันเริ่มงาน");
    keys.add(key);
    if (i && pair.inMs <= ordered[i - 1].outMs) throw Error("คู่สแกนทับกันหรือใช้สแกนซ้ำ");
  }
  for (const [key, review] of Object.entries(data.reviews)) {
    if (!key.startsWith(employeeId + "|") || keys.has(key)) continue;
    const start = review.inTime ? punchTime(review.inTime) : undefined;
    const end = review.outTime ? punchTime(review.outTime) : undefined;
    if (ordered.some(p => start !== undefined && end !== undefined
      ? p.inMs <= end && p.outMs >= start
      : [start, end].some(ms => ms !== undefined && ms >= p.inMs && ms <= p.outMs)))
      throw Error(`คู่สแกนทับเวลาที่บันทึกไว้ ${key.split("|")[1]}`);
  }
  const reviews = { ...data.reviews };
  const audit = [...data.audit];
  for (const pair of ordered) {
    const shift = shiftForPair(data, employeeId, deviceId, pair);
    if (!shift) throw Error("ไม่พบกะ Master ที่ตรงกับเวลาสแกนนี้");
    const key = employeeId + "|" + shift.date;
    const before = reviews[key];
    const after: Review = { ...before, inTime: localTime(pair.inMs), outTime: localTime(pair.outMs),
      manualPair: true, approved: false, otRulesVersion: OT_RULES_VERSION,
      overBudget: before?.overBudget ?? false, note: before?.note ?? "" };
    reviews[key] = after;
    audit.unshift({ id: createUUID(), key, actor, timestamp: new Date().toISOString(),
      reason: "จับคู่สแกนด้วยตนเอง · รอยืนยัน OT", before: JSON.stringify(before ?? null), after: JSON.stringify(after) });
  }
  if (ignoredScans) {
    const valid = new Set(data.punches.filter(p => p.device_emp_id === deviceId).map(p => punchTime(p.punch_timestamp)));
    if (!Array.isArray(ignoredScans) || ignoredScans.length > 2000 || ignoredScans.some(ms => !Number.isSafeInteger(ms) || !valid.has(ms)))
      throw Error("เลือกได้เฉพาะเวลาสแกนจริงของพนักงานคนนี้");
    // Replace this employee's displayed-month ignore set while retaining any ignores outside this payload.
    const selected = new Set(ignoredScans);
    const employeeKeys = Object.keys(reviews).filter(key => key.startsWith(employeeId + "|"));
    for (const key of employeeKeys) {
      const prior = reviews[key];
      const remaining = (prior.ignoredScans || []).filter(ms => !valid.has(ms));
      if (remaining.length) reviews[key] = { ...prior, ignoredScans: remaining };
      else if (prior.ignoredScans) {
        const { ignoredScans: _ignored, ...rest } = prior;
        reviews[key] = rest;
      }
    }
    for (const ms of selected) {
      const containing = data.shifts.filter(s => s.emp_id === employeeId && s.device_emp_id === deviceId &&
        ms >= shiftWindow(s, s.date).from && ms < shiftWindow(s, s.date).to)
        .sort((a, b) => Math.abs(ms - shiftWindow(a, a.date).start) - Math.abs(ms - shiftWindow(b, b.date).start))[0];
      const date = containing?.date || isoLocal(ms).slice(0, 10);
      const key = employeeId + "|" + date;
      const before = reviews[key];
      const after: Review = { ...(before || { approved: false, overBudget: false, note: "" }),
        ignoredScans: [...new Set([...(before?.ignoredScans || []), ms])] };
      reviews[key] = after;
      audit.unshift({ id: createUUID(), key, actor, timestamp: new Date().toISOString(), reason: "ปิดสแกนที่ไม่มีคู่จากปฏิทิน", before: JSON.stringify(before ?? null), after: JSON.stringify(after) });
    }
  }
  return { ...data, reviews, audit };
}
