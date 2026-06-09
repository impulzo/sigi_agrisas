import { renderHook, act } from "@testing-library/react";
import { useLogout } from "../../../../../../../app/(public)/auth/_logic/hooks/useLogout";
import { NetworkError } from "../../../../../../../app/_lib/authFetch";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("../../../../../../../app/(public)/auth/_logic/services/logout", () => ({
  logout: jest.fn(),
}));

const logoutMock: jest.Mock =
  require("../../../../../../../app/(public)/auth/_logic/services/logout").logout;

describe("useLogout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("llama al servicio y redirige a /auth/login en éxito", async () => {
    logoutMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.logout();
    });

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/auth/login");
  });

  it("isLoading es true durante la operación", async () => {
    let resolve!: () => void;
    logoutMock.mockReturnValue(new Promise<void>((r) => { resolve = r; }));

    const { result } = renderHook(() => useLogout());

    act(() => { result.current.logout(); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolve(); });
    expect(mockPush).toHaveBeenCalledWith("/auth/login");
  });

  it("redirige a /auth/login aunque el servicio lance NetworkError", async () => {
    logoutMock.mockRejectedValue(new NetworkError());
    const { result } = renderHook(() => useLogout());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockPush).toHaveBeenCalledWith("/auth/login");
  });

  it("no llama al servicio si isLoading ya es true (doble click)", async () => {
    let resolve!: () => void;
    logoutMock.mockReturnValue(new Promise<void>((r) => { resolve = r; }));

    const { result } = renderHook(() => useLogout());

    act(() => { result.current.logout(); });
    act(() => { result.current.logout(); }); // segundo click ignorado

    await act(async () => { resolve(); });

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
