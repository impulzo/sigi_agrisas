import { mapDomainError } from "@/shared/infrastructure/http/mapDomainError";

class NotFoundError extends Error {}
class AlreadyExistsError extends Error {}

describe("mapDomainError", () => {
  it("returns the matching status/message for the first matching error class", async () => {
    const err = new NotFoundError("Thing not found");
    const res = mapDomainError(err, [
      [NotFoundError, 404],
      [AlreadyExistsError, 409],
    ]);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(404);
    expect(await res!.json()).toEqual({ error: "Thing not found" });
  });

  it("returns null when no error class in the table matches", () => {
    const res = mapDomainError(new Error("unexpected"), [[NotFoundError, 404]]);
    expect(res).toBeNull();
  });

  it("respects table order when an error matches multiple entries via inheritance", async () => {
    class SpecificError extends NotFoundError {}
    const err = new SpecificError("specific");
    const res = mapDomainError(err, [
      [SpecificError, 400],
      [NotFoundError, 404],
    ]);
    expect(res!.status).toBe(400);
  });
});
