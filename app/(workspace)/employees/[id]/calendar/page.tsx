import EmployeeCalendar from "@/components/workspace/employee-calendar";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string; name?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return (
    <EmployeeCalendar
      employeeId={id}
      initialMonth={query.month}
      name={query.name}
    />
  );
}
