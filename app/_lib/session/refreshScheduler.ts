import { decodeJwtPayload } from "../jwt";
import { setAccessToken } from "./accessToken";

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
  await refreshNow();
}

/** Refresca inmediatamente (sin esperar el timer). Usado por el scheduler y por el bootstrap en frío. */
export async function refreshNow(onRefreshed?: OnRefreshed): Promise<string | null> {
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      // refresh failed — let authFetch handle the 401 path
      return null;
    }
    const { accessToken } = (await res.json()) as { accessToken: string };
    setAccessToken(accessToken);
    onRefreshedCallback?.(accessToken);
    onRefreshed?.(accessToken);
    schedule(accessToken);
    return accessToken;
  } catch {
    // network error — silent; authFetch will handle 401s defensively
    return null;
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
