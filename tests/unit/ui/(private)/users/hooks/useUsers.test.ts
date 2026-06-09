import { renderHook, act, waitFor } from "@testing-library/react";
import { useUsers } from "../../../../../../app/(private)/users/_logic/hooks/useUsers";
import * as listUsersModule from "../../../../../../app/(private)/users/_logic/services/listUsers";

const MOCK_RESULT = { users: [{ id: "u1", email: "a@test.com", avatarUrl: "", roles: [], createdAt: new Date(), updatedAt: new Date() }], total: 1, page: 1, pageSize: 20 };

describe("useUsers", () => {
  beforeEach(() => jest.clearAllMocks());

  it("carga usuarios al montar", async () => {
    jest.spyOn(listUsersModule, "listUsers").mockResolvedValue(MOCK_RESULT);
    const { result } = renderHook(() => useUsers({ page: 1, pageSize: 20 }));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.users).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it("recarga al cambiar página", async () => {
    const spy = jest.spyOn(listUsersModule, "listUsers").mockResolvedValue({ ...MOCK_RESULT, page: 2 });
    const { rerender } = renderHook(({ page }) => useUsers({ page, pageSize: 20 }), {
      initialProps: { page: 1 },
    });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    rerender({ page: 2 });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(spy).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 });
  });

  it("expone error cuando listUsers falla", async () => {
    jest.spyOn(listUsersModule, "listUsers").mockRejectedValue(new Error("Net error"));
    const { result } = renderHook(() => useUsers({ page: 1, pageSize: 20 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("Net error");
  });

  it("refresh vuelve a invocar el servicio", async () => {
    const spy = jest.spyOn(listUsersModule, "listUsers").mockResolvedValue(MOCK_RESULT);
    const { result } = renderHook(() => useUsers({ page: 1, pageSize: 20 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.refresh());
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });
});
