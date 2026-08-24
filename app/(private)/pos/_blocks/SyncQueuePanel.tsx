"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { Chip } from "../../../_components/atoms/Chip/Chip";
import { Button } from "../../../_components/atoms/Button/Button";
import { formatMxCurrency } from "../_logic/lib/formatMxCurrency";
import { useOfflineSync } from "../../_blocks/OfflineSyncProvider";
import { listOutboxSales, listOutboxQuotes, retryOutboxItem, discardOutboxItem, updateOutboxPayload } from "../../../_lib/offline/outbox";
import { runSyncPass, onSyncChange } from "../../../_lib/offline/syncEngine";
import type { OutboxSaleRecord, OutboxQuoteRecord } from "../../../_lib/offline/db";

type Kind = "outboxSales" | "outboxQuotes";
type Item = (OutboxSaleRecord | OutboxQuoteRecord) & { kind: Kind };

const KIND_LABEL: Record<Kind, string> = { outboxSales: "Venta", outboxQuotes: "Cotización" };

function isQuoteExpiryFailure(item: Item): boolean {
  return item.kind === "outboxQuotes" && item.status === "failed" && Boolean(item.lastError?.message?.toLowerCase().includes("expire"));
}

export function SyncQueuePanel() {
  const { ownerBranchId, isOnline } = useOfflineSync();
  const [items, setItems] = useState<Item[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editExpiresAt, setEditExpiresAt] = useState("");

  const refresh = useCallback(async () => {
    if (!ownerBranchId) {
      setItems([]);
      return;
    }
    const [sales, quotes] = await Promise.all([
      listOutboxSales(ownerBranchId),
      listOutboxQuotes(ownerBranchId),
    ]);
    const merged: Item[] = [
      ...sales.map((s) => ({ ...s, kind: "outboxSales" as const })),
      ...quotes.map((q) => ({ ...q, kind: "outboxQuotes" as const })),
    ].sort((a, b) => a.createdAt - b.createdAt);
    setItems(merged);
  }, [ownerBranchId]);

  useEffect(() => {
    void refresh();
    return onSyncChange(() => void refresh());
  }, [refresh]);

  const pendingCount = items.filter((i) => i.status !== "synced").length;

  async function handleRetry(item: Item) {
    await retryOutboxItem(item.kind, item.clientRequestId);
    await refresh();
    if (ownerBranchId) void runSyncPass(ownerBranchId);
  }

  async function handleDiscard(item: Item) {
    await discardOutboxItem(item.kind, item.clientRequestId);
    await refresh();
  }

  function startEdit(item: Item) {
    setEditingId(item.clientRequestId);
    setEditExpiresAt("");
  }

  async function confirmEdit(item: Item) {
    if (!editExpiresAt) return;
    const nextPayload = { ...item.payload, expiresAt: new Date(editExpiresAt).toISOString() };
    await updateOutboxPayload(item.kind, item.clientRequestId, nextPayload);
    setEditingId(null);
    await refresh();
    if (ownerBranchId) void runSyncPass(ownerBranchId);
  }

  if (items.length === 0) {
    return <p className="text-body-sm text-on-surface-variant">No hay ventas ni cotizaciones en cola.</p>;
  }

  return (
    <div className="space-y-3">
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-error-container text-on-error-container px-4 py-2 text-body-sm">
          <Icon name="warning" size={18} />
          <span>
            No cierres ni borres datos de este navegador — {pendingCount} elemento
            {pendingCount === 1 ? "" : "s"} sin sincronizar viven solo en este dispositivo.
          </span>
        </div>
      )}

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={`${item.kind}-${item.clientRequestId}`}
            className="rounded-md border border-outline-variant bg-surface-container-low p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-on-surface truncate">
                  {KIND_LABEL[item.kind]} · <span className="font-mono">{item.serverFolioCode ?? item.provisionalCode}</span>
                </p>
                <p className="text-label-sm text-on-surface-variant">{formatMxCurrency(item.localTotal)}</p>
              </div>
              <StatusChip status={item.status} />
            </div>

            {item.status === "failed" && item.lastError && (
              <p className="mt-2 text-label-sm text-error">{item.lastError.message}</p>
            )}

            {item.status !== "synced" && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {item.status === "failed" && (
                  <Button type="button" variant="text" size="sm" onClick={() => handleRetry(item)} disabled={!isOnline}>
                    Reintentar
                  </Button>
                )}
                {isQuoteExpiryFailure(item) && editingId !== item.clientRequestId && (
                  <Button type="button" variant="text" size="sm" onClick={() => startEdit(item)}>
                    Editar vigencia y reintentar
                  </Button>
                )}
                <Button type="button" variant="text" size="sm" onClick={() => handleDiscard(item)} className="text-error hover:bg-error/10">
                  Descartar
                </Button>
              </div>
            )}

            {editingId === item.clientRequestId && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="rounded-sm border border-outline bg-surface px-2 py-1 text-body-sm text-on-surface"
                />
                <Button type="button" variant="text" size="sm" onClick={() => confirmEdit(item)} disabled={!editExpiresAt}>
                  Guardar y reintentar
                </Button>
                <Button type="button" variant="text" size="sm" onClick={() => setEditingId(null)}>
                  Cancelar
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusChip({ status }: { status: Item["status"] }) {
  switch (status) {
    case "pending":
      return <Chip label="Pendiente" tone="warning" icon="sync" />;
    case "syncing":
      return <Chip label="Sincronizando…" tone="warning" icon="sync" />;
    case "synced":
      return <Chip label="Sincronizado" tone="success" icon="cloud_done" />;
    case "failed":
      return <Chip label="Falló" tone="error" icon="cloud_off" />;
  }
}
