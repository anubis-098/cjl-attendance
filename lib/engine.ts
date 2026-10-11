import { normalizeDayCode, nonWorkingCodes } from "./day-codes";
import { punchTime, shiftWindow } from "./shift-window";
import { floorOT, workTime } from "./work-time";
export { floorOT } from "./work-time";
export type Shift = {
  scan_window_from?: number;
  scan_window_to?: number;
  base_shift_code?: string;
  emp_id: string;
  emp_name: string;
  department: string;
  source_department?: string;
  agency: string;
  worker_type?: string;
  device_emp_id: string;
  date: string;
  shift_code: string;
  shift_start: string;
  shift_end: string;
  requested_ot_hrs: number;
  requested_ot_known?: boolean;
  source_day_code?: string;
  ot_task_target: string;
};
export type Punch = {
  device_emp_id: string;
  punch_timestamp: string;
  punch_type: "IN" | "OUT" | "UNKNOWN";
};
export type Review = {
  manualPair?: boolean;
  otRulesVersion?: number;
  deductOTBreak?: boolean;
  inTime?: string;
  outTime?: string;
  approved: boolean;
  overBudget: boolean;
  note: string;
};
export type Audit = {
  id: string;
  key: string;
  actor: string;
  timestamp: string;
  reason: string;
  before: string;
  after: string;
};
export type Data = {
  employeePayrollSettings?: Record<string, Record<string, { dailyWage: number }>>;
  calendarRemarks?: { date: string; employeeId: string; text: string }[];
  companyHolidays?: string[];
  shiftOverrides?: Record<string, import("./shift-overrides").ShiftOverride>;
  payrollSettings?: Record<
    string,
    import("./payroll-settings").PayrollSettings
  >;
  payrollBooks?: Record<string, import("./payroll").PayrollBook>;
  importReport?: {
    issues: {
      source: string;
      row: number;
      employee: string;
      date: string;
      reason: string;
    }[];
    summary: {
      employees: number;
      rawScans: number;
      duplicateScans: number;
      unmatchedScans: number;
      from: string;
      to: string;
      monthlyOT: number;
    };
  };
  calculationVersion?: number;
  shifts: Shift[];
  punches: Punch[];
  reviews: Record<string, Review>;
  audit: Audit[];
};
export const CALCULATION_VERSION = 2;
export const OT_RULES_VERSION = 6;
export const OT_RATES = ["1.0", "1.5", "2.0", "3.0"] as const;
export type OTRate = (typeof OT_RATES)[number];
export type OTHours = Record<OTRate, number>;
export const emptyOT = (): OTHours => ({
  "1.0": 0,
  "1.5": 0,
  "2.0": 0,
  "3.0": 0,
});
export const holidayLabels: Record<string, string> = {
  OFF: "วันหยุด (โค้ดเดิม)",
  H: "วันหยุดประจำสัปดาห์",
  H8: "วันหยุดประจำสัปดาห์แต่มาทำงาน",
  PH: "วันหยุดประจำปี",
  PH8: "มาทำงานวันประเพณี",
};
// Company policy: the first eight credited hours earn x2 on weekly holidays,
// x1 on public holidays. Extra credited work earns x3 (regular days: x1.5).
// Credit starts at the rounded entry time, with a one-hour regular break.
export function migrateCalculation(data: Data): Data {
  if (
    data.shifts.some((s) => normalizeDayCode(s.shift_code) !== s.shift_code)
  ) {
    data = {
      ...data,
      shifts: data.shifts.map((s) => ({
        ...s,
        shift_code: normalizeDayCode(s.shift_code),
      })),
    };
  }
  if (data.calculationVersion === CALCULATION_VERSION) return data;
  const audit: Audit[] = [];
  const reviews = Object.fromEntries(
    Object.entries(data.reviews).map(([key, review]) => {
      if (!review.approved) return [key, review];
      const updated = { ...review, approved: false };
      audit.push({
        id: `ot-v2-${key}`,
        key,
        actor: "ระบบ",
        timestamp: new Date().toISOString(),
        reason:
          "เปลี่ยนกฎ OT: ยกเลิกพัก OT 30 นาทีและเพิ่มตัวคูณ กรุณาตรวจสอบรับรองใหม่",
        before: JSON.stringify(review),
        after: JSON.stringify(updated),
      });
      return [key, updated];
    }),
  );
  return {
    ...data,
    calculationVersion: CALCULATION_VERSION,
    reviews,
    audit: [...audit, ...data.audit],
  };
}
export const keyOf = (s: Shift) => `${s.emp_id}|${s.date}`;
export const stamp = (date: string, time: string) =>
  Date.parse(`${date}T${time}:00+07:00`);
