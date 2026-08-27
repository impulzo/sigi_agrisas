import type { TicketPrintJob } from "../types/ticketPrintJob";

export class PrintAgentUnreachableError extends Error {
  constructor(cause?: unknown) {
    super("No se pudo conectar con la impresora");
    this.name = "PrintAgentUnreachableError";
    this.cause = cause;
  }
}

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Sends the ticket print job to the local agent over plain HTTP to
 * localhost/127.0.0.1 (exempt from mixed-content restrictions even on an
 * HTTPS page). Never includes session/auth headers — the payload is only
 * ticket content already visible on screen. No internal retry: a failure
 * always surfaces to the caller so the cashier decides whether to retry or
 * fall back to `window.print()`.
 */
export async function sendTicketPrintJob(
  agentUrl: string,
  job: TicketPrintJob,
  { timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch }: { timeoutMs?: number; fetchImpl?: typeof fetch } = {}
): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${agentUrl.replace(/\/$/, "")}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
      signal: controller.signal,
    });
    if (!res.ok) throw new PrintAgentUnreachableError(`HTTP ${res.status}`);
  } catch (err) {
    if (err instanceof PrintAgentUnreachableError) throw err;
    throw new PrintAgentUnreachableError(err);
  } finally {
    clearTimeout(timeout);
  }
}
