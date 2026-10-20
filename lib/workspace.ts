import { Audit, Shift, Data, savedPairScansByEmployee, reconcile, OT_RULES_VERSION } from "./engine";
import { createUUID } from "./uuid";
export const number = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 2 });
export const labels: Record<string, string> = {
  NORMAL: "ปกติ",
  ACHIEVED: "สำเร็จ",
  UNDER: "OT ต่ำกว่าที่ขอ",
  OVER: "OT สูงเกินเป้า",
  UNAPPROVED: "ยังไม่ได้ยืนยันโอที",
  APPROVED: "ยืนยันแล้ว",
  MISSING: "สแกนไม่ครบ",
  LATE: "มาสาย",
  OFF: "วันหยุด",
  RATE_PENDING: "รอยืนยันอัตราวันหยุด",
  REQUEST_PENDING: "ยังไม่มีคำขอ OT รายวัน",
  LEAVE: "ลา",
  ABSENT: "ขาดงาน",
  RESIGNED: "ลาออก",
  SCHEDULE_CONFLICT: "พบสแกนในวันลา / ขาดงาน / ลาออก",
};
export function matchesStatus(r: ReturnType<typeof reconcile>, status: string) {
  switch (status) {
    case "all":
      return true;
    case "issues":
      return (
        r.missing ||
        r.late ||
        r.ratePending ||
        r.requestUnknown ||
        r.scheduleConflict ||
        r.status === "ABSENT" ||
        r.underTarget ||
        (r.highOT && !r.targetMet) ||
        r.requiresOvertimeApproval
      );
    case "pending":
      return !r.approved && !r.off && !r.absent && (!r.nonWorking || r.scheduleConflict);
    case "approved":
      return r.approved;
    case "MISSING":
      return r.missing;
    case "LATE":
      return r.late;
    case "UNAPPROVED":
      return r.requiresOvertimeApproval;
    case "OVER":
      return r.highOT;
    default:
      return r.status === status;
  }
}
export const addDays = (d: string, n: number) =>
  new Date(Date.parse(d + "T00:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
export const toggle = (arr: string[], v: string) =>
  arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
export function audit(
  s: Shift,
  before: unknown,
  after: unknown,
  reason: string,
): Audit {
  return {
    id: createUUID(),
    key: `${s.emp_id}|${s.date}`,
    actor: "ผู้ใช้งานเว็บ",
    timestamp: new Date().toISOString(),
    reason,
    before: JSON.stringify(before),
    after: JSON.stringify(after),
  };
}
export const canApprove = (r: ReturnType<typeof reconcile>) =>
  !r.off && !r.absent && !r.nonWorking && !r.missing && !r.ratePending && !r.approved;
export function approveShifts(data: Data, shifts: Shift[]): Data {
  const reviews = { ...data.reviews },
    logs: Audit[] = [];
  const savedPairScans = savedPairScansByEmployee(data.reviews);
  const punchesByEmployee = new Map<string, typeof data.punches>();
  for (const punch of data.punches) {
    const rows = punchesByEmployee.get(punch.device_emp_id) || [];
    rows.push(punch);
    punchesByEmployee.set(punch.device_emp_id, rows);
  }
  for (const s of shifts) {
    const key = `${s.emp_id}|${s.date}`,
      before = reviews[key];
    if (
      !canApprove(
        reconcile(s, punchesByEmployee.get(s.device_emp_id) || [], before, savedPairScans.get(s.emp_id)),
      )
    )
      continue;
    const after = {
      ...before,
      approved: true,
      otRulesVersion: OT_RULES_VERSION,
      overBudget: before?.overBudget ?? false,
      note: before?.note || "ยืนยันเวลาทำงานและ OT ตามจริง",
    };
    reviews[key] = after;
    logs.push(
      audit(s, before ?? {}, after, "อนุมัติรายการที่เลือกและยืนยันผลงาน"),
    );
  }
  return { ...data, reviews, audit: [...logs, ...data.audit] };
}
