import React from "react";
import { render, screen } from "@testing-library/react";
import { DashboardHeader } from "../../../../../../app/(private)/dashboard/_blocks/DashboardHeader";

describe("DashboardHeader", () => {
  it("renders welcome message with userName", () => {
    render(<DashboardHeader userName="Admin" />);
    expect(screen.getByText("Welcome back, Admin")).toBeInTheDocument();
    expect(screen.getByText("Operational Overview")).toBeInTheDocument();
  });

  it('"Nueva venta" link points to /pos', () => {
    render(<DashboardHeader userName="A" />);
    const link = screen.getByRole("link", { name: /Nueva venta/ });
    expect(link).toHaveAttribute("href", "/pos");
  });
});
