export const dayCodeLabels: Record<string, string> = {
  "1": "Work · วันทำงานปกติ",
  PH: "Public Holiday · วันหยุดประจำปี",
  PH8: "มาทำงานวันประเพณี",
  H: "Holiday · วันหยุดประจำสัปดาห์",
  H8: "วันหยุดประจำสัปดาห์แต่มาทำงาน",
  M: "กะเช้า",
  D: "กะเช้าไม่ได้ค่ากะ",
  A: "กะบ่าย",
  N: "กะดึก",
  WOP: "Leave without Pay · ลากิจไม่ได้รับค่าจ้าง",
  PL: "Personal Business Leave · ลากิจ",
  SL: "Sick Leave · ลาป่วย",
  AB: "Absent · ขาดงาน",
  R: "Resign · ลาออก",
};
export function normalizeDayCode(code: string) {
  const value = code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/\.$/, "");
  return (
    ({ "OFF-M": "H", "OFF-D": "H", "OFF-H": "PH" } as Record<string, string>)[
      value
    ] || value
  );
}
export const nonWorkingCodes = new Set(["WOP", "PL", "SL", "AB", "R"]);
export const leaveCodes = ["WOP", "PL", "SL", "AB"] as const;
export const editableDayCodes = ["H", "H8", "PH", "PH8", ...leaveCodes];
