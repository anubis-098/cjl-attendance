"use client";
import { keyOf, manualPairScansByEmployee, reconcile, Shift, isoLocal } from "@/lib/engine";
import { addDays } from "@/lib/workspace";
import { useMemo } from "react";
import { useWorkspace } from "./provider";
import { shiftEndDate, shiftStartDate } from "@/lib/calendar-layout";
import { buildActualTimeline } from "@/lib/actual-timeline";
import { attendancePeriod } from "@/lib/attendance-summary";
export function useAttendance() {
  const workspace = useWorkspace();
  const { data, filters, punchesByEmployee, globalEmployeeSearch } = workspace;
  const actualTimeline = useMemo(
    () => buildActualTimeline(data.shifts, punchesByEmployee, data.reviews),
    [data.shifts, punchesByEmployee, data.reviews],
  );
  const manuallyPairedScans = useMemo(
    () => manualPairScansByEmployee(data.reviews),
    [data.reviews],
  );
  const computed = useMemo(() => {
    const { date, view, search, agency, department, shift } = filters;
    const { start, count } = attendancePeriod(date, view, filters.rangeEnd);
    const days = Array.from({ length: count }, (_, i) => addDays(start, i));
    const last = days.at(-1)!;
    const candidates = data.shifts.filter(
      (s) =>
        s.date >= addDays(start, -2) &&
        s.date <= addDays(last, 1) &&
        (agency === "all" || s.agency === agency) &&
        (department === "all" || s.department === department) &&
        (filters.workerType === "all" ||
          (s.worker_type || "unknown") === filters.workerType) &&
        (shift === "all" || s.shift_code === shift) &&
        (s.emp_name + " " + s.emp_id)
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (!globalEmployeeSearch.trim() ||
          `${s.emp_id} ${s.emp_name} ${s.agency}`
            .toLowerCase()
            .includes(globalEmployeeSearch.trim().toLowerCase())),
    );
    const results = new Map(
      candidates.map((s) => [
        keyOf(s),
        reconcile(
          s,
          punchesByEmployee.get(s.device_emp_id) || [],
          data.reviews[keyOf(s)],
          manuallyPairedScans.get(s.emp_id),
        ),
      ]),
    );
    const filtered = candidates.filter(
      (s) => s.date >= start && s.date <= last,
    );
    const carryIn = candidates.filter(
      (s) =>
        (actualTimeline
          .get(keyOf(s))
          ?.some(
            (a) =>
              isoLocal(a.start).slice(0, 10) <= last &&
              isoLocal(a.end).slice(0, 10) >= start,
          ) &&
          (s.date < start || s.date > last)) ||
        (s.date < start && shiftEndDate(s, results.get(keyOf(s))!) >= start) ||
        (s.date > last && shiftStartDate(s, results.get(keyOf(s))!) <= last),
    );
    const shiftsByEmployee = new Map<string, Shift[]>(),
      shiftByKey = new Map<string, Shift>();
    const employees = new Map<string, Shift>();
    let normal = 0,
      ot = 0,
      requested = 0,
      pending = 0,
      issues = 0;
    for (const s of filtered) {
      const r = results.get(keyOf(s))!;
      const rows = shiftsByEmployee.get(s.emp_id) || [];
      rows.push(s);
      shiftsByEmployee.set(s.emp_id, rows);
      shiftByKey.set(keyOf(s), s);
      employees.set(s.emp_id, s);
      normal += r.normal;
      ot += r.approved ? r.actualOT : 0;
      requested += r.punchedOT;
      pending += Number(
        !r.off && !r.absent && !r.approved && (!r.nonWorking || r.scheduleConflict),
      );
      issues += Number(
        !["NORMAL", "APPROVED", "OFF", "LEAVE", "RESIGNED"].includes(r.status),
      );
    }
    return {
      start,
      count,
      days,
      filtered,
      carryIn,
      results,
      shiftsByEmployee,
      shiftByKey,
      employees: [...employees.values()],
      totals: { normal, ot, requested, pending, issues },
    };
  }, [data.shifts, data.reviews, filters, punchesByEmployee, actualTimeline, globalEmployeeSearch, manuallyPairedScans]);
  return { ...workspace, ...computed, actualTimeline };
}
export type AttendanceData = ReturnType<typeof useAttendance>;
