import React from "react";
import { render } from "@testing-library/react";
import { Spinner } from "../../../../../app/_components/atoms/Spinner/Spinner";

describe("Spinner", () => {
  it("renders size=sm", () => {
    const { container } = render(<Spinner size="sm" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders size=md", () => {
    const { container } = render(<Spinner size="md" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders size=lg", () => {
    const { container } = render(<Spinner size="lg" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
