import { decodeJwtPayload } from "../jwt";

interface JwtExp {
  exp: number;
}

type OnRefreshed = (newToken: string) => void;

let timerId: ReturnType<typeof setTimeout> | null = null;
let onRefreshedCallback: OnRefreshed | null = null;
let scheduleOverride: ((token: string, onRefreshed?: OnRefreshed) => void) | null = null;

function getDelay(token: string): number {
  const payload = decodeJwtPayload<JwtExp>(token);
  if (!payload?.exp) return 5_000;
  const msUntilExpiry = payload.exp * 1000 - Date.now();
  return Math.max(5_000, msUntilExpiry - 60_000);
}

async function doRefresh(): Promise<void> {
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      // refresh failed — let authFetch handle the 401 path
      return;
    }
    const { accessToken } = (await res.json()) as { accessToken: string };
    if (typeof window !== "undefined") {
      sessionStorage.setItem("accessToken", accessToken);
    }
    onRefreshedCallback?.(accessToken);
    schedule(accessToken);
  } catch {
    // network error — silent; authFetch will handle 401s defensively
  }
}

export function scheduleBase(token: string, onRefreshed?: OnRefreshed): void {
  cancel();
  if (onRefreshed) onRefreshedCallback = onRefreshed;
  const delay = getDelay(token);
  timerId = setTimeout(doRefresh, delay);
}

export function setScheduleOverride(
  fn: ((token: string, onRefreshed?: OnRefreshed) => void) | null
): void {
  scheduleOverride = fn;
}

export function schedule(token: string, onRefreshed?: OnRefreshed): void {
  (scheduleOverride ?? scheduleBase)(token, onRefreshed);
}

export function cancel(): void {
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

export function _getDelay(token: string): number {
  return getDelay(token);
}
