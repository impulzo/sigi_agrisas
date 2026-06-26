/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useLogout } from "../../../../../../../app/(public)/auth/_logic/hooks/useLogout";

jest.mock("../../../../../../../app/_lib/logout", () => ({
  logoutClient: jest.fn(),
}));

jest.mock("../../../../../../../app/_lib/session/refreshScheduler", () => ({
  cancel: jest.fn(),
  schedule: jest.fn(),
  _getDelay: jest.fn(),
}));

import { logoutClient } from "../../../../../../../app/_lib/logout";
const logoutMock = logoutClient as jest.Mock;

describe("useLogout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logoutMock.mockResolvedValue(undefined);
  });

  it("calls logoutClient('manual') on logout", async () => {
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.logout();
    });

    expect(logoutMock).toHaveBeenCalledWith("manual");
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it("isLoading is true during operation", async () => {
    let resolve!: () => void;
    logoutMock.mockReturnValue(new Promise<void>((r) => { resolve = r; }));

    const { result } = renderHook(() => useLogout());

    act(() => { result.current.logout(); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolve(); });
  });

  it("does not call logoutClient a second time while loading (double click)", async () => {
    let resolve!: () => void;
    logoutMock.mockReturnValue(new Promise<void>((r) => { resolve = r; }));

    const { result } = renderHook(() => useLogout());

    act(() => { result.current.logout(); });
    act(() => { result.current.logout(); }); // ignored

    await act(async () => { resolve(); });

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
