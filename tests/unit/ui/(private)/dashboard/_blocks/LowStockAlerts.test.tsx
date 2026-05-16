import React from "react";
import { render, screen } from "@testing-library/react";
import { LowStockAlerts } from "../../../../../../app/(private)/dashboard/_blocks/LowStockAlerts";
import type { LowStockAlert } from "../../../../../../app/(private)/dashboard/_logic/types/domain";

describe("LowStockAlerts", () => {
  it("renders empty state when alerts array is empty", () => {
    render(<LowStockAlerts alerts={[]} />);
    expect(screen.getByText("Sin alertas activas")).toBeInTheDocument();
  });

  it("renders critical alert with error styles", () => {
    const alerts: LowStockAlert[] = [
      {
        id: "1",
        productName: "Wheat Seeds",
        message: "5 bags left",
        severity: "critical",
        icon: "grain",
      },
    ];
    const { container } = render(<LowStockAlerts alerts={alerts} />);
    expect(screen.getByText("Wheat Seeds")).toBeInTheDocument();
    expect(screen.getByText("5 bags left")).toBeInTheDocument();

    const row = container.querySelector(".bg-error-container\\/30");
    expect(row).not.toBeNull();

    const cta = screen.getByRole("button", { name: "Restock" });
    expect(cta.className).toContain("text-error");
  });

  it("renders warning alert with secondary background and primary CTA", () => {
    const alerts: LowStockAlert[] = [
      {
        id: "1",
        productName: "NPK",
        message: "below 15%",
        severity: "warning",
        icon: "science",
      },
    ];
    const { container } = render(<LowStockAlerts alerts={alerts} />);
    const row = container.querySelector(".bg-surface-container");
    expect(row).not.toBeNull();
    expect(screen.getByRole("button", { name: "Restock" }).className).toContain(
      "text-primary",
    );
  });
});
