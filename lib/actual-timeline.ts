import {
  isoLocal,
  keyOf,
  type Punch,
  type Shift,
  type Review,
  type reconcile,
} from "./engine";
import { punchTime, shiftWindow } from "./shift-window";
import { floorOT, workTime } from "./work-time";
import { normalizeDayCode, nonWorkingCodes } from "./day-codes";

const HOUR = 3600000;
export type ActualInterval = {
  id: string;
  start: number;
  end: number;
  inMs?: number;
  outMs?: number;
  estimated: boolean;
  uncertain: boolean;
  reviewed: boolean;
  reason: string;
};
export type ActualTimeline = Map<string, ActualInterval[]>;

// Missing or ambiguous scans always take precedence over the OT colour.
export function actualCardStatus(actual: ActualInterval, shift: Shift, deductOTBreak = false, approved = false) {
  if (actual.estimated || actual.uncertain) return "missing";
  if (approved) return "approved";
  const code = normalizeDayCode(shift.shift_code);
  if (nonWorkingCodes.has(code) || code === "OFF") return "actual";
  const hours = workTime(actual.inMs!, actual.outMs!, deductOTBreak, shiftWindow(shift, shift.date));
  const holiday = ["H", "H8", "PH", "PH8"].includes(code);
  return hours.overtimeHours > 0 || (holiday && floorOT(hours.normalHours) > 0)
    ? "actual-ot"
    : "actual";
}

// Display-only inference. No guessed endpoint is written to reviews or payroll.
export function pairActualScans(punches: Punch[]): ActualInterval[] {
  const intervals = inferActualScans(punches);
  // Equal-score alternatives can move an open final scan to the start of an
  // otherwise regular series. Consistent neighbouring entry/exit times resolve
  // that tie; isolated, overlapping and changed-pair warnings remain intact.
  const clockGap = (a: number, b: number) => {
    const gap = Math.abs(a - b) % (24 * HOUR);
    return Math.min(gap, 24 * HOUR - gap);
  };
  for (let i = 0; i < intervals.length; i++) {
    const current = intervals[i];
    if (current.estimated || current.reason !== "คู่สแกนกำกวม โปรดตรวจสอบ") continue;
    const neighbours = intervals.slice(Math.max(0, i - 2), i + 3).filter(other => other !== current && !other.estimated &&
      other.reason !== "ช่วงสแกนติดกันหรือทับกัน ไม่ยืนยันว่าเป็นสแกนออก โปรดตรวจสอบ" &&
      Math.abs(other.start - current.start) <= 4 * 24 * HOUR &&
      clockGap(other.start, current.start) <= 2 * HOUR && clockGap(other.end, current.end) <= 3 * HOUR);
    if (neighbours.length >= 2) {
      current.uncertain = false;
      current.reason = "จับคู่สแกนสอดคล้องกับเวลาเข้า–ออกของวันใกล้เคียง";
    }
  }
  const sorted = [...punches].filter(p => Number.isFinite(punchTime(p.punch_timestamp)))
    .sort((a, b) => punchTime(a.punch_timestamp) - punchTime(b.punch_timestamp));
  if (sorted.length < 3) return intervals;
  const latest = punchTime(sorted.at(-1)!.punch_timestamp);
  // Compare with the preceding snapshot. An additional scan must not silently
  // turn previously clear pairs into different, apparently verified pairs.
  const previous = inferActualScans(sorted.filter(p => punchTime(p.punch_timestamp) < latest));
  const currentPairs = new Set(intervals.filter(x => !x.estimated).map(x => `${x.inMs}|${x.outMs}`));
  for (const old of previous) {
    if (old.estimated || old.uncertain || currentPairs.has(`${old.inMs}|${old.outMs}`)) continue;
    const extension = intervals.find(x => x.inMs === old.inMs && !x.estimated && x.outMs! > old.outMs! && x.outMs! - old.outMs! <= 3 * HOUR);
    if (extension) continue;
    for (const interval of intervals) {
      if (interval.start <= old.end && interval.end >= old.start) {
        interval.uncertain = true;
        interval.reason = "สแกนใหม่ทำให้คู่เข้า–ออกเดิมเปลี่ยน โปรดตรวจสอบก่อนยืนยัน";
      }
    }
  }
  return intervals;
}

