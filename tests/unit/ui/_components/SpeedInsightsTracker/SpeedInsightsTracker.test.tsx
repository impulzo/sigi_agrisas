import React from "react";
import { render } from "@testing-library/react";

const speedInsightsMock = jest.fn(() => null);

jest.mock("@vercel/speed-insights/next", () => ({
  SpeedInsights: (props: unknown) => speedInsightsMock(props),
}));

import { SpeedInsightsTracker } from "../../../../../app/_components/organisms/SpeedInsightsTracker/SpeedInsightsTracker";

describe("SpeedInsightsTracker", () => {
  beforeEach(() => {
    speedInsightsMock.mockClear();
  });

  it("propagates debug as received", () => {
    render(<SpeedInsightsTracker enabled={false} debug={true} />);
    expect(speedInsightsMock).toHaveBeenCalledWith(
      expect.objectContaining({ debug: true })
    );
  });

  it("beforeSend discards the event when disabled", () => {
    render(<SpeedInsightsTracker enabled={false} debug={true} />);
    const { beforeSend } = speedInsightsMock.mock.calls[0][0] as {
      beforeSend: (event: { type: "vital"; url: string }) => unknown;
    };
    expect(
      beforeSend({ type: "vital", url: "/sales/3fa85f64-5717-4562-b3fc-2c963f66afa6" })
    ).toBeNull();
  });

  it("beforeSend returns the event with a redacted url when enabled", () => {
    render(<SpeedInsightsTracker enabled={true} debug={false} />);
    const { beforeSend } = speedInsightsMock.mock.calls[0][0] as {
      beforeSend: (event: { type: "vital"; url: string }) => { url: string } | null;
    };
    const result = beforeSend({
      type: "vital",
      url: "/sales/3fa85f64-5717-4562-b3fc-2c963f66afa6",
    });
    expect(result).toEqual(
      expect.objectContaining({ url: "/sales/:id", type: "vital" })
    );
  });
});
