import { isoLocal, stamp, type Shift, type reconcile } from "./engine";
import { shiftWindow } from "./shift-window";
import type { ActualTimeline, ActualInterval } from "./actual-timeline";
type Result = ReturnType<typeof reconcile>;
export function shiftStartDate(s: Shift, r: Result) {
  if (r.off || r.nonWorking) return s.date;
  return isoLocal(
    Math.min(stamp(s.date, s.shift_start), r.inMs ?? Infinity),
  ).slice(0, 10);
}
export function shiftEndDate(s: Shift, r: Result) {
  if (r.off || r.nonWorking) return s.date;
  const start = stamp(s.date, s.shift_start),
    end = stamp(s.date, s.shift_end);
  return isoLocal(
    Math.max(end <= start ? end + 86400000 : end, r.outMs ?? 0),
  ).slice(0, 10);
}
export function layoutShifts(
  shifts: Shift[],
  days: string[],
  results: Map<string, Result>,
  now = Date.now(),
  actualTimeline?: ActualTimeline,
) {
  const lanes: number[] = [];
  const dayMs = 86400000;
  const rangeStart = stamp(days[0], "00:00");
  const rangeEnd = stamp(days.at(-1)!, "00:00") + dayMs;
  return [...shifts]
    .flatMap<{ s: Shift; actual?: ActualInterval }>((s) => {
      const actual = actualTimeline?.get(`${s.emp_id}|${s.date}`);
      return actual?.length
        ? actual.map((interval) => ({ s, actual: interval }))
        : [{ s, actual: undefined }];
    })
    .sort(
      (a, b) =>
        (a.actual?.start ?? stamp(a.s.date, a.s.shift_start)) -
        (b.actual?.start ?? stamp(b.s.date, b.s.shift_start)),
    )
    .flatMap(({ s, actual }) => {
      const r = results.get(`${s.emp_id}|${s.date}`)!;
      const endDate = actual
        ? isoLocal(actual.end).slice(0, 10)
        : shiftEndDate(s, r);
      const allDay = !actual && (r.off || r.nonWorking);
      // Actual calendars do not invent a work period from an outdated Master.
      // Keep holidays/leave and real (including incomplete) scan intervals.
      if (actualTimeline && !actual && !allDay) return [];
      const plannedStart = stamp(s.date, allDay ? "00:00" : s.shift_start);
      const start = actual
        ? actual.start
        : allDay
          ? plannedStart
          : Math.min(plannedStart, r.inMs ?? Infinity);
      const plannedEnd = stamp(s.date, s.shift_end);
      const end = actual
        ? actual.end
        : allDay
          ? start + dayMs
          : Math.max(
              plannedEnd <= plannedStart ? plannedEnd + dayMs : plannedEnd,
              r.outMs ?? 0,
            );
      const clippedStart = Math.max(start, rangeStart),
        clippedEnd = Math.min(actual?.estimated && start === end ? end + 1 : end, rangeEnd);
      if (clippedEnd <= clippedStart) return [];
      const first = Math.floor((clippedStart - rangeStart) / dayMs);
      const last = Math.floor((clippedEnd - rangeStart - 1) / dayMs);
      const span = last - first + 1;
      const left = (((clippedStart - rangeStart) / dayMs - first) / span) * 100;
      const right =
        ((last + 1 - (clippedEnd - rangeStart) / dayMs) / span) * 100;
      let lane = lanes.findIndex((end) => end <= clippedStart);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = clippedEnd;
      return [
        {
          shift: s,
          actual,
          id: actual?.id ?? `${s.emp_id}|${s.date}`,
          start,
          end,
          plannedOnly: !!actualTimeline && !actual && !allDay,
          result: r,
          pending:
            !actual &&
            r.missing &&
            !r.scheduleConflict &&
            !allDay &&
            now < shiftWindow(s, s.date).end,
          first,
          last,
          lane,
          left,
          right,
          allDay,
          endDate,
          continuesBefore: start < rangeStart,
          continuesAfter: end > rangeEnd,
        },
      ];
    });
}
