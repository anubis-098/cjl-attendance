export function auditChanges(before: string, after: string) {
  const parse = (value: string): unknown => {
    if (!value) return undefined;
    try { return JSON.parse(value); } catch { return value; }
  };
  const result: { field: string; before: unknown; after: unknown }[] = [];
  const object = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  function compare(a: unknown, b: unknown, path: string) {
    if (object(a) || object(b)) {
      const left = object(a) ? a : {}, right = object(b) ? b : {};
      const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])];
      if (keys.length && (object(a) || a == null) && (object(b) || b == null)) {
        for (const key of keys) compare(left[key], right[key], path ? `${path}.${key}` : key);
        return;
      }
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) result.push({ field: path || "value", before: a, after: b });
  }
  compare(parse(before), parse(after), "");
  return result;
}
