"use client";
import { useTranslation } from "@/lib/i18n";
import { Data, Punch, isoLocal } from "@/lib/engine";
import { normalizeDepartment } from "@/lib/departments";
import type { ShiftOverride } from "@/lib/shift-overrides";
import type { ScanPair } from "@/lib/manual-pairing";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
export type Filters = {
  date: string;
  rangeEnd?: string;
  view: string;
  search: string;
  agency: string;
  department: string;
  workerType: string;
  shift: string;
};
export type WorkspaceScope = { workspace: "agency" | "hr"; site: "CDC" | "HDC" };
const defaults: Filters = {
  date: isoLocal(Date.now()).slice(0, 10),
  view: "week",
  search: "",
  agency: "all",
  department: "all",
  workerType: "all",
  shift: "all",
};
const empty: Data = {
  calculationVersion: 2,
  shifts: [],
  punches: [],
  reviews: {},
  audit: [],
};
type Workspace = {
  workspaceScope: WorkspaceScope;
  setWorkspaceScope: Dispatch<SetStateAction<WorkspaceScope>>;
  saveScanPairs: (employeeId: string, pairs: ScanPair[], ignoredScans?: number[]) => Promise<boolean>;
  saveShifts: (
    employeeId: string,
    dates: string[],
    change: Omit<ShiftOverride, "reason"> | null,
    reason: string,
  ) => Promise<boolean>;
  data: Data;
  setData: (update: SetStateAction<Data>) => Promise<boolean>;
  refresh: () => Promise<void>;
  saveCompanyHolidays: (month: string, dates: string[]) => Promise<boolean>;
  saveHolidays: (
    employeeId: string,
    dates: string[],
    code: string | null,
  ) => Promise<boolean>;
  employeeCount: number;
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  globalEmployeeSearch: string;
  setGlobalEmployeeSearch: Dispatch<SetStateAction<string>>;
  toast: string;
  setToast: Dispatch<SetStateAction<string>>;
  punchesByEmployee: Map<string, Punch[]>;
};
const Context = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceScope, setWorkspaceScope] = useState<WorkspaceScope>({ workspace: "agency", site: "CDC" });
  const { t, getLocale } = useTranslation();
  const [data, replaceData] = useState<Data>(empty),
    [employeeCount, setEmployeeCount] = useState(0),
    [filters, setFilters] = useState(defaults),
    [globalEmployeeSearch, setGlobalEmployeeSearch] = useState(""),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const state = useRef({ data: empty, revision: 0 }),
    saving = useRef(false);
  const apply = useCallback(
    (payload: { data: Data; revision: number; employeeCount: number }) => {
      state.current = { data: payload.data, revision: payload.revision };
      replaceData(payload.data);
      setEmployeeCount(payload.employeeCount);
    },
    [],
  );
  const refresh = useCallback(async () => {
    const res = await fetch("/api/workspace", { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok) throw Error(payload.error);
    apply(payload);
  }, [apply]);
  useEffect(() => {
    refresh()
      .then(() => {
        setLoaded(true);
        setError("");
      })
      .catch((e) => {
        setLoaded(true);
        setError(e.message);
      });
    try {
      const savedSearch = sessionStorage.getItem("cj-global-employee-search");
      if (savedSearch) setGlobalEmployeeSearch(savedSearch);
      const f = JSON.parse(
        sessionStorage.getItem("cj-workspace-filters") || "null",
      );
      if (
        f &&
        /^\d{4}-\d{2}-\d{2}$/.test(f.date) &&
        ["week", "biweek", "month", "range"].includes(f.view)
      )
        setFilters({
          ...defaults,
          ...f,
          department:
            typeof f.department === "string"
              ? normalizeDepartment(f.department)
              : "all",
        });
    } catch {}
    // Legacy browser data is never read or copied into SQL.
  }, [refresh]);
  useEffect(() => {
    try {
      if (globalEmployeeSearch) sessionStorage.setItem("cj-global-employee-search", globalEmployeeSearch);
      else sessionStorage.removeItem("cj-global-employee-search");
    } catch {}
  }, [globalEmployeeSearch]);
  useEffect(() => {
    if (loaded)
      try {
        sessionStorage.setItem("cj-workspace-filters", JSON.stringify(filters));
      } catch {}
  }, [loaded, filters]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 7000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const setData = useCallback(
    async (update: SetStateAction<Data>) => {
      if (saving.current) {
        setToast("กำลังบันทึก กรุณารอสักครู่");
        return false;
      }
      saving.current = true;
      try {
        const next =
          typeof update === "function" ? update(state.current.data) : update;
        const res = await fetch("/api/workspace", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision: state.current.revision,
            reviews: next.reviews,
            audit: next.audit,
          }),
        });
        const payload = await res.json();
        if (!res.ok) throw Error(payload.error);
        apply(payload);
        return true;
      } catch (e) {
        setToast(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
        return false;
      } finally {
        saving.current = false;
      }
    },
    [apply],
  );
  const punchesByEmployee = useMemo(() => {
    const map = new Map<string, Punch[]>();
    for (const p of data.punches) {
      const list = map.get(p.device_emp_id) || [];
      list.push(p);
      map.set(p.device_emp_id, list);
    }
    return map;
  }, [data.punches]);
  const saveCompanyHolidays = useCallback(
    async (month: string, dates: string[]) => {
      if (saving.current) return false;
      saving.current = true;
      try {
        const response = await fetch("/api/company-holidays", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month,
            dates,
            revision: state.current.revision,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw Error(payload.error);
        apply(payload);
        return true;
      } catch (e) {
        setToast(e instanceof Error ? e.message : "บันทึกวันหยุดไม่สำเร็จ");
        return false;
      } finally {
        saving.current = false;
      }
    },
    [apply],
  );
  const saveHolidays = useCallback(
    async (employeeId: string, dates: string[], code: string | null) => {
      if (saving.current) return false;
      saving.current = true;
      try {
        const response = await fetch("/api/holidays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            dates,
            code,
            revision: state.current.revision,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw Error(payload.error);
        apply(payload);
        return true;
      } catch (e) {
        setToast(e instanceof Error ? e.message : "บันทึกวันหยุดไม่สำเร็จ");
        return false;
      } finally {
        saving.current = false;
      }
    },
    [apply],
  );
  const saveShifts = useCallback(
    async (
      employeeId: string,
      dates: string[],
      change: Omit<ShiftOverride, "reason"> | null,
      reason: string,
    ) => {
      if (saving.current) return false;
      saving.current = true;
      try {
        const response = await fetch("/api/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            dates,
            change,
            reason,
            revision: state.current.revision,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw Error(payload.error);
        apply(payload);
        return true;
      } catch (e) {
        setToast(e instanceof Error ? e.message : "เปลี่ยนกะไม่สำเร็จ");
        return false;
      } finally {
        saving.current = false;
      }
    },
    [apply],
  );
  const saveScanPairs = useCallback(async (employeeId: string, pairs: ScanPair[], ignoredScans?: number[]) => {
    if (saving.current) return false;
    saving.current = true;
    try {
      const res = await fetch("/api/scan-pairs", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, pairs, ignoredScans, revision: state.current.revision }) });
      const payload = await res.json();
      if (!res.ok) throw Error(payload.error);
      apply(payload);
      return true;
    } catch (e) {
      setToast(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
      return false;
    } finally { saving.current = false; }
  }, [apply]);
  const value = useMemo(
    () => ({
      workspaceScope,
      setWorkspaceScope,
      data,
      setData,
      refresh,
      employeeCount,
      filters,
      setFilters,
      globalEmployeeSearch,
      setGlobalEmployeeSearch,
      toast,
      setToast,
      punchesByEmployee,
      saveHolidays,
      saveCompanyHolidays,
      saveShifts,
      saveScanPairs,
    }),
    [
      workspaceScope,
      data,
      setData,
      refresh,
      employeeCount,
      filters,
      globalEmployeeSearch,
      toast,
      punchesByEmployee,
      saveHolidays,
      saveCompanyHolidays,
      saveShifts,
      saveScanPairs,
    ],
  );
  return (
    <Context.Provider value={value}>
      {!loaded ? (
        <main role="status">{t("กำลังโหลดฐานข้อมูล...")}</main>
      ) : error ? (
        <main role="alert">
          {t(error)}
          <button
            className="button"
            onClick={() =>
              refresh()
                .then(() => setError(""))
                .catch((e) => setError(e.message))
            }
          >
            {t("ลองใหม่")}
          </button>
        </main>
      ) : (
        children
      )}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw Error("WorkspaceProvider required");
  return value;
}
