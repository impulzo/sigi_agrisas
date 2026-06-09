import { decodeJwtPayload } from "../../../../app/_lib/jwt";

function makeToken(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

describe("decodeJwtPayload", () => {
  it("decodes a valid JWT payload", () => {
    const result = decodeJwtPayload(makeToken({ sub: "1", email: "a@b.com", roles: ["admin"] }));
    expect(result).toEqual({ sub: "1", email: "a@b.com", roles: ["admin"] });
  });

  it("returns null for an empty string", () => {
    expect(decodeJwtPayload("")).toBeNull();
  });

  it("returns null for a string without three parts", () => {
    expect(decodeJwtPayload("only.two")).toBeNull();
  });

  it("returns null for invalid base64 in payload segment", () => {
    expect(decodeJwtPayload("header.!!!.sig")).toBeNull();
  });

  it("returns null when payload is not valid JSON", () => {
    const bad = `header.${btoa("not-json")}.sig`;
    expect(decodeJwtPayload(bad)).toBeNull();
  });
});
