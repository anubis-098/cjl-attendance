import * as XLSX from "xlsx";
import { OT_RATES, type OTRate } from "./engine";
import type { PayrollRate } from "./payroll";
export async function readPayrollRates(file: File) {
  if (file.size > 10 * 1024 * 1024) throw Error("ไฟล์ต้องไม่เกิน 10 MB");
  const book = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    cellFormula: true,
  });
  const sheet = book.Sheets["3) Time Attendance From Agency"];
  if (!sheet) throw Error("ไม่พบชีต 3) Time Attendance From Agency");
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  if (range.e.r > 10000 || range.e.c > 250) throw Error("ขนาดชีตเกินกำหนด");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
  });
  const header = rows.findIndex(
    (r) => r[0] === "Employee ID" && r[1] === "Display Name",
  );
  if (header < 0) throw Error("ไม่พบหัวตาราง Employee ID / Display Name");
  const num = (v: unknown) => {
    const n = Number(
      String(v ?? "")
        .replace(/,/g, "")
        .trim(),
    );
    return v !== "" && v != null && Number.isFinite(n) && n > 0 ? n : null;
  };
  const output: PayrollRate[] = [],
    seen = new Set<string>();
  for (let r = header + 1; r < rows.length; r++) {
    const values = rows[r],
      id = String(values[0] || "").trim(),
      name = String(values[1] || "").trim();
    if (!id || !name) continue;
    if (seen.has(id)) throw Error(`รหัสพนักงานซ้ำ ${id} กรุณาตรวจสอบไฟล์`);
    seen.add(id);
    const warnings: string[] = [];
    const rates = Object.fromEntries(
      OT_RATES.map((rate, index) => {
        const c = 13 + index * 2;
        const formula = sheet[XLSX.utils.encode_cell({ r, c })]?.f || "";
        // Only accept the workbook's explicit hours-column times numeric rate formula.
        const escaped =
          rate === "1.0"
            ? "1"
            : rate === "2.0"
              ? "2"
              : rate === "3.0"
                ? "3"
                : "1\\.5";
        const direct = new RegExp(
          `^Time_Attendance\\[\\[#This Row\\],\\[${escaped}\\]\\]\\s*\\*\\s*(\\d+(?:\\.\\d+)?)$`,
        );
        const cleaned = formula
          .replace(/^IFERROR\(\s*/, "")
          .replace(/,\s*""\s*\)$/, "")
          .trim();
        const match = cleaned.match(direct);
        const value = match ? num(match[1]) : null;
        if (value == null) warnings.push(`x${rate}: ไม่พบสูตรอัตราที่อ่านได้`);
        return [rate, value];
      }),
    ) as Record<OTRate, number | null>;
    if (
      rates["1.0"] &&
      rates["1.5"] &&
      Math.abs(rates["1.0"] * 1.5 - rates["1.5"]) > 0.05
    )
      warnings.push("อัตรา x1.0 ไม่สัมพันธ์กับ x1.5 กรุณาตรวจสอบสูตรต้นทาง");
    output.push({
      id,
      name,
      dailyWage: num(values[29]),
      holidayWage: num(values[26]),
      rates,
      row: r + 1,
      warnings,
    });
  }
  if (!output.length) throw Error("ไม่พบข้อมูลอัตราพนักงาน");
  return output;
}
