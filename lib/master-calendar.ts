const WEEKDAYS: Record<string, number> = {
  อาทิตย์: 0,
  จันทร์: 1,
  อังคาร: 2,
  พุธ: 3,
  พฤหัสบดี: 4,
  พฤหัส: 4,
  ศุกร์: 5,
  เสาร์: 6,
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

export function weeklyHolidayDays(value: string | undefined) {
  return [...new Set(
    String(value || "")
      .toLowerCase()
      .replace(/วัน/g, "")
      .split(/[,;/|\s]+/)
      .map((day) => WEEKDAYS[day])
      .filter((day): day is number => day !== undefined),
  )];
}

export function isWeeklyHoliday(value: string | undefined, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weeklyHolidayDays(value).includes(weekday);
}
