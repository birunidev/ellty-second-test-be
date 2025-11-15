import { Response, Request } from "express";

const ACCESS_TOKEN_COOKIE_NAME = "accessToken";
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000;
  }
}

function getCookieOptions(maxAge: number) {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = isProduction ? ("none" as const) : ("lax" as const);

  // When sameSite is "none", secure MUST be true (required by browsers)
  const secure = sameSite === "none" ? true : isProduction;

  return {
    httpOnly: true,
    secure: secure,
    sameSite: sameSite,
    maxAge: maxAge,
    path: "/",
    // Don't set domain for cross-origin cookies - let browser handle it
    // Setting domain can cause issues with cross-origin requests
  };
}

export function setAccessTokenCookie(res: Response, token: string): void {
  const maxAge = parseExpiresIn(ACCESS_TOKEN_EXPIRES_IN);
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, token, getCookieOptions(maxAge));
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  const maxAge = parseExpiresIn(REFRESH_TOKEN_EXPIRES_IN);
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, getCookieOptions(maxAge));
}

export function getAccessTokenFromCookie(req: Request): string | undefined {
  if (
    req.cookies &&
    typeof req.cookies === "object" &&
    ACCESS_TOKEN_COOKIE_NAME in req.cookies
  ) {
    const token = req.cookies[ACCESS_TOKEN_COOKIE_NAME];
    if (token && typeof token === "string") {
      return token;
    }
  }

  return undefined;
}

export function getRefreshTokenFromCookie(req: Request): string | undefined {
  if (
    req.cookies &&
    typeof req.cookies === "object" &&
    REFRESH_TOKEN_COOKIE_NAME in req.cookies
  ) {
    const token = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
    if (token && typeof token === "string") {
      return token;
    }
  }

  return undefined;
}

export function clearAccessTokenCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = isProduction ? ("none" as const) : ("lax" as const);
  const secure = sameSite === "none" ? true : isProduction;

  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: secure,
    sameSite: sameSite,
    path: "/",
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = isProduction ? ("none" as const) : ("lax" as const);
  const secure = sameSite === "none" ? true : isProduction;

  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: secure,
    sameSite: sameSite,
    path: "/",
  });
}

export function clearAllAuthCookies(res: Response): void {
  clearAccessTokenCookie(res);
  clearRefreshTokenCookie(res);
}
