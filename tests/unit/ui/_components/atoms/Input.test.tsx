import React from "react";
import { render } from "@testing-library/react";
import { Input } from "../../../../../app/_components/atoms/Input/Input";

describe("Input", () => {
  it("renders default", () => {
    const { container } = render(<Input name="email" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders with error", () => {
    const { container } = render(<Input name="email" error="Correo inválido" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
