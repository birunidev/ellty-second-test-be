import jwt from "jsonwebtoken";

type JwtPayload = Record<string, unknown> & { sub?: string | number };

const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "dev_access_secret";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "dev_refresh_secret";
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

export function signAccessToken(payload: JwtPayload): string {
  const expiresIn: any = ACCESS_TOKEN_EXPIRES_IN;
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn,
  });
}

export function signRefreshToken(payload: JwtPayload): string {
  const expiresIn: any = REFRESH_TOKEN_EXPIRES_IN;
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;
}
