import { cancel as cancelScheduler } from "./session/refreshScheduler";

export type LogoutReason = "inactivity" | "session_lost" | "manual";

let channel: BroadcastChannel | null = null;

export function setLogoutChannel(ch: BroadcastChannel | null): void {
  channel = ch;
}

// Overridable for tests (window.location.assign is read-only in jsdom)
let _navigate: (url: string) => void = (url) => {
  if (typeof window !== "undefined") window.location.assign(url);
};
export function __setNavigate(fn: (url: string) => void): void {
  _navigate = fn;
}

export async function logoutClient(reason?: LogoutReason): Promise<void> {
  cancelScheduler();

  try {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    // best-effort
  }

  channel?.postMessage({ type: "logged-out", reason });

  if (typeof window !== "undefined") {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("lastActivityAt");
  }

  const query = reason && reason !== "manual" ? `?reason=${reason}` : "";
  _navigate(`/auth/login${query}`);
}
