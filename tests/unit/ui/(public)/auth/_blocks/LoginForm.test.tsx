import React from "react";
import { render } from "@testing-library/react";
import { LoginForm } from "../../../../../../app/(public)/auth/_blocks/LoginForm";

const mockUseLoginForm = jest.fn();

jest.mock("../../../../../../app/(public)/auth/_logic/hooks/useLoginForm", () => ({
  useLoginForm: () => mockUseLoginForm(),
}));

jest.mock("next/link", () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

const defaultHookState = {
  values: { email: "", password: "" },
  errors: {},
  isSubmitting: false,
  formError: null,
  handleChange: jest.fn(),
  handleBlur: jest.fn(),
  handleSubmit: jest.fn(),
};

describe("LoginForm", () => {
  it("renders initial state", () => {
    mockUseLoginForm.mockReturnValue(defaultHookState);
    const { container } = render(<LoginForm />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders with formError", () => {
    mockUseLoginForm.mockReturnValue({
      ...defaultHookState,
      values: { email: "bad@email.com", password: "123" },
      formError: "Credenciales inválidas",
    });
    const { container } = render(<LoginForm />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