export const isoLocal = (ms: number) =>
  new Date(ms + 7 * 3600000).toISOString().slice(0, 16);
export const clock = (ms?: number) =>
  ms === undefined ? "—" : isoLocal(ms).slice(11);
// Each rate needs at least one hour, then credits completed half-hour blocks.
export function reconcile(s: Shift, punches: Punch[], review?: Review) {
  const code = normalizeDayCode(s.shift_code);
  const nonWorking = nonWorkingCodes.has(code);
  const { start, end, from, to } = shiftWindow(s, s.date);
  const allLogs = punches
    .filter((p) => p.device_emp_id === s.device_emp_id)
    .map((p) => ({
      ...p,
      ms: punchTime(p.punch_timestamp),
    }))
    .sort((a, b) => a.ms - b.ms);
  const logs = allLogs.filter(
    (p) =>
      p.ms >= (s.scan_window_from ?? from) && p.ms < (s.scan_window_to ?? to),
  );
  const entry = logs.find(
    (p) => p.punch_type !== "OUT" && p.ms <= start + 7200000,
  );
  const exit = logs
    .filter((p) => p.punch_type !== "IN" && p.ms >= end && p.ms !== entry?.ms)
    .at(-1);
  const inMs = review?.inTime
    ? punchTime(review.inTime)
    : entry?.ms;
  const outMs = review?.outTime
    ? punchTime(review.outTime)
    : exit?.ms;
  const holiday = Object.hasOwn(holidayLabels, code);
  const scheduleConflict =
    nonWorking && (logs.length > 0 || !!review?.inTime || !!review?.outTime);
  const off =
    holiday &&
    code !== "H8" &&
    code !== "PH8" &&
    logs.length === 0 &&
    !review?.inTime &&
    !review?.outTime;
  const missing =
    !off && !nonWorking && (inMs === undefined || outMs === undefined);
  const late =
    !off && !nonWorking && inMs !== undefined && inMs > start + 300000;
  const period = !off && !missing && !nonWorking
    ? workTime(inMs!, outMs!, review?.deductOTBreak, { start, end })
    : undefined;
  const withinShift = period?.normalHours ?? 0;
  const publicHoliday = code === "PH" || code === "PH8";
  const weeklyHoliday = code === "H" || code === "H8";
  const ratePending = code === "OFF" && !off;
  const grossAfterShiftOT = ratePending ? 0 : period?.grossAfterShiftOT ?? 0;
  const canDeductOTBreak = !ratePending && !!period?.canDeductOTBreak;
  const otBreakHours = ratePending ? 0 : period?.otBreakHours ?? 0;
  // Keep pre-shift and post-shift OT separate; breaks apply only after shift.
  const beforeShiftOT = ratePending ? 0 : period?.beforeShiftOT ?? 0;
  const afterShiftOT = ratePending ? 0 : period?.afterShiftOT ?? 0;
  const normal =
    publicHoliday || weeklyHoliday || ratePending ? 0 : withinShift;
  const rawOT = emptyOT();
  if (!ratePending && !off && !missing) {
    if (publicHoliday) {
      rawOT["1.0"] = floorOT(withinShift);
      rawOT["3.0"] = beforeShiftOT + afterShiftOT;
    } else if (weeklyHoliday) {
      rawOT["2.0"] = floorOT(Math.min(8, withinShift));
      rawOT["3.0"] =
        beforeShiftOT + afterShiftOT + floorOT(Math.max(0, withinShift - 8));
    } else rawOT["1.5"] = beforeShiftOT + afterShiftOT;
  }
  const punchedOT = OT_RATES.reduce((sum, rate) => sum + rawOT[rate], 0);
  // Legacy request fields remain import-compatible but no longer gate OT.
  const requestUnknown = false;
  const excessOT = 0;
  const exceedsTarget = false;
  const monitoredOT = rawOT["1.5"] + rawOT["3.0"];
  const highOT = monitoredOT >= 3;
  const shortfallOT = 0;
  const underTarget = false;
  const targetMet = false;
  let approvalNeedsReview = false;
  if (review?.approved && (review.otRulesVersion ?? 0) < 3) {
    const legacyLogs = allLogs.filter(
      (p) => p.ms >= start - 3600000 && p.ms <= end + 12 * 3600000,
    );
    const legacyEntry = legacyLogs.find(
      (p) => p.punch_type !== "OUT" && p.ms <= start + 7200000,
    );
    const legacyExit = legacyLogs
      .filter(
        (p) => p.punch_type !== "IN" && p.ms >= end && p.ms !== legacyEntry?.ms,
      )
      .at(-1);
    const legacyIn = review.inTime
      ? punchTime(review.inTime)
      : legacyEntry?.ms;
    const legacyOut = review.outTime
      ? punchTime(review.outTime)
      : legacyExit?.ms;
    approvalNeedsReview =
      (inMs !== undefined && outMs !== undefined &&
        floorOT(Math.max(0, (Math.min(start, outMs) - inMs) / 3600000)) > 0) ||
      legacyIn !== inMs || legacyOut !== outMs;
  }
  if (
    review?.approved &&
    weeklyHoliday &&
    punchedOT > 0 &&
    (review.otRulesVersion ?? 0) < 4
  ) {
    approvalNeedsReview = true;
  }
  if (review?.approved && period && (review.otRulesVersion ?? 0) < 5) {
    const legacyWithin = Math.max(0, (Math.min(outMs!, end) - Math.max(inMs!, start)) / 3600000 - 1);
    const legacyBefore = floorOT(Math.max(0, (Math.min(start, outMs!) - inMs!) / 3600000));
    const legacyAfterHours = Math.max(0, (outMs! - Math.max(end, inMs!)) / 3600000);
    const legacyBreak = review.deductOTBreak && floorOT(legacyAfterHours) > 3 ? 0.5 : 0;
    const legacyExtra = legacyBefore + floorOT(legacyAfterHours - legacyBreak);
    const legacyOT = emptyOT();
    if (!ratePending) {
      if (publicHoliday) {
        legacyOT["1.0"] = floorOT(legacyWithin);
        legacyOT["3.0"] = legacyExtra;
      } else if (weeklyHoliday) {
        legacyOT["2.0"] = floorOT(Math.min(8, legacyWithin));
        legacyOT["3.0"] = legacyExtra + floorOT(Math.max(0, legacyWithin - 8));
      } else legacyOT["1.5"] = legacyExtra;
    }
    if (OT_RATES.some((rate) => legacyOT[rate] !== rawOT[rate])) approvalNeedsReview = true;
  }
  if (review?.approved && period && review.otRulesVersion === 5) {
    const old = workTime(inMs!, outMs!, review.deductOTBreak);
    if (old.overtimeHours !== beforeShiftOT + afterShiftOT || ((weeklyHoliday || publicHoliday) && floorOT(old.normalHours) !== floorOT(period.normalHours))) approvalNeedsReview = true;
  }
  const approved =
    !!review?.approved &&
    !approvalNeedsReview &&
    !off &&
    !missing &&
    !ratePending &&
    !nonWorking;
  const overBudgetApproved = approved;
  const requiresOvertimeApproval = punchedOT > 0 && !approved;
  const otByRate = { ...rawOT };
  const actualOT = punchedOT;
  const status = scheduleConflict
    ? "SCHEDULE_CONFLICT"
    : nonWorking
      ? code === "AB"
        ? "ABSENT"
        : code === "R"
          ? "RESIGNED"
          : "LEAVE"
      : off
        ? "OFF"
        : missing
          ? "MISSING"
          : ratePending
            ? "RATE_PENDING"
            : requiresOvertimeApproval
              ? "UNAPPROVED"
              : approved
                ? "APPROVED"
                : late
                  ? "LATE"
                  : "NORMAL";
  return {
    logs,
    calculationStart: period?.calculationStart,
    overtimeStart: period?.overtimeStart,
    beforeShiftOT,
    afterShiftOT,
    approvalNeedsReview,
    grossAfterShiftOT,
    canDeductOTBreak,
    otBreakHours,
    inMs,
    outMs,
    normal,
    actualOT,
    punchedOT,
    excessOT,
    shortfallOT,
    underTarget,
    targetMet,
    monitoredOT,
    highOT,
    exceedsTarget,
    overBudgetApproved,
    requiresOvertimeApproval,
    rawOT,
    otByRate,
    holiday,
    ratePending,
    requestUnknown,
    nonWorking,
    scheduleConflict,
    missing,
    late,
    status,
    approved,
    off,
  };
}
export function demoData(): Data {
  const names = [
    "สมชาย มั่นคง",
    "สุภาวดี ใจดี",
    "อนุชา วัฒนชัย",
    "พิมพ์ชนก สุขสวัสดิ์",
    "ธนกร เพิ่มพูน",
    "กัญญารัตน์ ศรีสุข",
    "วีระชัย ทองดี",
    "นภัสสร แสงทอง",
    "กิตติพงษ์ บุญมี",
    "อรทัย รุ่งเรือง",
    "ณัฐพล ชัยสิทธิ์",
    "พรทิพย์ มีทรัพย์",
  ];
  const data: Data = {
    calculationVersion: CALCULATION_VERSION,
    shifts: [],
    punches: [],
    reviews: {},
    audit: [],
  };
  names.forEach((name, i) => {
    for (let d = 0; d < 30; d++) {
      const date = `2026-09-${String(d + 1).padStart(2, "0")}`,
        off = new Date(date).getDay() === 0,
        night = i === 8;
      const s: Shift = {
        emp_id: `AG-${String(i + 1).padStart(3, "0")}`,
        device_emp_id: String(i + 1).padStart(3, "0"),
        emp_name: name,
        agency: i % 3 === 0 ? "Talent Plus" : "Workforce Co.",
        department:
          i % 3 === 0
            ? "Packing"
            : i % 3 === 1
              ? "Assembly"
              : "Quality Control",
        date,
        shift_code: off ? (i % 2 === 0 ? "H" : "H") : night ? "S2" : "S1",
        shift_start: night ? "20:00" : "08:00",
        shift_end: night ? "05:00" : "17:00",
        requested_ot_hrs: off ? 0 : (i + d) % 3 === 0 ? 2 : 0,
        ot_task_target: "ตรวจสอบและแพ็คสินค้าล็อตส่งออก 500 กล่อง",
      };
      data.shifts.push(s);
      if (off) continue;
      const start = stamp(date, s.shift_start),
        end = stamp(date, s.shift_end) + (night ? 86400000 : 0);
      data.punches.push({
        device_emp_id: s.device_emp_id,
        punch_timestamp:
          isoLocal(start + ((i + d) % 11 === 0 ? 14 : -6) * 60000) + ":00",
        punch_type: "IN",
      });
      if ((i + d) % 17 !== 0)
        data.punches.push({
          device_emp_id: s.device_emp_id,
          punch_timestamp:
            isoLocal(
              end +
                (s.requested_ot_hrs ? ((i + d) % 7 === 0 ? 90 : 120) : 0) *
                  60000,
            ) + ":00",
          punch_type: "OUT",
        });
      if (d < 14 && (i + d) % 17 !== 0)
        data.reviews[keyOf(s)] = {
          approved: true,
          overBudget: false,
          note: "ตรวจสอบผลงานแล้ว",
        };
    }
  });
  return data;
}
