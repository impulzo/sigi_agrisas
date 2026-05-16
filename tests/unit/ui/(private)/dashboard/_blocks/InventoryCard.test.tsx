import React from "react";
import { render, screen } from "@testing-library/react";
import { InventoryCard } from "../../../../../../app/(private)/dashboard/_blocks/InventoryCard";

describe("InventoryCard", () => {
  it("formats totalItems with thousand separator", () => {
    render(
      <InventoryCard
        data={{
          totalItems: 1240,
          categories: [{ name: "Seeds", quantity: "450kg", percent: 75 }],
        }}
      />,
    );
    expect(screen.getByText("1,240 Items")).toBeInTheDocument();
  });

  it("renders each category with its label, quantity and progress width", () => {
    const { container } = render(
      <InventoryCard
        data={{
          totalItems: 1000,
          categories: [
            { name: "Seeds", quantity: "450kg", percent: 75 },
            { name: "Fertilizers", quantity: "790kg", percent: 50 },
          ],
        }}
      />,
    );
    expect(screen.getByText("Seeds")).toBeInTheDocument();
    expect(screen.getByText("450kg")).toBeInTheDocument();
    expect(screen.getByText("Fertilizers")).toBeInTheDocument();

    const bars = container.querySelectorAll(".bg-primary-fixed");
    expect(bars.length).toBe(2);
    expect((bars[0] as HTMLElement).style.width).toBe("75%");
    expect((bars[1] as HTMLElement).style.width).toBe("50%");
  });
});
