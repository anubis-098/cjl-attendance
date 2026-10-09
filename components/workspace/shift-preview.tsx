"use client";
import { useTranslation } from "@/lib/i18n";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { clock, isoLocal, type Shift, type reconcile } from "@/lib/engine";
import { shiftWindow } from "@/lib/shift-window";
import { labels, number } from "@/lib/workspace";
import type { ActualInterval } from "@/lib/actual-timeline";
import { workTime } from "@/lib/work-time";

type Preview = {
  shift: Shift;
  result: ReturnType<typeof reconcile>;
  pending: boolean;
  anchor: HTMLElement;
  actual?: ActualInterval;
};

export function useShiftPreview() {
  const id = useId();
  const [active, setActive] = useState<Preview | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = () => clearTimeout(timer.current);
  const close = () => {
    cancel();
    setActive(null);
  };
  const leave = () => {
    cancel();
    timer.current = setTimeout(() => setActive(null), 150);
  };
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", escape);
    const onScroll = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(".shift-preview")) return;
      close();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      cancel();
      window.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, []);
  return {
    close,
    bind(
      shift: Shift,
      result: Preview["result"],
      pending: boolean,
      actual?: ActualInterval,
    ) {
      const show = (anchor: HTMLElement) => {
        cancel();
        timer.current = setTimeout(
          () => setActive({ shift, result, pending, anchor, actual }),
          180,
        );
      };
      return {
        onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
          if (event.pointerType !== "touch") show(event.currentTarget);
        },
        onPointerLeave: leave,
        onFocus: (event: React.FocusEvent<HTMLElement>) =>
          show(event.currentTarget),
        onBlur: close,
        "aria-describedby": active?.shift === shift ? id : undefined,
      };
    },
    popup: active && (
      <ShiftPreview
        key={`${active.shift.emp_id}|${active.shift.date}`}
        id={id}
        preview={active}
        onEnter={cancel}
        onLeave={leave}
      />
    ),
  };
}

