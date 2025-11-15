import { NextFunction, Request, Response } from "express";
import { TokenExpiredError } from "jsonwebtoken";
import { verifyAccessToken, verifyRefreshToken } from "../utils/jwt";
import {
  rotateRefreshToken,
  validateStoredRefreshToken,
} from "../services/token.service";
import {
  getAccessTokenFromCookie,
  getRefreshTokenFromCookie,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "../utils/cookie";

function sendUnauthorized(res: Response): void {
  res
    .status(401)
    .json({ message: "Unauthorized", statusCode: 401, success: false });
}

function isTokenExpiredError(err: unknown): boolean {
  return (
    err instanceof TokenExpiredError ||
    (err as { name?: string })?.name === "TokenExpiredError"
  );
}

function parseUserId(sub: string | number | undefined): number {
  if (typeof sub === "number") return sub;
  return parseInt(String(sub), 10);
}

function setUserFromPayload(
  req: Request,
  payload: { sub?: string | number; username?: string }
): void {
  req.user = {
    sub: parseUserId(payload.sub),
    username: String(payload.username || ""),
  };
}

async function handleRefreshTokenFlow(
  req: Request,
  res: Response,
  refreshToken: string
): Promise<boolean> {
  try {
    const refreshPayload = verifyRefreshToken(refreshToken) as {
      sub?: number;
      jti?: string;
      username?: string;
    };

    const subject = refreshPayload.sub;
    const jti = refreshPayload.jti;

    if (!subject || !jti) {
      return false;
    }

    const stored = await validateStoredRefreshToken(jti);
    if (!stored.ok) {
      return false;
    }

    const rotated = await rotateRefreshToken(
      jti,
      subject,
      refreshPayload.username || ""
    );

    res.setHeader("x-access-token", rotated.accessToken);
    res.setHeader("x-refresh-token", rotated.refreshToken);
    setAccessTokenCookie(res, rotated.accessToken);
    setRefreshTokenCookie(res, rotated.refreshToken);

    setUserFromPayload(req, refreshPayload);
    return true;
  } catch {
    return false;
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const accessToken = getAccessTokenFromCookie(req);

  if (!accessToken) {
    const refreshToken = getRefreshTokenFromCookie(req);
    if (!refreshToken) {
      sendUnauthorized(res);
      return;
    }
    const refreshed = await handleRefreshTokenFlow(req, res, refreshToken);
    if (refreshed) {
      next();
    } else {
      sendUnauthorized(res);
    }
    return;
  }

  try {
    const payload = verifyAccessToken(accessToken);
    setUserFromPayload(req, payload);
    next();
    return;
  } catch (err) {
    if (!isTokenExpiredError(err)) {
      sendUnauthorized(res);
      return;
    }
  }

  const refreshToken = getRefreshTokenFromCookie(req);

  if (!refreshToken) {
    sendUnauthorized(res);
    return;
  }

  const refreshed = await handleRefreshTokenFlow(req, res, refreshToken);
  if (refreshed) {
    next();
  } else {
    sendUnauthorized(res);
  }
}
