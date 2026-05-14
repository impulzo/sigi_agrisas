import React from "react";
import { render } from "@testing-library/react";
import { Button } from "../../../../../app/_components/atoms/Button/Button";

describe("Button", () => {
  it("renders primary variant", () => {
    const { container } = render(<Button>Guardar</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders with loading=true", () => {
    const { container } = render(<Button loading>Guardar</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders disabled", () => {
    const { container } = render(<Button disabled>Guardar</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
