/**
 * @jest-environment jsdom
 */
import { claimRefreshLeadership } from "../../../../app/_lib/session/claimRefreshLeadership";

// Minimal BroadcastChannel stub that lets tests inject messages manually
function makeMockChannel() {
  const listeners: Array<(evt: MessageEvent) => void> = [];
  const sent: unknown[] = [];

  const channel = {
    postMessage(data: unknown) {
      sent.push(data);
    },
    addEventListener(_type: string, listener: (evt: MessageEvent) => void) {
      listeners.push(listener);
    },
    removeEventListener(_type: string, listener: (evt: MessageEvent) => void) {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    },
    /** Simulate an incoming message from another tab */
    receive(data: unknown) {
      const evt = { data } as MessageEvent;
      listeners.forEach((l) => l(evt));
    },
  };

  return { channel, sent };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("claimRefreshLeadership", () => {
  it("wins when no challenger arrives within 100 ms", async () => {
    const { channel } = makeMockChannel();
    const promise = claimRefreshLeadership(channel, "tab-a");
    jest.advanceTimersByTime(100);
    expect(await promise).toBe(true);
  });

  it("emits claim-refresh message with own tabId and at", async () => {
    const { channel, sent } = makeMockChannel();
    const before = Date.now();
    const promise = claimRefreshLeadership(channel, "tab-a");
    jest.advanceTimersByTime(100);
    await promise;
    expect(sent).toHaveLength(1);
    const msg = sent[0] as { type: string; tabId: string; at: number };
    expect(msg.type).toBe("claim-refresh");
    expect(msg.tabId).toBe("tab-a");
    expect(msg.at).toBeGreaterThanOrEqual(before);
  });

  it("loses when challenger has lower at", async () => {
    const { channel } = makeMockChannel();
    const promise = claimRefreshLeadership(channel, "tab-b");
    // Challenger with earlier timestamp wins
    channel.receive({ type: "claim-refresh", tabId: "tab-a", at: Date.now() - 1 });
    expect(await promise).toBe(false);
  });

  it("loses when challenger has same at but lexicographically smaller tabId", async () => {
    const now = Date.now();
    const { channel } = makeMockChannel();
    const promise = claimRefreshLeadership(channel, "tab-b");
    channel.receive({ type: "claim-refresh", tabId: "tab-a", at: now });
    expect(await promise).toBe(false);
  });

  it("wins when challenger has higher at", async () => {
    const { channel } = makeMockChannel();
    const promise = claimRefreshLeadership(channel, "tab-a");
    channel.receive({ type: "claim-refresh", tabId: "tab-b", at: Date.now() + 999 });
    jest.advanceTimersByTime(100);
    expect(await promise).toBe(true);
  });

  it("wins when challenger has same at but larger tabId", async () => {
    const now = Date.now();
    const { channel } = makeMockChannel();
    const promise = claimRefreshLeadership(channel, "tab-a");
    channel.receive({ type: "claim-refresh", tabId: "tab-z", at: now });
    jest.advanceTimersByTime(100);
    expect(await promise).toBe(true);
  });

  it("ignores non-claim-refresh messages", async () => {
    const { channel } = makeMockChannel();
    const promise = claimRefreshLeadership(channel, "tab-a");
    channel.receive({ type: "refreshed", accessToken: "tok" });
    channel.receive({ type: "logged-out", reason: "inactivity" });
    jest.advanceTimersByTime(100);
    expect(await promise).toBe(true);
  });
});
