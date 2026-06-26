/**
 * @jest-environment jsdom
 *
 * Smoke test: layout structure classes are present in source.
 * Server Components cannot be rendered with RTL (they call next/headers).
 * We inspect the source string instead.
 */
import * as fs from "fs";
import * as path from "path";

const layoutSrc = fs.readFileSync(
  path.resolve(__dirname, "../../../../app/(private)/layout.tsx"),
  "utf-8"
);

describe("PrivateLayout — layout structure", () => {
  it("root container has h-screen overflow-hidden", () => {
    expect(layoutSrc).toMatch(/h-screen/);
    expect(layoutSrc).toMatch(/overflow-hidden/);
  });

  it("main has overflow-y-auto", () => {
    expect(layoutSrc).toMatch(/overflow-y-auto/);
  });

  it("is a Server Component (no use client directive)", () => {
    expect(layoutSrc).not.toMatch(/"use client"/);
  });

  it("redirects when no refreshToken cookie", () => {
    expect(layoutSrc).toMatch(/redirect\(/);
    expect(layoutSrc).toMatch(/refreshToken/);
  });
});
