import React from "react";
import { render, screen } from "@testing-library/react";
import { LogisticsMap } from "../../../../../../app/(private)/dashboard/_blocks/LogisticsMap";

describe("LogisticsMap", () => {
  it("renders hub name", () => {
    render(
      <LogisticsMap
        data={{
          hubName: "Main Logistics Hub",
          status: "operational",
          mapImageSrc: "/dashboard/logistics-map.svg",
        }}
      />,
    );
    expect(screen.getByText("Main Logistics Hub")).toBeInTheDocument();
  });

  it("operational status uses animate-pulse on the dot and the right label", () => {
    const { container } = render(
      <LogisticsMap
        data={{
          hubName: "Hub A",
          status: "operational",
          mapImageSrc: "/dashboard/logistics-map.svg",
        }}
      />,
    );
    expect(screen.getByText("All systems operational")).toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("degraded status uses bg-secondary and a different label", () => {
    const { container } = render(
      <LogisticsMap
        data={{
          hubName: "Hub B",
          status: "degraded",
          mapImageSrc: "/dashboard/logistics-map.svg",
        }}
      />,
    );
    expect(screen.getByText("Performance degraded")).toBeInTheDocument();
    expect(container.querySelector(".bg-secondary")).not.toBeNull();
  });
});
