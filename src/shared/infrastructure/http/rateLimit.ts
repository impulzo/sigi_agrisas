const lastHitAt = new Map<string, number>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Rate limit en memoria de proceso, ventana fija por clave (p.ej. `${action}:${userId}`).
 * No sobrevive a un reinicio del proceso ni se comparte entre instancias — suficiente para
 * acotar abuso desde una sesión autenticada, no diseñado para límites cross-instancia.
 */
export function checkRateLimit(key: string, windowMs: number): RateLimitResult {
  const now = Date.now();
  const last = lastHitAt.get(key);

  if (last !== undefined && now - last < windowMs) {
    return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - (now - last)) / 1000) };
  }

  lastHitAt.set(key, now);
  return { allowed: true };
}

/** Sólo para tests: limpia el estado en memoria entre casos que reusan la misma clave. */
export function __resetRateLimitForTests(): void {
  lastHitAt.clear();
}
