import { guard } from "@/lib/auth";
import {
  readWorkspace,
  stagePunches,
  updateEmployeeStore,
  writeEmployees,
} from "@/lib/database";
import { readEmployeeFile } from "@/lib/master-data";
import { importCJFiles, parseFingerLog } from "@/lib/import-cj";
import { importFiles } from "@/lib/import";
import { prepareMasterImport } from "@/lib/employee-import";
import {
  reopenChangedScans,
  type FingerprintImportSummary,
} from "@/lib/fingerprint-import";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const denied = await guard(false, true);
  if (denied) return denied;
  try {
    if (Number(request.headers.get("content-length")) > 32 * 1024 * 1024)
      throw Error("ไฟล์รวมต้องไม่เกิน 32 MB");
    let fingerprintImport: FingerprintImportSummary | undefined;
    const form = await request.formData(),
      mode = String(form.get("mode"));
    const file = (key: string) => {
      const f = form.get(key);
      if (!(f instanceof File) || !f.size || f.size > 10 * 1024 * 1024)
        throw Error(`กรุณาเลือก ${key} ขนาดไม่เกิน 10 MB`);
      return f;
    };
    if (mode === "employees") {
      const employeeMode = form.get("employeeMode") ?? "replace";
      if (employeeMode !== "replace" && employeeMode !== "merge")
        throw Error("รูปแบบการนำเข้าพนักงานไม่ถูกต้อง");
      const employees = await readEmployeeFile(file("master"));
      if (form.get("previewOnly") === "true") {
        const duplicateRows = employees.reduce((sum, employee) => {
          try { return sum + JSON.parse(employee.source_data.__duplicate_rows || "[]").length; }
          catch { return sum; }
        }, 0);
        return Response.json({ employeePreview: {
          employeeCount: employees.length,
          issueCount: employees.filter(employee => employee.issue).length,
          duplicateRows,
        } });
      }
      await updateEmployeeStore(async (c, state) => {
        await writeEmployees(c, employees, employeeMode);
        const base = prepareMasterImport(
          state.data,
          employees.map((employee) => employee.employee_id),
        );
        await c.query("UPDATE workspace SET data=$1 WHERE id=1", [
          JSON.stringify({
            ...base,
            payrollBooks: state.data.payrollBooks,
            payrollSettings: state.data.payrollSettings,
            employeePayrollSettings: state.data.employeePayrollSettings,
            shiftOverrides: state.data.shiftOverrides,
            audit: [
              ...state.data.audit,
              {
                id: crypto.randomUUID(),
                key: "IMPORT",
                actor: "ผู้ใช้งานเว็บ",
                timestamp: new Date().toISOString(),
                reason:
                  employeeMode === "merge"
                    ? "เพิ่ม/อัปเดต Master โดยเก็บผลตรวจสอบและการยืนยันเวลาเดิมไว้"
                    : "แทนที่รายชื่อพนักงาน โดยเก็บประวัติการตรวจสอบเวลาและการยืนยันเดิมไว้",
                before: "",
                after: String(employees.length),
              },
            ],
          }),
        ]);
      });
    } else if (mode === "fingerprints") {
      const raw = file("raw"),
        parsed = parseFingerLog(await raw.text());
      await updateEmployeeStore(async (c, state) => {
        const current = await readWorkspace();
        const batch = await stagePunches(parsed.punches, raw.name);
        const reviews = reopenChangedScans(current.data, batch.added);
        const changedReviews = Object.keys(state.data.reviews).filter(
          (key) =>
            JSON.stringify(state.data.reviews[key]) !==
            JSON.stringify(reviews[key]),
        );
        fingerprintImport = {
          filename: raw.name,
          added: batch.added.length,
          duplicates: parsed.duplicateScans + batch.skipped,
          total: batch.total,
          from: parsed.punches[0].punch_timestamp,
          to: parsed.punches.at(-1)!.punch_timestamp,
        };
        await c.query(
          "UPDATE workspace SET active_punch_batch=$1,data=$2 WHERE id=1",
          [
            batch.id,
            JSON.stringify({
              ...state.data,
              reviews,
              audit: [
                {
                  id: crypto.randomUUID(),
                  key: "IMPORT",
                  actor: "ผู้ใช้งานเว็บ",
                  timestamp: new Date().toISOString(),
                  reason: "เพิ่มสแกนนิ้ว ข้ามรายการซ้ำ และเก็บข้อมูลเดิม",
                  before: JSON.stringify(
                    Object.fromEntries(
                      changedReviews.map((key) => [
                        key,
                        state.data.reviews[key],
                      ]),
                    ),
                  ),
                  after: JSON.stringify(fingerprintImport),
                },
                ...state.data.audit,
              ],
            }),
          ],
        );
      });
    } else if (mode === "cj" || mode === "standard") {
      const master = file("master"),
        raw = file("raw");
      const report =
        mode === "cj"
          ? await importCJFiles(master, raw, file("attendance"))
          : null;
      const data = report
        ? {
            ...report.data,
            importReport: { issues: report.issues, summary: report.summary },
          }
        : await importFiles(master, raw);
      if (!data.shifts.length) throw Error("ไม่มีกะที่จับคู่ได้");
      const employees =
        mode === "cj"
          ? await readEmployeeFile(master)
          : [...new Map(data.shifts.map((s) => [s.emp_id, s])).values()].map(
              (s, i) => ({
                employee_id: s.emp_id,
                source_row: i + 2,
                source_data: {
                  ลำดับ: String(i + 1),
                  รหัส: s.emp_id,
                  "ชื่อ-นามสกุล": s.emp_name,
                  แผนก: s.department,
                  กะทำงาน: s.shift_code,
                  เวลาทำงาน: `${s.shift_start}-${s.shift_end}`,
                  "First Time": s.shift_start,
                  "Last Time": s.shift_end,
                  Sup: s.agency,
                },
                shift_data: s,
                issue: "",
              }),
            );
      const batch = await stagePunches(data.punches, raw.name);
      const workerTypes = new Map(
        data.shifts
          .filter((s) => s.worker_type)
          .map((s) => [s.emp_id, s.worker_type]),
      );
      for (const employee of employees) {
        const workerType = workerTypes.get(employee.employee_id);
        if (workerType && employee.shift_data)
          employee.shift_data.worker_type = workerType;
      }
      await updateEmployeeStore(async (c, state) => {
        if (employees) await writeEmployees(c, employees);
        await c.query(
          "UPDATE workspace SET active_punch_batch=$1,data=$2 WHERE id=1",
          [
            batch.id,
            JSON.stringify({
              ...data,
              payrollBooks: state.data.payrollBooks,
              payrollSettings: state.data.payrollSettings,
              employeePayrollSettings: state.data.employeePayrollSettings,
              shiftOverrides: state.data.shiftOverrides,
              punches: undefined,
            }),
          ],
        );
      });
    } else throw Error("รูปแบบการนำเข้าไม่ถูกต้อง");
    return Response.json({ ...(await readWorkspace()), fingerprintImport });
  } catch (e) {
    console.error(e);
    return Response.json(
      { error: e instanceof Error ? e.message : "นำเข้าไม่สำเร็จ" },
      { status: 400 },
    );
  }
}
