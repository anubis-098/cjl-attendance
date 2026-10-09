export function validateCompanyHolidays(
  month: unknown,
  dates: unknown,
): string[] {
  if (
    typeof month !== "string" ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
    !Array.isArray(dates) ||
    dates.length > 31 ||
    new Set(dates).size !== dates.length ||
    dates.some(
      (d) =>
        typeof d !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
        d.slice(0, 7) !== month ||
        !Number.isFinite(Date.parse(d)) ||
        new Date(d).toISOString().slice(0, 10) !== d,
    )
  )
    throw Error("กรุณาเลือกวันที่ในเดือนเดียวกันให้ถูกต้อง");
  return [...dates].sort();
}
