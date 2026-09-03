import { serialize } from "cookie";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { RegisterUseCase } from "@/modules/auth/application/use-cases/RegisterUseCase";
import { LoginUseCase } from "@/modules/auth/application/use-cases/LoginUseCase";
import { RefreshTokenUseCase } from "@/modules/auth/application/use-cases/RefreshTokenUseCase";
import { LogoutUseCase } from "@/modules/auth/application/use-cases/LogoutUseCase";
import { CompletePasswordSetupUseCase } from "@/modules/auth/application/use-cases/CompletePasswordSetupUseCase";
import { EmailAlreadyInUseError } from "@/modules/auth/domain/errors/EmailAlreadyInUseError";
import { InvalidCredentialsError } from "@/modules/auth/domain/errors/InvalidCredentialsError";
import { PasswordNotSetError } from "@/modules/auth/domain/errors/PasswordNotSetError";
import { PasswordSetupTokenInvalidError } from "@/modules/auth/domain/errors/PasswordSetupTokenInvalidError";
import { PasswordSetupTokenExpiredError } from "@/modules/auth/domain/errors/PasswordSetupTokenExpiredError";
import {
  REFRESH_TOKEN_COOKIE,
  refreshCookieOptions,
  clearCookieOptions,
} from "./cookieOptions";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const setPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly completePasswordSetupUseCase: CompletePasswordSetupUseCase
  ) {}

  async register(req: NextRequest): Promise<NextResponse> {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    try {
      const result = await this.registerUseCase.execute(parsed.data);
      return NextResponse.json(result, { status: 201 });
    } catch (err) {
      if (err instanceof EmailAlreadyInUseError) {
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      console.error("[AuthController.register] unexpected error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async login(req: NextRequest): Promise<NextResponse> {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    try {
      const { refreshToken, ...publicResult } = await this.loginUseCase.execute(
        parsed.data
      );
      const res = NextResponse.json(publicResult, { status: 200 });
      res.headers.set(
        "Set-Cookie",
        serialize(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions)
      );
      return res;
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        return NextResponse.json({ error: err.message }, { status: 401 });
      }
      if (err instanceof PasswordNotSetError) {
        return NextResponse.json({ error: "PasswordNotSet" }, { status: 403 });
      }
      console.error("[AuthController.login] unexpected error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async completeSetPassword(req: NextRequest): Promise<NextResponse> {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = setPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    try {
      const { refreshToken, ...publicResult } = await this.completePasswordSetupUseCase.execute(
        parsed.data
      );
      const res = NextResponse.json(publicResult, { status: 200 });
      res.headers.set(
        "Set-Cookie",
        serialize(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions)
      );
      return res;
    } catch (err) {
      if (err instanceof PasswordSetupTokenExpiredError) {
        return NextResponse.json({ error: "PasswordSetupTokenExpired" }, { status: 400 });
      }
      if (err instanceof PasswordSetupTokenInvalidError) {
        return NextResponse.json({ error: "PasswordSetupTokenInvalid" }, { status: 400 });
      }
      console.error("[AuthController.completeSetPassword] unexpected error:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async refresh(req: NextRequest): Promise<NextResponse> {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k.trim(), v.join("=")];
      })
    );
    const refreshToken = cookies[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      return NextResponse.json({ error: "Missing refresh token" }, { status: 401 });
    }

    try {
      const { accessToken, newRefreshToken } = this.refreshTokenUseCase.execute(refreshToken);
      const res = NextResponse.json({ accessToken }, { status: 200 });
      res.headers.set(
        "Set-Cookie",
        serialize(REFRESH_TOKEN_COOKIE, newRefreshToken, refreshCookieOptions)
      );
      return res;
    } catch (err) {
      const isExpired = err instanceof jwt.TokenExpiredError;
      return NextResponse.json(
        { error: isExpired ? "Refresh token expired" : "Invalid refresh token" },
        { status: 401 }
      );
    }
  }

  logout(_req: NextRequest): NextResponse {
    this.logoutUseCase.execute();
    const res = NextResponse.json({ message: "Logged out" }, { status: 200 });
    res.headers.set(
      "Set-Cookie",
      serialize(REFRESH_TOKEN_COOKIE, "", clearCookieOptions)
    );
    return res;
  }
}
