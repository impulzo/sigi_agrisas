import { CookieSerializeOptions } from "cookie";

export const REFRESH_TOKEN_COOKIE = "refreshToken";

export const refreshCookieOptions: CookieSerializeOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

export const clearCookieOptions: CookieSerializeOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 0,
};
