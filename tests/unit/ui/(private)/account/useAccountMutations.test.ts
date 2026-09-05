/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useAccountMutations } from "../../../../../app/(private)/account/_logic/hooks/useAccountMutations";
import * as updateOwnProfileModule from "../../../../../app/(private)/account/_logic/services/updateOwnProfile";
import * as sendMyPasswordLinkModule from "../../../../../app/(private)/account/_logic/services/sendMyPasswordLink";
import { EmailAlreadyInUseError } from "../../../../../app/(private)/account/_logic/errors";
import type { OwnProfileDto } from "../../../../../app/(private)/account/_logic/types/api";

const BASE_PROFILE: OwnProfileDto = {
  id: "u1",
  name: "Original",
  email: "original@example.com",
  avatarUrl: "https://www.gravatar.com/avatar/abc?d=mp&s=200",
};

describe("useAccountMutations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("saveProfileDiff no llama al servicio cuando no hay campos modificados", async () => {
    const spy = jest.spyOn(updateOwnProfileModule, "updateOwnProfile");

    const { result } = renderHook(() => useAccountMutations());
    let res: OwnProfileDto | null = null;
    await act(async () => {
      res = await result.current.saveProfileDiff({
        original: BASE_PROFILE,
        edited: { name: BASE_PROFILE.name ?? "", email: BASE_PROFILE.email },
      });
    });

    expect(spy).not.toHaveBeenCalled();
    expect(res).toEqual(BASE_PROFILE);
  });

  it("saveProfileDiff envía sólo el campo modificado (nombre)", async () => {
    const spy = jest
      .spyOn(updateOwnProfileModule, "updateOwnProfile")
      .mockResolvedValue({ ...BASE_PROFILE, name: "Nuevo" });

    const { result } = renderHook(() => useAccountMutations());
    await act(async () => {
      await result.current.saveProfileDiff({
        original: BASE_PROFILE,
        edited: { name: "Nuevo", email: BASE_PROFILE.email },
      });
    });

    expect(spy).toHaveBeenCalledWith({ name: "Nuevo" });
  });

  it("saveProfileDiff setea profileError si el servicio falla", async () => {
    jest.spyOn(updateOwnProfileModule, "updateOwnProfile").mockRejectedValue(new Error("Email already in use"));

    const { result } = renderHook(() => useAccountMutations());
    await act(async () => {
      await result.current.saveProfileDiff({
        original: BASE_PROFILE,
        edited: { name: BASE_PROFILE.name ?? "", email: "otro@example.com" },
      });
    });

    expect(result.current.profileError).toBe("Email already in use");
  });

  it("saveProfileDiff setea profileFieldErrors.email (no el banner genérico) ante EmailAlreadyInUseError", async () => {
    jest.spyOn(updateOwnProfileModule, "updateOwnProfile").mockRejectedValue(new EmailAlreadyInUseError());

    const { result } = renderHook(() => useAccountMutations());
    await act(async () => {
      await result.current.saveProfileDiff({
        original: BASE_PROFILE,
        edited: { name: BASE_PROFILE.name ?? "", email: "otro@example.com" },
      });
    });

    expect(result.current.profileError).toBeNull();
    expect(result.current.profileFieldErrors.email).toBe("El correo ya está en uso por otra cuenta");
  });

  it("clearProfileError limpia tanto profileError como profileFieldErrors", async () => {
    jest.spyOn(updateOwnProfileModule, "updateOwnProfile").mockRejectedValue(new EmailAlreadyInUseError());

    const { result } = renderHook(() => useAccountMutations());
    await act(async () => {
      await result.current.saveProfileDiff({
        original: BASE_PROFILE,
        edited: { name: BASE_PROFILE.name ?? "", email: "otro@example.com" },
      });
    });
    act(() => result.current.clearProfileError());

    expect(result.current.profileError).toBeNull();
    expect(result.current.profileFieldErrors).toEqual({});
  });

  it("sendPasswordLink guarda passwordLinkSentTo en éxito", async () => {
    jest
      .spyOn(sendMyPasswordLinkModule, "sendMyPasswordLink")
      .mockResolvedValue({ sentTo: "original@example.com" });

    const { result } = renderHook(() => useAccountMutations());
    await act(async () => {
      await result.current.sendPasswordLink();
    });

    expect(result.current.passwordLinkSentTo).toBe("original@example.com");
    expect(result.current.passwordLinkError).toBeNull();
  });

  it("sendPasswordLink setea passwordLinkError si el servicio falla, sin marcar éxito", async () => {
    jest
      .spyOn(sendMyPasswordLinkModule, "sendMyPasswordLink")
      .mockRejectedValue(new Error("No se pudo enviar el correo de cambio de contraseña."));

    const { result } = renderHook(() => useAccountMutations());
    await act(async () => {
      await result.current.sendPasswordLink();
    });

    expect(result.current.passwordLinkSentTo).toBeNull();
    expect(result.current.passwordLinkError).toBe("No se pudo enviar el correo de cambio de contraseña.");
  });
});
