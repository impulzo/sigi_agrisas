import { renderHook, act } from "@testing-library/react";
import { useLoginForm } from "../../../../../../../app/(public)/auth/_logic/hooks/useLoginForm";
import { InvalidCredentialsError, NetworkError } from "../../../../../../../app/(public)/auth/_logic/types/domain";

const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

jest.mock("../../../../../../../app/(public)/auth/_logic/services/login", () => ({
  login: jest.fn(),
}));

const loginMock = require("../../../../../../../app/(public)/auth/_logic/services/login").login;

describe("useLoginForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(global, "sessionStorage", {
      value: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
      writable: true,
    });
  });

  it("validates email on blur (empty)", () => {
    const { result } = renderHook(() => useLoginForm());
    act(() => {
      result.current.handleBlur({
        target: { name: "email", value: "" },
      } as React.FocusEvent<HTMLInputElement>);
    });
    expect(result.current.errors.email).toBeTruthy();
  });

  it("validates email on blur (invalid format)", () => {
    const { result } = renderHook(() => useLoginForm());
    act(() => {
      result.current.handleBlur({
        target: { name: "email", value: "not-an-email" },
      } as React.FocusEvent<HTMLInputElement>);
    });
    expect(result.current.errors.email).toBe("Correo inválido");
  });

  it("validates password on blur (too short)", () => {
    const { result } = renderHook(() => useLoginForm());
    act(() => {
      result.current.handleBlur({
        target: { name: "password", value: "abc" },
      } as React.FocusEvent<HTMLInputElement>);
    });
    expect(result.current.errors.password).toBe("Mínimo 8 caracteres");
  });

  it("sets isSubmitting during submit", async () => {
    loginMock.mockResolvedValue({ accessToken: "tok", user: { id: "1", name: "A", email: "a@b.com" } });
    const { result } = renderHook(() => useLoginForm());
    act(() => {
      result.current.handleChange({ target: { name: "email", value: "a@b.com" } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({ target: { name: "password", value: "secret123" } } as React.ChangeEvent<HTMLInputElement>);
    });
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent);
    });
    expect(loginMock).toHaveBeenCalledWith({ email: "a@b.com", password: "secret123" });
    expect(mockReplace).toHaveBeenCalledWith("/pos");
  });

  it("sets formError on InvalidCredentialsError", async () => {
    loginMock.mockRejectedValue(new InvalidCredentialsError());
    const { result } = renderHook(() => useLoginForm());
    act(() => {
      result.current.handleChange({ target: { name: "email", value: "a@b.com" } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({ target: { name: "password", value: "secret123" } } as React.ChangeEvent<HTMLInputElement>);
    });
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent);
    });
    expect(result.current.formError).toBe("Credenciales inválidas");
  });

  it("sets formError on NetworkError", async () => {
    loginMock.mockRejectedValue(new NetworkError());
    const { result } = renderHook(() => useLoginForm());
    act(() => {
      result.current.handleChange({ target: { name: "email", value: "a@b.com" } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({ target: { name: "password", value: "secret123" } } as React.ChangeEvent<HTMLInputElement>);
    });
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent);
    });
    expect(result.current.formError).toBe("Error al iniciar sesión. Intenta de nuevo.");
  });
});
