import React from "react";
import { render, screen } from "@testing-library/react";
import { SalesCard } from "../../../../../../app/(private)/dashboard/_blocks/SalesCard";

describe("SalesCard", () => {
  const baseData = {
    totalToday: 24850,
    trend: { delta: "+12.4%", direction: "up" as const },
    sparkline: [10, 20, 30, 40, 50, 60, 70, 80],
  };

  it("renders value formatted as USD currency", () => {
    render(<SalesCard data={baseData} />);
    expect(screen.getByText("$24,850.00")).toBeInTheDocument();
  });

  it("shows trending_up icon when direction is up", () => {
    const { container } = render(<SalesCard data={baseData} />);
    const icons = Array.from(container.querySelectorAll(".material-symbols-outlined"));
    expect(icons.some((i) => i.textContent === "trending_up")).toBe(true);
  });

  it("shows trending_down icon when direction is down", () => {
    const { container } = render(
      <SalesCard
        data={{
          ...baseData,
          trend: { delta: "-3%", direction: "down" },
        }}
      />,
    );
    const icons = Array.from(container.querySelectorAll(".material-symbols-outlined"));
    expect(icons.some((i) => i.textContent === "trending_down")).toBe(true);
  });

  it("renders exactly as many sparkline bars as values", () => {
    const { container } = render(<SalesCard data={baseData} />);
    const sparklineContainer = container.querySelector(".h-32");
    expect(sparklineContainer?.children.length).toBe(8);
  });
});
