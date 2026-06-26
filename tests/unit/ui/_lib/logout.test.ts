/**
 * @jest-environment jsdom
 */

jest.mock("../../../../app/_lib/session/refreshScheduler", () => ({
  cancel: jest.fn(),
  schedule: jest.fn(),
  _getDelay: jest.fn(),
}));

import { logoutClient, __setNavigate } from "../../../../app/_lib/logout";
import { cancel as cancelScheduler } from "../../../../app/_lib/session/refreshScheduler";

const navigateMock = jest.fn();

beforeAll(() => {
  __setNavigate(navigateMock);
});

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  sessionStorage.setItem("accessToken", "tok");
  sessionStorage.setItem("lastActivityAt", "12345");
  global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
});

describe("logoutClient", () => {
  it("cancels the scheduler", async () => {
    await logoutClient("manual");
    expect(cancelScheduler).toHaveBeenCalled();
  });

  it("clears sessionStorage", async () => {
    await logoutClient("manual");
    expect(sessionStorage.getItem("accessToken")).toBeNull();
    expect(sessionStorage.getItem("lastActivityAt")).toBeNull();
  });

  it("reason=manual → /auth/login (no query)", async () => {
    await logoutClient("manual");
    expect(navigateMock).toHaveBeenCalledWith("/auth/login");
  });

  it("reason=inactivity → /auth/login?reason=inactivity", async () => {
    await logoutClient("inactivity");
    expect(navigateMock).toHaveBeenCalledWith("/auth/login?reason=inactivity");
  });

  it("reason=session_lost → /auth/login?reason=session_lost", async () => {
    await logoutClient("session_lost");
    expect(navigateMock).toHaveBeenCalledWith("/auth/login?reason=session_lost");
  });

  it("no reason → /auth/login (no query)", async () => {
    await logoutClient();
    expect(navigateMock).toHaveBeenCalledWith("/auth/login");
  });

  it("network error on POST does not block redirect", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("network"));
    await logoutClient("manual");
    expect(navigateMock).toHaveBeenCalledWith("/auth/login");
  });
});
