type ClaimChannel = Pick<
  BroadcastChannel,
  "postMessage" | "addEventListener" | "removeEventListener"
>;

interface ClaimMsg {
  type: string;
  tabId?: string;
  at?: number;
}

/**
 * Leader-election before calling /auth/refresh across tabs.
 * Emits claim-refresh; waits 100 ms. A challenger with a lower (at, tabId)
 * causes this tab to yield. Returns true if this tab wins the right to refresh.
 */
export async function claimRefreshLeadership(
  channel: ClaimChannel,
  tabId: string
): Promise<boolean> {
  const claimAt = Date.now();
  channel.postMessage({ type: "claim-refresh", tabId, at: claimAt });

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      channel.removeEventListener("message", handler);
      resolve(true);
    }, 100);

    function handler(evt: MessageEvent<ClaimMsg>) {
      if (evt.data?.type !== "claim-refresh") return;
      const other = evt.data;
      if (
        other.at !== undefined &&
        (other.at < claimAt ||
          (other.at === claimAt && (other.tabId ?? "") < tabId))
      ) {
        clearTimeout(timeout);
        channel.removeEventListener("message", handler);
        resolve(false);
      }
    }

    channel.addEventListener("message", handler);
  });
}
