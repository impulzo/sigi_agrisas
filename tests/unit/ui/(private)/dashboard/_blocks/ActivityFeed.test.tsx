import React from "react";
import { render, screen } from "@testing-library/react";
import { ActivityFeed } from "../../../../../../app/(private)/dashboard/_blocks/ActivityFeed";
import type { ActivityEvent } from "../../../../../../app/(private)/dashboard/_logic/types/domain";

describe("ActivityFeed", () => {
  const items: ActivityEvent[] = [
    {
      id: "1",
      title: "New sale recorded",
      subject: "by Cashier 04",
      timestamp: "2 minutes ago",
      meta: "Invoice #AG-9821",
      isLatest: true,
    },
    {
      id: "2",
      title: "Inventory restocked",
      subject: "- Corn Hybrid A",
      timestamp: "45 minutes ago",
      meta: "Warehouse B",
      isLatest: false,
    },
  ];

  it("renders all event titles and metas", () => {
    render(<ActivityFeed items={items} />);
    expect(screen.getByText(/New sale recorded/)).toBeInTheDocument();
    expect(screen.getByText(/Inventory restocked/)).toBeInTheDocument();
    expect(screen.getByText(/Invoice #AG-9821/)).toBeInTheDocument();
  });

  it("marks the latest item with ring styles", () => {
    const { container } = render(<ActivityFeed items={items} />);
    const latestDot = container.querySelector(".ring-primary\\/20");
    expect(latestDot).not.toBeNull();
    expect(latestDot?.className).toContain("bg-primary");
  });

  it("non-latest items use bg-outline", () => {
    const { container } = render(<ActivityFeed items={items} />);
    const outlineDots = container.querySelectorAll(".bg-outline");
    expect(outlineDots.length).toBeGreaterThanOrEqual(1);
  });
});
