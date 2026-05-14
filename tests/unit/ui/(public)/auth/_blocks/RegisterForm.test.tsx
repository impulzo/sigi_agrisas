import React from "react";
import { render } from "@testing-library/react";
import { RegisterForm } from "../../../../../../app/(public)/auth/_blocks/RegisterForm";

const mockUseRegisterForm = jest.fn();

jest.mock("../../../../../../app/(public)/auth/_logic/hooks/useRegisterForm", () => ({
  useRegisterForm: () => mockUseRegisterForm(),
}));

jest.mock("next/link", () => {
  return function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

const defaultHookState = {
  values: { name: "", email: "", password: "" },
  errors: {},
  isSubmitting: false,
  formError: null,
  handleChange: jest.fn(),
  handleBlur: jest.fn(),
  handleSubmit: jest.fn(),
};

describe("RegisterForm", () => {
  it("renders initial state", () => {
    mockUseRegisterForm.mockReturnValue(defaultHookState);
    const { container } = render(<RegisterForm />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders with formError", () => {
    mockUseRegisterForm.mockReturnValue({
      ...defaultHookState,
      values: { name: "Ana", email: "ana@test.com", password: "123456" },
      formError: "Este correo ya está registrado",
    });
    const { container } = render(<RegisterForm />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
