export function normalizeWorkerType(value: unknown): string | undefined {
  const type = String(value ?? "").trim().toUpperCase();
  return type === "THAI" ? "Thai" : type === "AEC" ? "AEC" : undefined;
}