function inferActualScans(punches: Punch[]): ActualInterval[] {
  const sorted = punches
    .map((p) => ({ ms: punchTime(p.punch_timestamp), type: p.punch_type }))
    .filter((p) => Number.isFinite(p.ms))
    .sort((a, b) => a.ms - b.ms);
  const scans: typeof sorted = [];
  for (const p of sorted) {
    const last = scans.at(-1);
    // Retain opposite explicit directions even when close together.
    if (
      last &&
      p.ms - last.ms <= 120000 &&
      (last.type === p.type || p.type === "UNKNOWN" || last.type === "UNKNOWN")
    ) {
      if (last.type === "UNKNOWN" && p.type !== "UNKNOWN") last.type = p.type;
    } else scans.push({ ...p });
  }
  const n = scans.length,
    costs = Array<number>(n + 2).fill(0),
    pairEnds = Array<number>(n).fill(-1),
    ambiguous = Array<boolean>(n).fill(false);
  // Compare the whole sequence, so a missing scan does not shift every later pair.
  for (let i = n - 1; i >= 0; i--) {
    const a = scans[i];
    const single = 2.5 + costs[i + 1];
    let best = single, second = Infinity;
    for (let j = i + 1; j < n && a.type !== "OUT"; j++) {
      const b = scans[j];
      // A tail cluster may contain repeat exits, never an explicit new entry.
      // Bound it relative to the first exit rather than chaining indefinitely.
      if (b.type === "IN" || (j > i + 1 && b.ms - scans[i + 1].ms > 3 * HOUR)) break;
      const hours = (b.ms - a.ms) / HOUR;
      const explicit = a.type === "IN" && b.type === "OUT";
      if (hours > (explicit ? 20 : 16)) break;
      if (hours >= (explicit ? 0.1 : 6) && hours <= (explicit ? 20 : 16)) {
        // A normal shift and a shift extended by OT are equally plausible.
        // Preferring exactly nine hours can treat overnight rest as work and
        // discard a real entry to shift every following pair by one scan.
        const durationPenalty = Math.max(0, 8 - hours, hours - 14) / 2;
        const paired = (explicit ? 0 : durationPenalty) + (j - i - 1) * 0.15 + costs[j + 1];
        // On an equal score keep the earliest complete pair, rather than
        // moving an equally plausible missing scan to the start of the run.
        if (paired < best || (paired === best && pairEnds[i] === -1)) {
          second = best;
          best = paired;
          pairEnds[i] = j;
        } else second = Math.min(second, paired);
      }
    }
    ambiguous[i] = second - best < 0.75;
    costs[i] = best;
  }
  const intervals: ActualInterval[] = [];
  for (let i = 0; i < n;) {
    const a = scans[i],
      b = scans[pairEnds[i]];
    if (pairEnds[i] >= 0) {
      intervals.push({
        id: `${a.ms}-${b.ms}`,
        start: a.ms,
        end: b.ms,
        inMs: a.ms,
        outMs: b.ms,
        estimated: false,
        uncertain: ambiguous[i],
        reviewed: false,
        reason: ambiguous[i]
          ? "คู่สแกนกำกวม โปรดตรวจสอบ"
          : pairEnds[i] > i + 1
            ? "ใช้สแกนท้ายสุดของคาบ รวมสแกนออกซ้ำระหว่างคาบ"
            : "จับคู่จากลำดับสแกนจริง",
      });
      i = pairEnds[i] + 1;
    } else {
      const exit = a.type === "OUT";
      intervals.push({
        id: `${a.ms}-single`,
        start: exit ? a.ms - 8 * HOUR : a.ms,
        end: exit ? a.ms : a.ms + 8 * HOUR,
        inMs: exit ? undefined : a.ms,
        outMs: exit ? a.ms : undefined,
        estimated: true,
        uncertain: true,
        reviewed: false,
        reason: exit
          ? "พบสแกนออกอย่างเดียว คาดเวลาเข้าย้อนหลัง 8 ชม."
          : a.type === "IN"
            ? "พบสแกนเข้าอย่างเดียว คาดเวลาออกอีก 8 ชม."
            : "สแกนเดี่ยวไม่ทราบเข้า/ออก แสดงช่วงคาดการณ์ 8 ชม.",
      });
      i++;
    }
  }
  for (let i = 0; i < intervals.length - 1; i++) {
    const a = intervals[i],
      b = intervals[i + 1];
    const gap = b.start - a.end;
    if (gap < 4 * HOUR) {
      a.uncertain = b.uncertain = true;
      a.reason = b.reason =
        "ช่วงสแกนติดกันหรือทับกัน ไม่ยืนยันว่าเป็นสแกนออก โปรดตรวจสอบ";
    }
  }
  return intervals;
}

