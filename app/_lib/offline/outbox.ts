import { getOfflineDb, OutboxSaleRecord, OutboxQuoteRecord, OutboxStatus, OutboxErrorInfo } from "./db";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for environments without crypto.randomUUID (older browsers/test runners).
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function makeProvisionalCode(clientRequestId: string): string {
  return `OFFLINE-${clientRequestId.slice(0, 8).toUpperCase()}`;
}

interface EnqueueParams<TPayload> {
  ownerBranchId: string;
  payload: TPayload;
  localTotal: number;
}

async function enqueue<TPayload>(
  storeName: "outboxSales" | "outboxQuotes",
  { ownerBranchId, payload, localTotal }: EnqueueParams<TPayload>
): Promise<OutboxSaleRecord | OutboxQuoteRecord> {
  const clientRequestId = generateId();
  const record: OutboxSaleRecord | OutboxQuoteRecord = {
    clientRequestId,
    ownerBranchId,
    createdAt: Date.now(),
    status: "pending",
    attempts: 0,
    nextRetryAt: null,
    lastError: null,
    payload: { ...(payload as Record<string, unknown>), clientRequestId },
    localTotal,
    provisionalCode: makeProvisionalCode(clientRequestId),
    serverId: null,
    serverFolioCode: null,
  };
  const db = await getOfflineDb();
  await db.put(storeName, record);
  return record;
}

export function enqueueSale(params: EnqueueParams<Record<string, unknown>>): Promise<OutboxSaleRecord> {
  return enqueue("outboxSales", params) as Promise<OutboxSaleRecord>;
}

export function enqueueQuote(params: EnqueueParams<Record<string, unknown>>): Promise<OutboxQuoteRecord> {
  return enqueue("outboxQuotes", params) as Promise<OutboxQuoteRecord>;
}

async function listByBranch<T extends OutboxSaleRecord | OutboxQuoteRecord>(
  storeName: "outboxSales" | "outboxQuotes",
  ownerBranchId: string
): Promise<T[]> {
  const db = await getOfflineDb();
  const all = (await db.getAllFromIndex(storeName, "ownerBranchId", ownerBranchId)) as T[];
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export function listOutboxSales(ownerBranchId: string): Promise<OutboxSaleRecord[]> {
  return listByBranch("outboxSales", ownerBranchId);
}

export function listOutboxQuotes(ownerBranchId: string): Promise<OutboxQuoteRecord[]> {
  return listByBranch("outboxQuotes", ownerBranchId);
}

async function updateRecord(
  storeName: "outboxSales" | "outboxQuotes",
  clientRequestId: string,
  patch: Partial<OutboxSaleRecord | OutboxQuoteRecord>
): Promise<void> {
  const db = await getOfflineDb();
  const existing = await db.get(storeName, clientRequestId);
  if (!existing) return;
  await db.put(storeName, { ...existing, ...patch });
}

export function markSyncing(storeName: "outboxSales" | "outboxQuotes", clientRequestId: string): Promise<void> {
  return updateRecord(storeName, clientRequestId, { status: "syncing" as OutboxStatus });
}

export function markSynced(
  storeName: "outboxSales" | "outboxQuotes",
  clientRequestId: string,
  serverId: string,
  serverFolioCode: string
): Promise<void> {
  return updateRecord(storeName, clientRequestId, {
    status: "synced" as OutboxStatus,
    serverId,
    serverFolioCode,
    lastError: null,
  });
}

export function markTransientFailure(
  storeName: "outboxSales" | "outboxQuotes",
  clientRequestId: string,
  attempts: number,
  nextRetryAt: number,
  error: OutboxErrorInfo
): Promise<void> {
  return updateRecord(storeName, clientRequestId, {
    status: "pending" as OutboxStatus,
    attempts,
    nextRetryAt,
    lastError: error,
  });
}

export function markBusinessFailure(
  storeName: "outboxSales" | "outboxQuotes",
  clientRequestId: string,
  error: OutboxErrorInfo
): Promise<void> {
  return updateRecord(storeName, clientRequestId, {
    status: "failed" as OutboxStatus,
    lastError: error,
    nextRetryAt: null,
  });
}

/** Manual retry: flips a `failed` (or backed-off `pending`) item back to immediately retriable. */
export async function retryOutboxItem(
  storeName: "outboxSales" | "outboxQuotes",
  clientRequestId: string
): Promise<void> {
  await updateRecord(storeName, clientRequestId, {
    status: "pending" as OutboxStatus,
    nextRetryAt: null,
    lastError: null,
  });
}

export async function discardOutboxItem(
  storeName: "outboxSales" | "outboxQuotes",
  clientRequestId: string
): Promise<void> {
  const db = await getOfflineDb();
  await db.delete(storeName, clientRequestId);
}

export async function updateOutboxPayload(
  storeName: "outboxSales" | "outboxQuotes",
  clientRequestId: string,
  payload: Record<string, unknown>
): Promise<void> {
  await updateRecord(storeName, clientRequestId, {
    payload: { ...payload, clientRequestId },
    status: "pending" as OutboxStatus,
    lastError: null,
    nextRetryAt: null,
  });
}

export async function countPending(ownerBranchId: string): Promise<number> {
  const [sales, quotes] = await Promise.all([
    listOutboxSales(ownerBranchId),
    listOutboxQuotes(ownerBranchId),
  ]);
  const isUnsynced = (r: OutboxSaleRecord | OutboxQuoteRecord) => r.status !== "synced";
  return sales.filter(isUnsynced).length + quotes.filter(isUnsynced).length;
}
