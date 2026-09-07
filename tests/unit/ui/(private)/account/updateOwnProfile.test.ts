import { updateOwnProfile } from "../../../../../app/(private)/account/_logic/services/updateOwnProfile";
import { EmailAlreadyInUseError } from "../../../../../app/(private)/account/_logic/errors";
import { NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../app/_lib/authFetch";

describe("updateOwnProfile", () => {
  it("returns the updated profile on success", async () => {
    const updated = { id: "u1", name: "Nuevo", email: "nuevo@example.com", avatarUrl: "https://x" };
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => updated,
    } as Response);

    const result = await updateOwnProfile({ name: "Nuevo" }, mockFetch);

    expect(result).toEqual(updated);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/auth/me",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ name: "Nuevo" }) })
    );
  });

  it("maps a 409 response to EmailAlreadyInUseError", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Email already in use" }),
    } as Response);

    await expect(updateOwnProfile({ email: "dup@example.com" }, mockFetch)).rejects.toThrow(
      EmailAlreadyInUseError
    );
  });

  it("maps any other non-ok response to NetworkError", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "boom" }),
    } as Response);

    await expect(updateOwnProfile({ name: "X" }, mockFetch)).rejects.toThrow(NetworkError);
  });

  it("re-throws UnauthenticatedError from authFetch instead of collapsing it to NetworkError", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new UnauthenticatedError());

    await expect(updateOwnProfile({ name: "X" }, mockFetch)).rejects.toThrow(UnauthenticatedError);
  });

  it("re-throws ForbiddenError from authFetch instead of collapsing it to NetworkError", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new ForbiddenError("users:write"));

    await expect(updateOwnProfile({ name: "X" }, mockFetch)).rejects.toThrow(ForbiddenError);
  });

  it("maps a real fetch failure to NetworkError", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(updateOwnProfile({ name: "X" }, mockFetch)).rejects.toThrow(NetworkError);
  });
});
