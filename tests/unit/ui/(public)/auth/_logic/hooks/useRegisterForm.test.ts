import { renderHook, act } from "@testing-library/react";
import { useRegisterForm } from "../../../../../../../app/(public)/auth/_logic/hooks/useRegisterForm";
import { EmailAlreadyExistsError, NetworkError } from "../../../../../../../app/(public)/auth/_logic/types/domain";

const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

jest.mock("../../../../../../../app/(public)/auth/_logic/services/register", () => ({
  register: jest.fn(),
}));

const registerMock = require("../../../../../../../app/(public)/auth/_logic/services/register").register;

describe("useRegisterForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(global, "sessionStorage", {
      value: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
      writable: true,
    });
  });

  it("validates name on blur (empty)", () => {
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      result.current.handleBlur({ target: { name: "name", value: "" } } as React.FocusEvent<HTMLInputElement>);
    });
    expect(result.current.errors.name).toBe("El nombre es requerido");
  });

  it("validates email on blur (invalid)", () => {
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      result.current.handleBlur({ target: { name: "email", value: "bad" } } as React.FocusEvent<HTMLInputElement>);
    });
    expect(result.current.errors.email).toBe("Correo inválido");
  });

  it("calls register with payload on submit", async () => {
    registerMock.mockResolvedValue({ accessToken: "tok", user: { id: "1", name: "Ana", email: "ana@b.com" } });
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      result.current.handleChange({ target: { name: "name", value: "Ana" } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({ target: { name: "email", value: "ana@b.com" } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({ target: { name: "password", value: "secret123" } } as React.ChangeEvent<HTMLInputElement>);
    });
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent);
    });
    expect(registerMock).toHaveBeenCalledWith({ name: "Ana", email: "ana@b.com", password: "secret123" });
    expect(mockReplace).toHaveBeenCalledWith("/dashboard");
  });

  it("sets formError on EmailAlreadyExistsError", async () => {
    registerMock.mockRejectedValue(new EmailAlreadyExistsError());
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      result.current.handleChange({ target: { name: "name", value: "Ana" } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({ target: { name: "email", value: "ana@b.com" } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({ target: { name: "password", value: "secret123" } } as React.ChangeEvent<HTMLInputElement>);
    });
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent);
    });
    expect(result.current.formError).toBe("Este correo ya está registrado");
  });

  it("sets formError on NetworkError", async () => {
    registerMock.mockRejectedValue(new NetworkError());
    const { result } = renderHook(() => useRegisterForm());
    act(() => {
      result.current.handleChange({ target: { name: "name", value: "Ana" } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({ target: { name: "email", value: "ana@b.com" } } as React.ChangeEvent<HTMLInputElement>);
      result.current.handleChange({ target: { name: "password", value: "secret123" } } as React.ChangeEvent<HTMLInputElement>);
    });
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() } as unknown as React.FormEvent);
    });
    expect(result.current.formError).toBe("Error al crear la cuenta. Intenta de nuevo.");
  });
});
