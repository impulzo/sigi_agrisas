import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchInput } from "../../../../../app/_components/molecules/SearchInput/SearchInput";

describe("SearchInput", () => {
  it("renders placeholder and search icon", () => {
    const { container } = render(<SearchInput placeholder="Search data..." />);
    expect(screen.getByPlaceholderText("Search data...")).toBeInTheDocument();
    expect(container.querySelector(".material-symbols-outlined")?.textContent).toBe(
      "search",
    );
  });

  it("calls onChange with the new value", async () => {
    const onChange = jest.fn();
    render(<SearchInput onChange={onChange} placeholder="search" />);
    await userEvent.type(screen.getByPlaceholderText("search"), "abc");
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenLastCalledWith("c");
  });

  it("uses value prop for controlled state", () => {
    render(<SearchInput value="hola" onChange={() => {}} placeholder="x" />);
    const input = screen.getByPlaceholderText("x") as HTMLInputElement;
    expect(input.value).toBe("hola");
  });
});
