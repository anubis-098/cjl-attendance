import type { Data, Punch } from "./engine";
import { keyOf } from "./engine";
import { punchTime, shiftWindow } from "./shift-window";

export type FingerprintImportSummary = {
  filename: string;
  added: number;
  duplicates: number;
  total: number;
  from: string;
  to: string;
};
export function reopenChangedScans(data: Data, added: Punch[]) {
  const reviews = { ...data.reviews };
  const changed = new Map<string, number[]>();
  for (const punch of added) {
    const times = changed.get(punch.device_emp_id) || [];
    times.push(punchTime(punch.punch_timestamp));
    changed.set(punch.device_emp_id, times);
  }
  for (const shift of data.shifts) {
    const key = keyOf(shift);
    if (!reviews[key]) continue;
    const window = shiftWindow(shift, shift.date);
    if (
      changed
        .get(shift.device_emp_id)
        ?.some(
          (time) =>
            time >= (shift.scan_window_from ?? window.from) &&
            time < (shift.scan_window_to ?? window.to),
        )
    ) {
      reviews[key] = { ...reviews[key], approved: false };
    }
  }
  return reviews;
}
