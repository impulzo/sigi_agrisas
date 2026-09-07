import { renderHook, act } from "@testing-library/react";
import { useSetPasswordForm } from "../../../../../../../app/(public)/auth/_logic/hooks/useSetPasswordForm";
import { PasswordSetupTokenExpiredError, PasswordSetupTokenInvalidError, NetworkError } from "../../../../../../../app/(public)/auth/_logic/types/domain";

const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

jest.mock("../../../../../../../app/(public)/auth/_logic/services/setPassword", () => ({
  setPassword: jest.fn(),
}));

jest.mock("../../../../../../../app/_lib/session/accessToken", () => ({
  setAccessToken: jest.fn(),
}));

const setPasswordMock = require("../../../../../../../app/(public)/auth/_logic/services/setPassword").setPassword;

describe("useSetPasswordForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function fillValidPassword(result: ReturnType<typeof renderHook<ReturnType<typeof useSetPasswordForm>, unknown>>["result"]) {
    act(() => {
      result.current.handleChange({ target: { name: "password", value: "secret123" } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({ target: { name: "confirmPassword", value: "secret123" } } as React.ChangeEvent<HTMLInputElement>);
    });
  }

  it("redirects to /pos on successful submit", async () => {
    setPasswordMock.mockResolvedValue({ accessToken: "tok", user: { id: "1", name: "A", email: "a@b.com" } });
    const { result } = renderHook(() => useSetPasswordForm("valid-token"));
    fillValidPassword(result);

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent);
    });

    expect(setPasswordMock).toHaveBeenCalledWith({ token: "valid-token", password: "secret123" });
    expect(mockReplace).toHaveBeenCalledWith("/pos");
    expect(mockReplace).not.toHaveBeenCalledWith("/dashboard");
  });

  it("does not redirect when token is missing", async () => {
    const { result } = renderHook(() => useSetPasswordForm(null));
    fillValidPassword(result);

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent);
    });

    expect(setPasswordMock).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.formError).toBeTruthy();
  });

  it("sets formError and does not redirect on expired token", async () => {
    setPasswordMock.mockRejectedValue(new PasswordSetupTokenExpiredError());
    const { result } = renderHook(() => useSetPasswordForm("expired-token"));
    fillValidPassword(result);

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent);
    });

    expect(result.current.formError).toBe(new PasswordSetupTokenExpiredError().message);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("sets formError and does not redirect on invalid token", async () => {
    setPasswordMock.mockRejectedValue(new PasswordSetupTokenInvalidError());
    const { result } = renderHook(() => useSetPasswordForm("bad-token"));
    fillValidPassword(result);

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent);
    });

    expect(result.current.formError).toBe(new PasswordSetupTokenInvalidError().message);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("sets formError and does not redirect on network error", async () => {
    setPasswordMock.mockRejectedValue(new NetworkError());
    const { result } = renderHook(() => useSetPasswordForm("valid-token"));
    fillValidPassword(result);

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent);
    });

    expect(result.current.formError).toBe("Error al establecer la contraseña. Intenta de nuevo.");
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
