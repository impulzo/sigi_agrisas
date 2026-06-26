/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useInactivityTimer } from "../../../../app/_hooks/useInactivityTimer";

const TIMEOUT = 30 * 60 * 1000; // 30 min

beforeEach(() => {
  jest.useFakeTimers();
  sessionStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
  sessionStorage.clear();
});

describe("useInactivityTimer", () => {
  it("does not fire before timeout", () => {
    const onIdle = jest.fn();
    renderHook(() => useInactivityTimer({ timeoutMs: TIMEOUT, onIdle }));

    act(() => { jest.advanceTimersByTime(TIMEOUT - 1); });
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("fires after timeout with no activity", () => {
    const onIdle = jest.fn();
    renderHook(() => useInactivityTimer({ timeoutMs: TIMEOUT, onIdle }));

    act(() => { jest.advanceTimersByTime(TIMEOUT + 30_001); });
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("fires onIdle only once", () => {
    const onIdle = jest.fn();
    renderHook(() => useInactivityTimer({ timeoutMs: TIMEOUT, onIdle }));

    act(() => { jest.advanceTimersByTime(TIMEOUT + 90_001); });
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("activity resets the timer (mousemove keeps session alive)", () => {
    const onIdle = jest.fn();
    renderHook(() => useInactivityTimer({ timeoutMs: TIMEOUT, onIdle }));

    // simulate activity every 5 minutes for 2 hours
    for (let i = 0; i < 24; i++) {
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000 + 3_000); // 5 min + 3s to pass throttle
        window.dispatchEvent(new Event("mousemove"));
      });
    }
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("throttle: rapid events update sessionStorage only once per 2s", () => {
    const onIdle = jest.fn();
    renderHook(() => useInactivityTimer({ timeoutMs: TIMEOUT, onIdle }));

    const setItemSpy = jest.spyOn(Storage.prototype, "setItem");

    act(() => {
      for (let i = 0; i < 50; i++) {
        window.dispatchEvent(new Event("mousemove"));
      }
    });

    const activityUpdates = setItemSpy.mock.calls.filter(([k]) => k === "lastActivityAt");
    // within 0ms all 50 events fire but throttle allows only 1
    expect(activityUpdates.length).toBeLessThanOrEqual(2); // init + at most 1 throttled update
    setItemSpy.mockRestore();
  });

  it("cleanup removes listeners", () => {
    const onIdle = jest.fn();
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useInactivityTimer({ timeoutMs: TIMEOUT, onIdle }));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalled();
    removeEventListenerSpy.mockRestore();
  });

  it("onActivity called when throttled activity fires", () => {
    const onIdle = jest.fn();
    const onActivity = jest.fn();
    renderHook(() => useInactivityTimer({ timeoutMs: TIMEOUT, onIdle, onActivity }));

    act(() => {
      jest.advanceTimersByTime(2001); // > THROTTLE_MS (2000)
      window.dispatchEvent(new Event("mousemove"));
    });

    expect(onActivity).toHaveBeenCalledTimes(1);
    expect(onActivity).toHaveBeenCalledWith(expect.any(Number));
  });

  it("onActivity not called for events within throttle window", () => {
    const onIdle = jest.fn();
    const onActivity = jest.fn();
    renderHook(() => useInactivityTimer({ timeoutMs: TIMEOUT, onIdle, onActivity }));

    act(() => {
      // fire 3 events rapidly (within 2s throttle)
      window.dispatchEvent(new Event("keydown"));
      window.dispatchEvent(new Event("keydown"));
      window.dispatchEvent(new Event("keydown"));
    });

    expect(onActivity).toHaveBeenCalledTimes(0);
  });

  it("cross-tab activity: updating sessionStorage.lastActivityAt resets the timer", () => {
    const onIdle = jest.fn();
    renderHook(() => useInactivityTimer({ timeoutMs: TIMEOUT, onIdle }));

    // advance almost to timeout
    act(() => { jest.advanceTimersByTime(TIMEOUT - 1_000); });
    expect(onIdle).not.toHaveBeenCalled();

    // simulate another tab broadcasting activity (SessionLifecycleProvider writes sessionStorage)
    sessionStorage.setItem("lastActivityAt", String(Date.now()));

    // advance past original timeout — timer should NOT fire because lastActivityAt was reset
    act(() => { jest.advanceTimersByTime(32_000); });
    expect(onIdle).not.toHaveBeenCalled();
  });
});
