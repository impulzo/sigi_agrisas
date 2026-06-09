import jwt from "jsonwebtoken";
import {
  TokenService,
  TokenPayload,
} from "@/modules/auth/application/ports/TokenService";

export class JwtTokenService implements TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor() {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!accessSecret || !refreshSecret) {
      throw new Error(
        "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined"
      );
    }
    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
  }

  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(
      { email: payload.email, roles: payload.roles ?? [], branchId: payload.branchId ?? null },
      this.accessSecret,
      { algorithm: "HS256", expiresIn: "15m", subject: payload.sub }
    );
  }

  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(
      { email: payload.email, roles: payload.roles ?? [], branchId: payload.branchId ?? null },
      this.refreshSecret,
      { algorithm: "HS256", expiresIn: "7d", subject: payload.sub }
    );
  }

  verifyAccessToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.accessSecret) as jwt.JwtPayload;
    return {
      sub: decoded.sub as string,
      email: decoded.email as string,
      roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      branchId: (decoded.branchId as string | null) ?? null,
    };
  }

  verifyRefreshToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.refreshSecret) as jwt.JwtPayload;
    return {
      sub: decoded.sub as string,
      email: decoded.email as string,
      roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      branchId: (decoded.branchId as string | null) ?? null,
    };
  }
}
