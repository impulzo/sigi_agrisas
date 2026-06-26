"use client";

import { useEffect, useRef } from "react";
import {
  schedule,
  cancel,
  scheduleBase,
  setScheduleOverride,
} from "../../_lib/session/refreshScheduler";
import { claimRefreshLeadership } from "../../_lib/session/claimRefreshLeadership";
import { logoutClient, setLogoutChannel } from "../../_lib/logout";
import { useInactivityTimer } from "../../_hooks/useInactivityTimer";

interface AuthMessage {
  type: "refreshed" | "logged-out" | "activity" | "claim-refresh";
  accessToken?: string;
  reason?: string;
  tabId?: string;
  at?: number;
}

// Unique tab identifier for leader election
const TAB_ID = Math.random().toString(36).slice(2);

export function SessionLifecycleProvider({ children }: { children: React.ReactNode }) {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useInactivityTimer({
    onIdle: () => { logoutClient("inactivity").catch(() => {}); },
    onActivity: (at) => { channelRef.current?.postMessage({ type: "activity", at }); },
  });

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? sessionStorage.getItem("accessToken") : null;
    if (token) schedule(token);

    // BroadcastChannel for cross-tab coordination
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("agrisas-auth");
    channelRef.current = channel;
    setLogoutChannel(channel);

    // Override schedule with leader-election wrapper — avoids mutating the ES module namespace
    setScheduleOverride(async (newToken: string, cb?: (t: string) => void) => {
      const isLeader = await claimRefreshLeadership(channel, TAB_ID);
      if (isLeader) {
        scheduleBase(newToken, (refreshedToken: string) => {
          channel.postMessage({ type: "refreshed", accessToken: refreshedToken });
          cb?.(refreshedToken);
        });
        return;
      }
      // Non-leader: give winner 5 s to broadcast "refreshed".
      // If it never arrives (leader crashed), refresh independently.
      let settled = false;
      const fallbackTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        scheduleBase(newToken, (refreshedToken: string) => {
          channel.postMessage({ type: "refreshed", accessToken: refreshedToken });
          cb?.(refreshedToken);
        });
      }, 5_000);

      function onceRefreshed(evt: MessageEvent<AuthMessage>) {
        if (evt.data.type !== "refreshed") return;
        settled = true;
        clearTimeout(fallbackTimer);
        channel.removeEventListener("message", onceRefreshed);
      }
      channel.addEventListener("message", onceRefreshed);
    });

    channel.onmessage = (evt: MessageEvent<AuthMessage>) => {
      const msg = evt.data;

      if (msg.type === "refreshed" && msg.accessToken) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("accessToken", msg.accessToken);
        }
        // Non-leaders reschedule directly via base to avoid re-entering election
        scheduleBase(msg.accessToken);
      }

      if (msg.type === "activity" && msg.at) {
        try { sessionStorage.setItem("lastActivityAt", String(msg.at)); } catch {}
      }

      if (msg.type === "logged-out") {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("accessToken");
          sessionStorage.removeItem("lastActivityAt");
          const query = msg.reason && msg.reason !== "manual" ? `?reason=${msg.reason}` : "";
          window.location.assign(`/auth/login${query}`);
        }
      }
    };

    return () => {
      cancel();
      channel.close();
      channelRef.current = null;
      setLogoutChannel(null);
      setScheduleOverride(null);
    };
  }, []);

  return <>{children}</>;
}
