import { type Data, type Review, isoLocal, OT_RULES_VERSION } from "./engine";
import { punchTime } from "./shift-window";
import { createUUID } from "./uuid";

export type ScanPair = { inMs: number; outMs: number };
const localTime = (ms: number) => ms % 60000 === 0 ? isoLocal(ms)
  : new Date(ms + 7 * 3600000).toISOString().slice(0, 19);

// Shared by the preview and API. Only existing scans can be linked; never invent a punch.
export function applyManualPairs(data: Data, employeeId: string, deviceId: string, pairs: ScanPair[], actor: string): Data {
  if (!Array.isArray(pairs) || !pairs.length || pairs.length > 62) throw Error("กรุณาเลือกคู่สแกน");
  const scans = new Set(data.punches.filter(p => p.device_emp_id === deviceId).map(p => punchTime(p.punch_timestamp)));
  const ordered = [...pairs].sort((a, b) => a.inMs - b.inMs);
  const keys = new Set<string>();
  for (let i = 0; i < ordered.length; i++) {
    const pair = ordered[i];
    if (!Number.isSafeInteger(pair.inMs) || !Number.isSafeInteger(pair.outMs) || !scans.has(pair.inMs) || !scans.has(pair.outMs))
      throw Error("กรุณาเลือกเวลาสแกนจริงของพนักงานคนนี้");
    if (pair.outMs <= pair.inMs || pair.outMs - pair.inMs > 24 * 3600000)
      throw Error("เวลาออกต้องหลังเวลาเข้าและห่างกันไม่เกิน 24 ชั่วโมง");
    const key = employeeId + "|" + isoLocal(pair.inMs).slice(0, 10);
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
    const key = employeeId + "|" + isoLocal(pair.inMs).slice(0, 10);
    const before = reviews[key];
    const after: Review = { ...before, inTime: localTime(pair.inMs), outTime: localTime(pair.outMs),
      manualPair: true, approved: false, otRulesVersion: OT_RULES_VERSION,
      overBudget: before?.overBudget ?? false, note: before?.note ?? "" };
    reviews[key] = after;
    audit.unshift({ id: createUUID(), key, actor, timestamp: new Date().toISOString(),
      reason: "จับคู่สแกนด้วยตนเอง · รอยืนยัน OT", before: JSON.stringify(before ?? null), after: JSON.stringify(after) });
  }
  return { ...data, reviews, audit };
}
