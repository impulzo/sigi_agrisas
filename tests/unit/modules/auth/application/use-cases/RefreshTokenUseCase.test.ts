import jwt from "jsonwebtoken";
import { RefreshTokenUseCase } from "@/modules/auth/application/use-cases/RefreshTokenUseCase";
import { JwtTokenService } from "@/modules/auth/infrastructure/services/JwtTokenService";

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = "test-access-secret-32chars-long!!";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-32chars-long!";
});

describe("RefreshTokenUseCase", () => {
  let svc: JwtTokenService;
  let useCase: RefreshTokenUseCase;

  beforeEach(() => {
    svc = new JwtTokenService();
    useCase = new RefreshTokenUseCase(svc);
  });

  it("returns a new access token for a valid refresh token", () => {
    const refreshToken = svc.generateRefreshToken({
      sub: "user-1",
      email: "a@b.com",
    });
    const result = useCase.execute(refreshToken);
    expect(result.accessToken).toBeTruthy();
    const payload = svc.verifyAccessToken(result.accessToken);
    expect(payload.sub).toBe("user-1");
  });

  it("returns a new refresh token (sliding session) with correct claims", () => {
    const refreshToken = svc.generateRefreshToken({ sub: "user-1", email: "a@b.com" });
    const result = useCase.execute(refreshToken);
    expect(result.newRefreshToken).toBeTruthy();
    const newPayload = svc.verifyRefreshToken(result.newRefreshToken);
    expect(newPayload.sub).toBe("user-1");
    expect(newPayload.email).toBe("a@b.com");
  });

  it("throws TokenExpiredError for an expired refresh token", () => {
    jest.useFakeTimers();
    const token = svc.generateRefreshToken({ sub: "user-1", email: "a@b.com" });
    jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // advance 8 days
    expect(() => useCase.execute(token)).toThrow(jwt.TokenExpiredError);
    jest.useRealTimers();
  });

  it("throws JsonWebTokenError for a tampered refresh token", () => {
    expect(() => useCase.execute("tampered.refresh.token")).toThrow(jwt.JsonWebTokenError);
  });
});
