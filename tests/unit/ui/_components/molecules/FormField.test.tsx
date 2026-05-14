import React from "react";
import { render } from "@testing-library/react";
import { FormField } from "../../../../../app/_components/molecules/FormField/FormField";

describe("FormField", () => {
  it("renders label + input + error", () => {
    const { container } = render(
      <FormField id="email" name="email" label="Correo" error="Requerido" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders without error", () => {
    const { container } = render(
      <FormField id="name" name="name" label="Nombre" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
