const LAST_ACTIVITY_KEY = "lastActivityAt";

export function setLastActivityAt(at: number): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(LAST_ACTIVITY_KEY, String(at)); } catch {}
}

export function clearLastActivityAt(): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(LAST_ACTIVITY_KEY); } catch {}
}
