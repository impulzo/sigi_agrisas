import { getOwnProfile } from "../../../../../app/(private)/account/_logic/services/getOwnProfile";
import { NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../app/_lib/authFetch";
import { AccountLoadError } from "../../../../../app/(private)/account/_logic/errors";

const profileDto = {
  id: "uid-1",
  name: "Usuario",
  email: "user@example.com",
  avatarUrl: "https://www.gravatar.com/avatar/abc?d=mp&s=200",
};

describe("getOwnProfile", () => {
  it("returns the profile on 200", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => profileDto,
    } as Response);

    const result = await getOwnProfile(mockFetch);

    expect(result).toEqual(profileDto);
  });

  it("throws AccountLoadError with the backend detail on non-ok response", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "User not found" }),
    } as Response);

    await expect(getOwnProfile(mockFetch)).rejects.toBeInstanceOf(AccountLoadError);
    await expect(getOwnProfile(mockFetch)).rejects.toThrow("User not found");
  });

  it("throws AccountLoadError with a fallback message when the body has no detail", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response);

    await expect(getOwnProfile(mockFetch)).rejects.toThrow(
      "No se pudo cargar la información de tu cuenta."
    );
  });

  it("re-throws NetworkError on a real fetch failure", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new NetworkError());

    await expect(getOwnProfile(mockFetch)).rejects.toBeInstanceOf(NetworkError);
  });

  it("re-throws UnauthenticatedError instead of collapsing it to a generic NetworkError", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new UnauthenticatedError());

    await expect(getOwnProfile(mockFetch)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("re-throws ForbiddenError instead of collapsing it to a generic NetworkError", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new ForbiddenError());

    await expect(getOwnProfile(mockFetch)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
