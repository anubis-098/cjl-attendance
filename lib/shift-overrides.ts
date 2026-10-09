import type { Shift } from "./engine";
import { normalizeDayCode, nonWorkingCodes } from "./day-codes";
import { punchTime, shiftWindow } from "./shift-window";
export type ShiftOverride = {
  code: string;
  start: string;
  end: string;
  reason: string;
};
export const shiftDateOffset = (date: string, days: number) =>
  new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);
export function applyShiftOverride(
  shift: Shift,
  change?: ShiftOverride,
): Shift {
  if (!change) return shift;
  const code = normalizeDayCode(shift.shift_code);
  return {
    ...shift,
    shift_start: change.start,
    shift_end: change.end,
    base_shift_code: change.code,
    shift_code:
      ["H", "H8", "PH", "PH8", "OFF"].includes(code) ||
      nonWorkingCodes.has(code)
        ? shift.shift_code
        : change.code,
  };
}
export function scheduleBounds(date: string, plan: (date: string) => Shift) {
  const current = shiftWindow(plan(date), date);
  const beforeDate = shiftDateOffset(date, -1),
    afterDate = shiftDateOffset(date, 1);
  const before = shiftWindow(plan(beforeDate), beforeDate),
    after = shiftWindow(plan(afterDate), afterDate);
  return {
    ...current,
    from: (before.end + current.start) / 2,
    to: (current.end + after.start) / 2,
  };
}
export function scheduledScanDate(
  timestamp: string,
  plan: (date: string) => Shift,
) {
  const ms = punchTime(timestamp),
    date = new Date(ms + 7 * 3600000).toISOString().slice(0, 10);
  for (const offset of [-1, 0, 1]) {
    const day = shiftDateOffset(date, offset),
      bounds = scheduleBounds(day, plan);
    if (ms >= bounds.from && ms < bounds.to) return day;
  }
  return date;
}
export function validateShiftChange(body: {
  dates?: unknown;
  change?: unknown;
  reason?: unknown;
}) {
  const dates = body.dates;
  if (
    !Array.isArray(dates) ||
    !dates.length ||
    dates.length > 31 ||
    new Set(dates).size !== dates.length ||
    dates.some(
      (d) =>
        typeof d !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
        !Number.isFinite(Date.parse(d)) ||
        new Date(d).toISOString().slice(0, 10) !== d,
    ) ||
    new Set(dates.map((d) => d.slice(0, 7))).size !== 1
  )
    throw Error("กรุณาเลือกวันที่ในเดือนเดียวกัน ไม่เกิน 31 วัน");
  if (
    typeof body.reason !== "string" ||
    !body.reason.trim() ||
    body.reason.length > 1000
  )
    throw Error("กรุณาระบุเหตุผลการเปลี่ยนกะ ไม่เกิน 1,000 ตัวอักษร");
  if (body.change === null)
    return {
      dates: dates as string[],
      change: null,
      reason: body.reason.trim(),
    };
  const change = body.change as ShiftOverride | undefined;
  if (
    !change ||
    !["M", "D", "A", "N"].includes(change.code) ||
    ![change.start, change.end].every(
      (t) => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t),
    ) ||
    change.start === change.end
  )
    throw Error("กรุณาระบุกะ M/D/A/N และเวลาเริ่ม–สิ้นสุดให้ถูกต้อง");
  return {
    dates: dates as string[],
    change: {
      code: change.code,
      start: change.start,
      end: change.end,
      reason: body.reason.trim(),
    },
    reason: body.reason.trim(),
  };
}
