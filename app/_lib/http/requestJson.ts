import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../authFetch";

/**
 * Centraliza el patrón fetch + normalización de error + parseo JSON repetido
 * en los servicios de `_logic/services/`. No swallowea errores: el caller
 * decide si los propaga o los captura (p. ej. para fallar en silencio en un
 * quick-picker de búsqueda).
 */
export async function requestJson<T>(
  url: string,
  fetchImpl: typeof authFetch = authFetch,
  init?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetchImpl(url, init);
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    if ((err as Error).name === "AbortError") throw err;
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return (await res.json()) as T;
}
