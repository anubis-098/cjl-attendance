export type AttendanceEvidence = {
  id: string;
  filename: string;
  content_type: string;
  file_size: number;
  source: "employee" | "supervisor";
  provider_name: string;
  note: string;
  created_at: string;
};
export const EVIDENCE_MAX_SIZE = 5 * 1024 * 1024;
export function validEvidenceDate(date: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date
  );
}
export function evidenceContentType(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > EVIDENCE_MAX_SIZE)
    throw Error("ไฟล์ต้องมีขนาดไม่เกิน 5 MB");
  const starts = (values: number[], at = 0) =>
    values.every((v, i) => bytes[at + i] === v);
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([137, 80, 78, 71, 13, 10, 26, 10])) return "image/png";
  if (starts([82, 73, 70, 70]) && starts([87, 69, 66, 80], 8))
    return "image/webp";
  if (starts([37, 80, 68, 70, 45])) return "application/pdf";
  throw Error("รองรับเฉพาะรูป JPG, PNG, WebP และ PDF");
}
