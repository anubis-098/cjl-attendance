// Match complete department names only: Inventory Frozen and Asset Dry are distinct.
export function normalizeDepartment(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  const aliases: Record<string, string> = {
    frozen: "Frozen",
    "frozen cdc": "Frozen",
    dry: "Dry",
    "dry food": "Dry",
    dryfood: "Dry",
    seafood: "Seafood",
    saefood: "Seafood",
    "fd-ft": "FD-FT",
    "fd/ft": "FD-FT",
  };
  return Object.hasOwn(aliases, name.toLowerCase())
    ? aliases[name.toLowerCase()]
    : name;
}
