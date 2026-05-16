import React from "react";
import { render, screen } from "@testing-library/react";
import { StatCard } from "../../../../../app/_components/molecules/StatCard/StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Total Sales Today" value="$24,850.00" />);
    expect(screen.getByText("Total Sales Today")).toBeInTheDocument();
    expect(screen.getByText("$24,850.00")).toBeInTheDocument();
  });

  it("renders a trend chip when trend.direction = up", () => {
    const { container } = render(
      <StatCard
        label="Sales"
        value="$10"
        trend={{ delta: "+12.4%", direction: "up" }}
      />,
    );
    expect(screen.getByText("+12.4%")).toBeInTheDocument();
    expect(container.querySelector(".material-symbols-outlined")?.textContent).toBe(
      "trending_up",
    );
  });

  it("renders trending_down for direction = down", () => {
    const { container } = render(
      <StatCard
        label="Sales"
        value="$10"
        trend={{ delta: "-3%", direction: "down" }}
      />,
    );
    expect(container.querySelector(".material-symbols-outlined")?.textContent).toBe(
      "trending_down",
    );
  });

  it("renders icon when provided", () => {
    const { container } = render(
      <StatCard label="A" value="1" icon="agriculture" />,
    );
    const icons = container.querySelectorAll(".material-symbols-outlined");
    expect(Array.from(icons).some((i) => i.textContent === "agriculture")).toBe(
      true,
    );
  });
});
