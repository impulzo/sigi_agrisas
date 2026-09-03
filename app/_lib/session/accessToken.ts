const ACCESS_TOKEN_EVENT = "agrisas:access-token-changed";

/** Escribe el access token y notifica a hooks montados (ej. useCurrentUser) que deben re-leerlo. */
export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("accessToken", token);
  window.dispatchEvent(new Event(ACCESS_TOKEN_EVENT));
}

export function onAccessTokenChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ACCESS_TOKEN_EVENT, listener);
  return () => window.removeEventListener(ACCESS_TOKEN_EVENT, listener);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("accessToken");
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("accessToken");
  window.dispatchEvent(new Event(ACCESS_TOKEN_EVENT));
}
