"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useCurrentUser } from "../../_hooks/useCurrentUser";
import { useOnlineStatus } from "../../_lib/offline/connectivity";
import { resolveBranchScope, fixWorkingBranch as fixWorkingBranchLib } from "../../_lib/offline/branchScope";
import { refreshCatalogCache, getCatalogStalenessMs, AUTO_REFRESH_MIN_INTERVAL_MS } from "../../_lib/offline/catalogCache";
import { countPending } from "../../_lib/offline/outbox";
import { runSyncPass, startAutoSync, onSyncChange, isSyncing } from "../../_lib/offline/syncEngine";

interface OfflineSyncContextValue {
  isOnline: boolean;
  offlineEnabled: boolean;
  ownerBranchId: string | null;
  blockedByPendingOutbox: boolean;
  pendingCount: number;
  syncing: boolean;
  catalogStalenessMs: number | null;
  refreshCatalogNow: () => Promise<void>;
  fixWorkingBranch: (branchId: string) => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

export function useOfflineSync(): OfflineSyncContextValue {
  const ctx = useContext(OfflineSyncContext);
  if (!ctx) {
    throw new Error("useOfflineSync must be used within OfflineSyncProvider");
  }
  return ctx;
}

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const online = useOnlineStatus();
  const { branchId, isLoading: userLoading, can } = useCurrentUser();
  const bypass = can("branches:access_all");

  const [ownerBranchId, setOwnerBranchId] = useState<string | null>(null);
  const [offlineEnabled, setOfflineEnabled] = useState(false);
  const [blockedByPendingOutbox, setBlockedByPendingOutbox] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(isSyncing());
  const [catalogStalenessMs, setCatalogStalenessMs] = useState<number | null>(null);

  const refreshPendingCount = useCallback(async (branch: string | null) => {
    if (!branch) {
      setPendingCount(0);
      return;
    }
    setPendingCount(await countPending(branch));
  }, []);

  const refreshStaleness = useCallback(async () => {
    setCatalogStalenessMs(await getCatalogStalenessMs());
  }, []);

  // Resolve/track the offline session's owner branch whenever the logged-in
  // user's session branch (or bypass status) changes.
  useEffect(() => {
    if (userLoading || bypass === "loading") return;
    let cancelled = false;

    resolveBranchScope(branchId, bypass === true).then(async (resolution) => {
      if (cancelled) return;
      setOwnerBranchId(resolution.ownerBranchId);
      setOfflineEnabled(resolution.offlineEnabled);
      setBlockedByPendingOutbox(resolution.blockedByPendingOutbox);
      await refreshPendingCount(resolution.ownerBranchId);
      await refreshStaleness();
    });

    return () => {
      cancelled = true;
    };
  }, [branchId, bypass, userLoading, refreshPendingCount, refreshStaleness]);

  // Opportunistic catalog refresh while online: on becoming enabled, and every
  // ~10 minutes thereafter, plus whenever the tab regains visibility.
  useEffect(() => {
    if (!offlineEnabled || !ownerBranchId) return;

    let cancelled = false;
    const tryRefresh = async () => {
      if (!navigator.onLine) return;
      const staleness = await getCatalogStalenessMs();
      if (staleness !== null && staleness < AUTO_REFRESH_MIN_INTERVAL_MS) return;
      refreshCatalogCache(ownerBranchId)
        .then(async () => {
          if (!cancelled) await refreshStaleness();
        })
        .catch(() => {
          /* offline mid-refresh — cache keeps its previous contents */
        });
    };

    tryRefresh();
    const interval = setInterval(tryRefresh, 10 * 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tryRefresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [offlineEnabled, ownerBranchId, refreshStaleness]);

  // Auto-sync the outbox on reconnect for the resolved owner branch.
  useEffect(() => {
    if (!offlineEnabled || !ownerBranchId) return;
    const stop = startAutoSync(ownerBranchId);
    return stop;
  }, [offlineEnabled, ownerBranchId]);

  // Track sync engine state (syncing flag + pending count) for the badge/UI.
  useEffect(() => {
    return onSyncChange(() => {
      setSyncing(isSyncing());
      void refreshPendingCount(ownerBranchId);
    });
  }, [ownerBranchId, refreshPendingCount]);

  const refreshCatalogNow = useCallback(async () => {
    if (!ownerBranchId) return;
    await refreshCatalogCache(ownerBranchId);
    await refreshStaleness();
  }, [ownerBranchId, refreshStaleness]);

  const fixWorkingBranch = useCallback(
    async (targetBranchId: string) => {
      await fixWorkingBranchLib(targetBranchId);
      const resolution = await resolveBranchScope(branchId, bypass === true);
      setOwnerBranchId(resolution.ownerBranchId);
      setOfflineEnabled(resolution.offlineEnabled);
      setBlockedByPendingOutbox(resolution.blockedByPendingOutbox);
      await refreshPendingCount(resolution.ownerBranchId);
    },
    [branchId, bypass, refreshPendingCount]
  );

  useEffect(() => {
    if (online && ownerBranchId) void runSyncPass(ownerBranchId);
  }, [online, ownerBranchId]);

  return (
    <OfflineSyncContext.Provider
      value={{
        isOnline: online,
        offlineEnabled,
        ownerBranchId,
        blockedByPendingOutbox,
        pendingCount,
        syncing,
        catalogStalenessMs,
        refreshCatalogNow,
        fixWorkingBranch,
      }}
    >
      {children}
    </OfflineSyncContext.Provider>
  );
}
