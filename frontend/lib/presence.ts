export function isUserOnline(value: unknown): boolean {
  // be resilient to booleans, numeric flags, and string values from API
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === "string") {
    const v = value.toLowerCase().trim();
    return v === "true" || v === "1";
  }
  if (typeof value === "number") return value === 1;
  return false;
}

export function formatLastSeen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const ts = new Date(iso);
    if (Number.isNaN(ts.getTime())) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - ts.getTime()) / 1000);
    if (diff < 60) return "Last seen just now";
    if (diff < 3600) return `Last seen ${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `Last seen ${Math.floor(diff / 3600)}h ago`;
    return ts.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return null;
  }
}
