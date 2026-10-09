export function employeeCalendarHref(id: string, date?: string, name?: string) {
  const query = new URLSearchParams();
  if (date) query.set("month", date.slice(0, 7));
  if (name) query.set("name", name);
  return `/employees/${encodeURIComponent(id)}/calendar?${query}`;
}
