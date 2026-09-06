import { redactSpeedInsightsUrl } from "../../../../../app/_components/organisms/SpeedInsightsTracker/redactSpeedInsightsUrl";

describe("redactSpeedInsightsUrl", () => {
  it("redacts a single UUID segment", () => {
    expect(
      redactSpeedInsightsUrl("/sales/3fa85f64-5717-4562-b3fc-2c963f66afa6")
    ).toBe("/sales/:id");
  });

  it("redacts multiple UUID segments in the same path", () => {
    expect(
      redactSpeedInsightsUrl(
        "/sales/3fa85f64-5717-4562-b3fc-2c963f66afa6/returns/11111111-2222-3333-4444-555555555555"
      )
    ).toBe("/sales/:id/returns/:id");
  });

  it("strips the query string", () => {
    expect(redactSpeedInsightsUrl("/catalogs/customers?search=acme")).toBe(
      "/catalogs/customers"
    );
  });

  it("leaves a path without UUIDs or query string unchanged", () => {
    expect(redactSpeedInsightsUrl("/dashboard")).toBe("/dashboard");
  });

  it("does not throw on an unparseable value and returns it as-is", () => {
    const input = "http://[invalid";
    expect(() => redactSpeedInsightsUrl(input)).not.toThrow();
    expect(redactSpeedInsightsUrl(input)).toBe(input);
  });

  it("preserves origin for absolute URLs while redacting the path", () => {
    expect(
      redactSpeedInsightsUrl(
        "https://panel.example.com/sales/3fa85f64-5717-4562-b3fc-2c963f66afa6?foo=bar"
      )
    ).toBe("https://panel.example.com/sales/:id");
  });
});
