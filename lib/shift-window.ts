import type { Shift } from "./engine";
const DAY = 86400000;
export function punchTime(timestamp: string) {
  return Date.parse(
    /[Zz]$|[+-]\d{2}:?\d{2}$/.test(timestamp)
      ? timestamp
      : timestamp.replace(" ", "T") + "+07:00",
  );
}
export function shiftWindow(
  shift: Pick<Shift, "shift_start" | "shift_end">,
  date: string,
) {
  const start = punchTime(`${date}T${shift.shift_start}:00`);
  const rawEnd = punchTime(`${date}T${shift.shift_end}:00`);
  const end = rawEnd <= start ? rawEnd + DAY : rawEnd;
  // Split the rest interval halfway between successive daily shifts.
  // Adjacent windows are half-open and never share a fingerprint scan.
  const from = (end - DAY + start) / 2;
  return { start, end, from, to: from + DAY };
}
export function scanShiftDate(
  shift: Pick<Shift, "shift_start" | "shift_end">,
  timestamp: string,
) {
  const ms = punchTime(timestamp);
  const date = new Date(ms + 7 * 3600000).toISOString().slice(0, 10);
  for (const offset of [-1, 0, 1]) {
    const day = new Date(Date.parse(date) + offset * DAY)
      .toISOString()
      .slice(0, 10);
    const window = shiftWindow(shift, day);
    if (ms >= window.from && ms < window.to) return day;
  }
  return date;
}
