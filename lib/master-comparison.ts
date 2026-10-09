import { type Shift } from "./engine";
import { scanShiftDate } from "./shift-window";
export function masterDate(
  shift: Pick<Shift, "shift_start" | "shift_end">,
  timestamp: string,
) {
  return scanShiftDate(shift, timestamp);
}
