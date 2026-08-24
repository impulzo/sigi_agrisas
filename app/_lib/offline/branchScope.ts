import { getMeta, setMeta, purgeBranchData, getOfflineDb } from "./db";

export interface BranchScopeResolution {
  ownerBranchId: string | null;
  offlineEnabled: boolean;
  /** True when a branch change was detected but blocked because unsynced outbox items exist. */
  blockedByPendingOutbox: boolean;
}

async function hasPendingOutbox(ownerBranchId: string): Promise<boolean> {
  const db = await getOfflineDb();
  for (const storeName of ["outboxSales", "outboxQuotes"] as const) {
    const tx = db.transaction(storeName, "readonly");
    const index = tx.store.index("ownerBranchId");
    let cursor = await index.openCursor(IDBKeyRange.only(ownerBranchId));
    while (cursor) {
      if (cursor.value.status === "pending" || cursor.value.status === "failed") return true;
      cursor = await cursor.continue();
    }
  }
  return false;
}

/**
 * Resolves the offline cache's owner branch against the current login session.
 *
 * - Regular cashier (`sessionBranchId` set): the cache always tracks their
 *   assigned branch automatically.
 * - Bypass user (`sessionBranchId` null, has `branches:access_all`): offline
 *   stays disabled until `fixWorkingBranch` is called explicitly while online.
 *
 * On a branch change, purges the previous owner's cache/outbox — unless that
 * owner still has unsynced (`pending`/`failed`) outbox items, in which case the
 * purge is blocked and the caller must prompt the user to sync or discard first.
 */
export async function resolveBranchScope(
  sessionBranchId: string | null,
  hasBypass: boolean
): Promise<BranchScopeResolution> {
  const meta = await getMeta();

  if (sessionBranchId === null) {
    if (!hasBypass) {
      return { ownerBranchId: null, offlineEnabled: false, blockedByPendingOutbox: false };
    }
    return {
      ownerBranchId: meta.ownerBranchId,
      offlineEnabled: meta.ownerBranchId !== null,
      blockedByPendingOutbox: false,
    };
  }

  if (meta.ownerBranchId === sessionBranchId) {
    return { ownerBranchId: sessionBranchId, offlineEnabled: true, blockedByPendingOutbox: false };
  }

  if (meta.ownerBranchId !== null) {
    const blocked = await hasPendingOutbox(meta.ownerBranchId);
    if (blocked) {
      return { ownerBranchId: meta.ownerBranchId, offlineEnabled: true, blockedByPendingOutbox: true };
    }
    await purgeBranchData(meta.ownerBranchId);
  }

  await setMeta({ ownerBranchId: sessionBranchId, catalogSyncedAt: null });
  return { ownerBranchId: sessionBranchId, offlineEnabled: true, blockedByPendingOutbox: false };
}

/**
 * Explicit action for `branches:access_all` users: fixes a single working
 * branch while online so offline mode becomes available for this session.
 * Throws if switching away from a previous working branch that still has
 * unsynced outbox items.
 */
export async function fixWorkingBranch(branchId: string): Promise<void> {
  const meta = await getMeta();
  if (meta.ownerBranchId && meta.ownerBranchId !== branchId) {
    const blocked = await hasPendingOutbox(meta.ownerBranchId);
    if (blocked) {
      throw new Error(
        "No se puede cambiar de sucursal de trabajo: hay ventas o cotizaciones sin sincronizar."
      );
    }
    await purgeBranchData(meta.ownerBranchId);
  }
  await setMeta({ ownerBranchId: branchId, catalogSyncedAt: null });
}