function ShiftPreview({
  id,
  preview: { shift, result: r, pending, anchor, actual },
  onEnter,
  onLeave,
}: {
  id: string;
  preview: Preview;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const { t, getLocale } = useTranslation();
  const en = getLocale().startsWith("en");
  const text = (th: string, english: string) => en ? english : th;
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 8, top: 8, maxHeight: window.innerHeight - 16 });
  useLayoutEffect(() => {
    const target = anchor.getBoundingClientRect();
    const box = ref.current!.getBoundingClientRect();
    const above = Math.max(0, target.top - 16);
    const below = Math.max(0, window.innerHeight - target.bottom - 16);
    const height = ref.current!.scrollHeight;
    const placeAbove = above >= height || (below < height && above >= below);
    const maxHeight = placeAbove ? above : below;
    setPosition({
      left: Math.max(
        8,
        Math.min(
          target.left + target.width / 2 - box.width / 2,
          window.innerWidth - box.width - 8,
        ),
      ),
      top: placeAbove ? target.top - Math.min(height, maxHeight) - 8 : target.bottom + 8,
      maxHeight,
    });
  }, [anchor, actual]);
  const { start, end } = shiftWindow(shift, shift.date);
  const actualWork = actual && !actual.estimated && !actual.uncertain
    ? workTime(actual.inMs!, actual.outMs!, r.otBreakHours > 0, { start, end }) : undefined;
  const timed =
    !r.off && !r.nonWorking && Number.isFinite(start) && Number.isFinite(end);
  const from = Math.min(start, actual?.start ?? r.inMs ?? start);
  const to = Math.max(end, actual?.end ?? r.outMs ?? end);
  const style = (a: number, b: number) => ({
    left: `${((a - from) / (to - from)) * 100}%`,
    width: `${(Math.max(0, b - a) / (to - from)) * 100}%`,
  });
  const time = (ms: number | undefined) => ms === undefined ? "--:--" :
    `${clock(ms)}${isoLocal(ms).slice(0, 10) > shift.date ? " (+1)" : isoLocal(ms).slice(0, 10) < shift.date ? " (-1)" : ""}`;
  const inMs = actual ? actual.inMs : r.inMs;
  const outMs = actual ? actual.outMs : r.outMs;
  const complete = inMs !== undefined && outMs !== undefined && outMs > inMs &&
    !(actual ? actual.estimated || actual.uncertain : r.missing);
  const duration = complete ? Math.max(0, (outMs! - inMs!) / 3600000 - 1 - r.otBreakHours) : undefined;
  const hours = (value: number | undefined) => value === undefined ? "—" : `${number(value)} ${text("ชม.", "h")}`;
  const otReady = complete && !r.ratePending && !r.nonWorking;
  const beforeOT = otReady ? actualWork?.beforeShiftOT ?? r.beforeShiftOT : undefined;
  const afterOT = otReady ? actualWork?.afterShiftOT ?? r.afterShiftOT : undefined;
  const overtimeStart = actualWork?.overtimeStart ?? r.overtimeStart;
  const previewStatus = actual?.estimated || actual?.uncertain ? "MISSING" : pending ? "PENDING" : r.status;
  const statusTone = ["MISSING", "ABSENT", "UNDER", "SCHEDULE_CONFLICT"].includes(previewStatus) ? "danger"
    : ["UNAPPROVED", "OVER", "RATE_PENDING", "REQUEST_PENDING"].includes(previewStatus) ? "warning"
    : ["APPROVED", "ACHIEVED"].includes(previewStatus) ? "success"
    : previewStatus === "LATE" ? "late"
    : ["NORMAL", "PENDING"].includes(previewStatus) ? "info" : "neutral";
  return createPortal(
    <div ref={ref} id={id} role="tooltip" className="shift-preview" style={position}
      onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <div className="shift-preview-heading">
        <strong>{shift.emp_name}</strong><span>{shift.shift_code}</span>
      </div>
      <div className="shift-preview-subtitle">{shift.date} · {shift.department}</div>
      <div className={`shift-preview-status preview-status-${statusTone}`}>
        {actual?.estimated ? text("สแกนไม่ครบ", "Missing scan") : actual?.uncertain
          ? text("สแกนกำกวม", "Ambiguous scans") : t(pending ? "ยังไม่ถึงเวลาเลิกกะ" : labels[r.status] || r.status)}
      </div>
      <dl className="shift-preview-details">
        <div><dt>Master</dt><dd>{timed ? `${time(start)} – ${time(end)}` : shift.shift_code}</dd></div>
        <div><dt>Actual</dt><dd>{time(inMs)} – {time(outMs)}</dd></div>
      </dl>
      {(actual || timed) && <div className="shift-preview-chart">
        <div className="shift-preview-axis">
          <span>{actual?.inMs === undefined && actual && from === actual.start ? "--:--" : time(from)}</span>
          <span>{actual?.outMs === undefined && actual && to === actual.end ? "--:--" : time(to)}</span>
        </div>
        <div className="shift-preview-row"><span>Master</span><div className="shift-preview-track">
          <i className="preview-plan" style={style(start, end)} />
        </div></div>
        <div className="shift-preview-row"><span>Actual</span><div className="shift-preview-track">
          {actual || complete ? <>
            <i className={complete ? "preview-work" : "preview-estimated"}
              style={style(actual?.start ?? inMs!, actual?.end ?? outMs!)} />
            {otReady && (beforeOT ?? 0) > 0 && <i className="preview-ot" style={style(Math.max(inMs!, actualWork?.calculationStart ?? r.calculationStart ?? inMs!), Math.min(start, outMs!))} />}
            {otReady && (afterOT ?? 0) > 0 && overtimeStart !== undefined &&
              <i className="preview-ot" style={style(overtimeStart, outMs!)} />}
          </> : <span className="preview-incomplete">--:--</span>}
        </div></div>
      </div>}
      <dl className="shift-preview-totals">
        <div><dt>{text("ทำงานจริง (หักพัก)", "Worked (net of breaks)")}</dt><dd>{hours(duration)}</dd></div>
        <div><dt>{text("OT หน้า", "Pre-shift OT")}</dt><dd>{hours(beforeOT)}</dd></div>
        <div><dt>{text("OT หลัง", "Post-shift OT")}</dt><dd>{hours(afterOT)}</dd></div>
      </dl>
    </div>, document.body,
  );
}
