import jwt from "jsonwebtoken";
import { JwtTokenService } from "@/modules/auth/infrastructure/services/JwtTokenService";

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = "test-access-secret-32chars-long!!";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-32chars-long!";
});

describe("JwtTokenService", () => {
  let svc: JwtTokenService;

  beforeEach(() => {
    svc = new JwtTokenService();
  });

  it("generates an access token with correct claims", () => {
    const token = svc.generateAccessToken({ sub: "user-1", email: "a@b.com" });
    const payload = svc.verifyAccessToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.email).toBe("a@b.com");
  });

  it("generates a refresh token that verifies correctly", () => {
    const token = svc.generateRefreshToken({ sub: "user-1", email: "a@b.com" });
    const payload = svc.verifyRefreshToken(token);
    expect(payload.sub).toBe("user-1");
  });

  it("throws on tampered access token", () => {
    expect(() => svc.verifyAccessToken("invalid.token.here")).toThrow();
  });

  it("throws on tampered refresh token", () => {
    expect(() => svc.verifyRefreshToken("bad.refresh.token")).toThrow();
  });

  it("access token cannot be verified as refresh token", () => {
    const token = svc.generateAccessToken({ sub: "user-1", email: "a@b.com" });
    expect(() => svc.verifyRefreshToken(token)).toThrow();
  });

  it("access token exp is current time + 900 seconds", () => {
    const before = Math.floor(Date.now() / 1000);
    const token = svc.generateAccessToken({ sub: "user-1", email: "a@b.com" });
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    expect(decoded.exp).toBeGreaterThanOrEqual(before + 900);
    expect(decoded.exp).toBeLessThanOrEqual(before + 901);
  });
});