export function buildActualTimeline(
  shifts: Shift[],
  punchesByEmployee: Map<string, Punch[]>,
  reviews: Record<string, Review>,
): ActualTimeline {
  const timeline: ActualTimeline = new Map();
  const employees = new Map<string, Shift[]>();
  for (const s of shifts) {
    const list = employees.get(s.emp_id) || [];
    list.push(s);
    employees.set(s.emp_id, list);
  }
  for (const employeeShifts of employees.values()) {
    const ordered = [...employeeShifts].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const byDate = new Map(ordered.map((s) => [s.date, s]));
    const corrected: { shift: Shift; interval: ActualInterval }[] = [];
    for (const s of ordered) {
      const review = reviews[keyOf(s)];
      if (!review?.inTime && !review?.outTime) continue;
      const inMs = review.inTime ? punchTime(review.inTime) : undefined;
      const outMs = review.outTime ? punchTime(review.outTime) : undefined;
      if (
        (inMs !== undefined && !Number.isFinite(inMs)) ||
        (outMs !== undefined && !Number.isFinite(outMs)) ||
        (inMs !== undefined && outMs !== undefined && outMs <= inMs)
      )
        continue;
      const estimated = inMs === undefined || outMs === undefined;
      corrected.push({
        shift: s,
        interval: {
          id: `review-${keyOf(s)}`,
          start: inMs ?? outMs! - 8 * HOUR,
          end: outMs ?? inMs! + 8 * HOUR,
          inMs,
          outMs,
          estimated,
          uncertain: estimated,
          reviewed: true,
          reason: estimated
            ? "เวลาแก้ไขยังไม่ครบ แสดงช่วงคาดการณ์ 8 ชม."
            : "เวลาที่หัวหน้างานแก้ไข",
        },
      });
    }
    const deviceIds = new Set(ordered.map((s) => s.device_emp_id));
    const sourcePunches = [...deviceIds].flatMap((id) => punchesByEmployee.get(id) || []);
    // A saved correction may predate a later genuine exit. Show that full raw
    // interval as a review conflict instead of inventing a new eight-hour shift.
    // This does not modify the saved review or approved payroll endpoints.
    if (corrected.length) {
      const raw = pairActualScans(sourcePunches);
      for (const correction of corrected) {
        const c = correction.interval;
        if (c.inMs === undefined || c.outMs === undefined) continue;
        const longer = raw.find(a => !a.estimated && !a.uncertain && a.inMs !== undefined && a.outMs !== undefined &&
          Math.abs(a.inMs - c.inMs!) <= 120000 && a.outMs > c.outMs! && a.outMs - c.outMs! <= 3 * HOUR);
        if (longer) correction.interval = { ...longer, uncertain: true,
          reason: "พบสแกนหลังเวลาออกที่แก้ไขไว้ โปรดตรวจสอบก่อนยืนยัน" };
      }
    }
    const punches = sourcePunches
      .filter((p) => {
        const ms = punchTime(p.punch_timestamp);
        return !corrected.some(({ interval: r }) =>
          r.inMs !== undefined && r.outMs !== undefined
            ? ms >= r.inMs - 120000 && ms <= r.outMs + 120000
            : Math.abs(ms - (r.inMs ?? r.outMs!)) <= 120000,
        );
      });
    const attach = (s: Shift, interval: ActualInterval) => {
      const key = keyOf(s);
      const list = timeline.get(key) || [];
      list.push(interval);
      timeline.set(key, list);
    };
    for (const interval of pairActualScans(punches)) {
      const date = isoLocal(interval.start).slice(0, 10);
      const s =
        byDate.get(date) ||
        byDate.get(isoLocal(interval.inMs ?? interval.outMs!).slice(0, 10));
      if (s) attach(s, interval);
    }
    for (const { shift, interval } of corrected) attach(shift, interval);
  }
  for (const intervals of timeline.values())
    if (intervals.length > 1) {
      for (const interval of intervals) {
        interval.uncertain = true;
        interval.reason = "พบหลายช่วงในวันเดียวกัน โปรดตรวจสอบก่อนยืนยัน";
      }
    }
  return timeline;
}

export function actualMatchesResult(
  intervals: ActualInterval[] | undefined,
  r: ReturnType<typeof reconcile>,
) {
  return (
    !!intervals &&
    intervals.length === 1 &&
    !intervals[0].estimated &&
    !intervals[0].uncertain &&
    intervals[0].inMs === r.inMs &&
    intervals[0].outMs === r.outMs
  );
}
