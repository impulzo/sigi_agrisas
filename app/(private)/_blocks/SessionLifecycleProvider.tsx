"use client";

import { useEffect, useRef } from "react";
import {
  schedule,
  cancel,
  scheduleBase,
  setScheduleOverride,
  refreshNow,
} from "../../_lib/session/refreshScheduler";
import { setAccessToken, getAccessToken, clearAccessToken } from "../../_lib/session/accessToken";
import { setLastActivityAt, clearLastActivityAt } from "../../_lib/session/lastActivity";
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
    const token = getAccessToken();

    // Sin BroadcastChannel no hay coordinación entre pestañas: cada pestaña se vale sola.
    if (typeof BroadcastChannel === "undefined") {
      if (token) {
        schedule(token);
      } else {
        refreshNow();
      }
      return;
    }

    const channel = new BroadcastChannel("agrisas-auth");
    channelRef.current = channel;
    setLogoutChannel(channel);

    // Elección de líder: sólo una pestaña ejecuta `run`; las demás esperan su broadcast
    // "refreshed" y sólo corren `run` ellas mismas si el líder no responde en 5 s (crash).
    function runElected(run: (onDone: (token: string) => void) => void): void {
      claimRefreshLeadership(channel, TAB_ID).then((isLeader) => {
        const onDone = (refreshedToken: string) => {
          channel.postMessage({ type: "refreshed", accessToken: refreshedToken });
        };
        if (isLeader) {
          run(onDone);
          return;
        }
        let settled = false;
        const fallbackTimer = setTimeout(() => {
          if (settled) return;
          settled = true;
          run(onDone);
        }, 5_000);
        function onceRefreshed(evt: MessageEvent<AuthMessage>) {
          if (evt.data.type !== "refreshed") return;
          settled = true;
          clearTimeout(fallbackTimer);
          channel.removeEventListener("message", onceRefreshed);
        }
        channel.addEventListener("message", onceRefreshed);
      });
    }

    // Override schedule with leader-election wrapper — avoids mutating the ES module namespace
    setScheduleOverride((newToken: string, cb?: (t: string) => void) => {
      runElected((onDone) => {
        scheduleBase(newToken, (refreshedToken: string) => {
          onDone(refreshedToken);
          cb?.(refreshedToken);
        });
      });
    });

    if (token) {
      schedule(token);
    } else {
      // Bootstrap en frío: pestaña nueva/reload sin accessToken en memoria pero con
      // cookie refreshToken válida (por eso el Server Component ya renderizó autenticado).
      runElected((onDone) => { refreshNow(onDone); });
    }

    channel.onmessage = (evt: MessageEvent<AuthMessage>) => {
      const msg = evt.data;

      if (msg.type === "refreshed" && msg.accessToken) {
        setAccessToken(msg.accessToken);
        // Non-leaders reschedule directly via base to avoid re-entering election
        scheduleBase(msg.accessToken);
      }

      if (msg.type === "activity" && msg.at) {
        setLastActivityAt(msg.at);
      }

      if (msg.type === "logged-out") {
        if (typeof window !== "undefined") {
          clearAccessToken();
          clearLastActivityAt();
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
