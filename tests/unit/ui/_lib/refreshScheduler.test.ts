/**
 * @jest-environment jsdom
 */
import * as scheduler from "../../../../app/_lib/session/refreshScheduler";
import jwt from "jsonwebtoken";

const SECRET = "test-secret-32chars-long!!!!!!!!";

function makeToken(expiresInSeconds: number): string {
  return jwt.sign({ email: "a@b.com" }, SECRET, {
    expiresIn: expiresInSeconds,
    subject: "u1",
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  scheduler.cancel();
  // mock fetch so doRefresh doesn't throw
  global.fetch = jest.fn().mockResolvedValue({ ok: false } as Response);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  scheduler.cancel();
});

describe("refreshScheduler._getDelay", () => {
  it("returns delay ≈ (exp-60s) for token with 15 min lifetime", () => {
    const token = makeToken(900); // 15 min
    const delay = scheduler._getDelay(token);
    // expect ~840_000ms (14 min), allow ±2s drift
    expect(delay).toBeGreaterThan(838_000);
    expect(delay).toBeLessThan(841_000);
  });

  it("clamps to 5000ms for near-expired token", () => {
    const token = makeToken(30); // 30s
    const delay = scheduler._getDelay(token);
    expect(delay).toBe(5_000);
  });

  it("returns 5000ms for invalid token", () => {
    expect(scheduler._getDelay("not.a.jwt")).toBe(5_000);
  });
});

describe("refreshScheduler.schedule / cancel", () => {
  it("cancel() prevents the timer from firing", () => {
    const token = makeToken(30);
    scheduler.schedule(token);
    scheduler.cancel();
    jest.runAllTimers();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("re-schedule cancels previous timer", () => {
    const token = makeToken(30);
    scheduler.schedule(token);
    scheduler.schedule(token); // re-schedule
    jest.runAllTimers();
    // only one fetch call (from the second schedule)
    expect((global.fetch as jest.Mock).mock.calls.length).toBeLessThanOrEqual(1);
  });
});
