const HOUR = 3_600_000;

// Bangkok is a whole-hour UTC offset, so hour boundaries also align in epoch time.
// Keep the source timestamp unchanged; this is only the credited start time.
export function creditedStart(inMs: number) {
  const hour = Math.floor(inMs / HOUR) * HOUR;
  return inMs - hour < 21 * 60_000 ? hour : hour + HOUR;
}

export const floorOT = (hours: number) =>
  hours < 1 ? 0 : Math.floor(Math.max(0, hours) * 2) / 2;

export function workTime(inMs: number, outMs: number, deductOTBreak = false, plan?: { start: number; end: number }) {
  const calculationStart = creditedStart(inMs);
  // A completely different actual shift must not become all overtime solely
  // because it does not overlap an outdated Master plan.
  if (plan && (outMs <= plan.start || calculationStart >= plan.end)) plan = undefined;
  // Eight credited work hours plus the existing one-hour regular break.
  const overtimeStart = plan?.end ?? calculationStart + 9 * HOUR;
  const beforeShiftOT = plan ? floorOT(Math.max(0, (Math.min(plan.start, outMs) - calculationStart) / HOUR)) : 0;
  const normalHours = Math.min(8, Math.max(0, (Math.min(outMs, plan?.end ?? outMs) - Math.max(calculationStart, plan?.start ?? calculationStart)) / HOUR - 1));
  const grossOvertime = Math.max(0, (outMs - Math.max(overtimeStart, calculationStart)) / HOUR);
  const grossAfterShiftOT = floorOT(grossOvertime);
  const canDeductOTBreak = grossAfterShiftOT > 3;
  const otBreakHours = deductOTBreak && canDeductOTBreak ? 0.5 : 0;
  return {
    calculationStart,
    overtimeStart,
    normalHours,
    beforeShiftOT,
    grossAfterShiftOT,
    canDeductOTBreak,
    otBreakHours,
    afterShiftOT: floorOT(grossOvertime - otBreakHours),
    overtimeHours: beforeShiftOT + floorOT(grossOvertime - otBreakHours),
  };
}
