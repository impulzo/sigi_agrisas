import { logout } from "../../../../../../../app/(public)/auth/_logic/services/logout";
import { NetworkError } from "../../../../../../../app/_lib/authFetch";
import type { authFetch } from "../../../../../../../app/_lib/authFetch";

type FetchImpl = typeof authFetch;

function makeFetch(status: number): FetchImpl {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
  }) as unknown as FetchImpl;
}

describe("logout service", () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("accessToken", "test-token");
  });

  it("llama POST /api/v1/auth/logout y limpia sessionStorage en éxito", async () => {
    const mockFetch = makeFetch(200);
    await logout(mockFetch);
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/logout", { method: "POST" });
    expect(sessionStorage.getItem("accessToken")).toBeNull();
  });

  it("limpia sessionStorage y lanza NetworkError si la llamada falla", async () => {
    const failFetch = jest.fn().mockRejectedValue(new NetworkError()) as unknown as FetchImpl;
    await expect(logout(failFetch)).rejects.toBeInstanceOf(NetworkError);
    expect(sessionStorage.getItem("accessToken")).toBeNull();
  });
});
