import { getRecentActivity } from "../../../../../../../app/(private)/dashboard/_logic/services/getRecentActivity";

describe("getRecentActivity", () => {
  it("resolves with at least 3 events, the first being the latest", async () => {
    const events = await getRecentActivity();
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events[0].isLatest).toBe(true);
    expect(events.slice(1).every((e) => !e.isLatest)).toBe(true);
  });

  it("accepts an optional fetchImpl without throwing", async () => {
    await expect(
      getRecentActivity(jest.fn() as unknown as typeof fetch),
    ).resolves.toBeDefined();
  });
});
