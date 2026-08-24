import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../authFetch";
import { claimRefreshLeadership } from "../session/claimRefreshLeadership";
import { subscribeConnectivity, isOnline } from "./connectivity";
import {
  listOutboxSales,
  listOutboxQuotes,
  markSyncing,
  markSynced,
  markTransientFailure,
  markBusinessFailure,
} from "./outbox";
import type { OutboxSaleRecord, OutboxQuoteRecord } from "./db";

const SYNC_CHANNEL_NAME = "agrisas-sync";
const BACKOFF_STEPS_MS = [5_000, 15_000, 60_000, 5 * 60_000, 30 * 60_000];
const TAB_ID = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tab-${Date.now()}`;

function backoffFor(attempts: number): number {
  const step = BACKOFF_STEPS_MS[Math.min(attempts, BACKOFF_STEPS_MS.length - 1)];
  return Date.now() + step;
}

function folioLabel(dto: { folioPrefix?: string | null; folioNumber: number }): string {
  return dto.folioPrefix ? `${dto.folioPrefix}-${dto.folioNumber}` : String(dto.folioNumber);
}

export type SyncListener = () => void;

let listeners: Set<SyncListener> = new Set();
let syncing = false;

function notifyChange(): void {
  for (const l of listeners) l();
}

export function onSyncChange(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function syncOne(
  storeName: "outboxSales" | "outboxQuotes",
  record: OutboxSaleRecord | OutboxQuoteRecord
): Promise<void> {
  const url = storeName === "outboxSales" ? "/api/v1/admin/sales" : "/api/v1/admin/quotes";
  await markSyncing(storeName, record.clientRequestId);
  notifyChange();

  try {
    const res = await authFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record.payload),
    });

    if (res.ok) {
      const dto = (await res.json()) as { id: string; folioNumber: number; folioPrefix?: string | null };
      await markSynced(storeName, record.clientRequestId, dto.id, folioLabel(dto));
      return;
    }

    if (res.status >= 500) {
      const errBody = await res.json().catch(() => ({ error: "Server error" }));
      await markTransientFailure(
        storeName,
        record.clientRequestId,
        record.attempts + 1,
        backoffFor(record.attempts + 1),
        { code: `http_${res.status}`, message: errBody.error ?? "Server error", httpStatus: res.status }
      );
      return;
    }

    // 4xx: business-rule rejection — not auto-retried.
    const errBody = await res.json().catch(() => ({ error: "Rejected" }));
    await markBusinessFailure(storeName, record.clientRequestId, {
      code: `http_${res.status}`,
      message: errBody.error ?? "Rejected",
      httpStatus: res.status,
    });
  } catch (err) {
    if (err instanceof NetworkError) {
      await markTransientFailure(
        storeName,
        record.clientRequestId,
        record.attempts + 1,
        backoffFor(record.attempts + 1),
        { code: "network_error", message: "Sin conexión" }
      );
      throw err; // stop draining this pass — connectivity is genuinely down
    }
    if (err instanceof UnauthenticatedError) {
      await markTransientFailure(
        storeName,
        record.clientRequestId,
        record.attempts + 1,
        backoffFor(record.attempts + 1),
        { code: "unauthenticated", message: "Sesión expirada" }
      );
      throw err; // stop draining — needs re-auth before continuing
    }
    if (err instanceof ForbiddenError) {
      await markBusinessFailure(storeName, record.clientRequestId, {
        code: "forbidden",
        message: "Sin permiso para sincronizar este elemento",
      });
      return;
    }
    throw err;
  } finally {
    notifyChange();
  }
}

function isRetriable(record: OutboxSaleRecord | OutboxQuoteRecord): boolean {
  if (record.status === "synced") return false;
  if (record.status === "failed") return false; // business failures never auto-retry
  if (record.nextRetryAt !== null && record.nextRetryAt > Date.now()) return false;
  return true;
}

async function drainStore(ownerBranchId: string, storeName: "outboxSales" | "outboxQuotes"): Promise<void> {
  const list =
    storeName === "outboxSales"
      ? await listOutboxSales(ownerBranchId)
      : await listOutboxQuotes(ownerBranchId);

  for (const record of list) {
    if (!isRetriable(record)) continue;
    await syncOne(storeName, record); // throws on transient failure, stopping this pass
  }
}

/**
 * Runs one drain pass over both outbox queues for `ownerBranchId`, after
 * winning tab leadership via the same BroadcastChannel claim pattern used
 * for token refresh. Safe to call repeatedly — a no-op if already syncing,
 * offline, or another tab currently holds leadership.
 */
export async function runSyncPass(ownerBranchId: string): Promise<void> {
  if (syncing) return;
  if (!isOnline()) return;

  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    try {
      const isLeader = await claimRefreshLeadership(channel, TAB_ID);
      if (!isLeader) return;
    } finally {
      channel.close();
    }
  }

  syncing = true;
  notifyChange();
  try {
    await drainStore(ownerBranchId, "outboxSales");
    await drainStore(ownerBranchId, "outboxQuotes");
  } catch {
    // A transient failure already recorded itself on the item; stop this pass.
  } finally {
    syncing = false;
    notifyChange();
  }
}

export function isSyncing(): boolean {
  return syncing;
}

/**
 * Wires automatic sync passes to connectivity changes for `ownerBranchId`.
 * Returns an unsubscribe function. Meant to be called once from
 * `OfflineSyncProvider` for the resolved owner branch.
 */
export function startAutoSync(ownerBranchId: string): () => void {
  const unsubscribe = subscribeConnectivity((online) => {
    if (online) void runSyncPass(ownerBranchId);
  });
  if (isOnline()) void runSyncPass(ownerBranchId);
  return unsubscribe;
}

/** Test-only: resets module-level sync state between test cases. */
export function resetSyncEngineForTests(): void {
  listeners = new Set();
  syncing = false;
}
