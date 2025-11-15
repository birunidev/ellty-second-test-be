import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken } from "../utils/jwt";

function randomId(): string {
  if (typeof (global as any).crypto?.randomUUID === "function") {
    return (global as any).crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function issueRefreshToken(userId: number, username: string) {
  const jti = randomId();
  const token = signRefreshToken({ sub: userId, username, jti });
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      jti,
      token,
      expires_at: expiresAt,
      revoked_at: null,
      replaced_by: null,
      user: userId ? { connect: { id: userId } } : undefined,
    },
  });

  return { token, jti, expiresAt };
}

export async function rotateRefreshToken(
  oldJti: string,
  userId: number,
  username: string
) {
  const existing = await prisma.refreshToken.findUnique({
    where: { jti: oldJti },
  });
  if (!existing || existing.revoked_at) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }
  if (existing.expires_at <= new Date()) {
    throw new Error("EXPIRED_REFRESH_TOKEN");
  }

  const next = await issueRefreshToken(userId, username);
  await prisma.refreshToken.update({
    where: { jti: oldJti },
    data: { revoked_at: new Date(), replaced_by: next.jti },
  });

  const accessToken = signAccessToken({ sub: userId, username });
  return { accessToken, refreshToken: next.token };
}

export async function validateStoredRefreshToken(jti: string) {
  const record = await prisma.refreshToken.findUnique({
    where: { jti },
    include: { user: true },
  });
  if (!record) return { ok: false as const, code: "NOT_FOUND" };
  if (record.revoked_at) return { ok: false as const, code: "REVOKED" };
  if (record.expires_at <= new Date())
    return { ok: false as const, code: "EXPIRED" };
  return { ok: true as const, record };
}

export async function revokeRefreshToken(jti: string): Promise<boolean> {
  try {
    const record = await prisma.refreshToken.findUnique({
      where: { jti },
    });

    if (!record || record.revoked_at) {
      return false;
    }

    await prisma.refreshToken.update({
      where: { jti },
      data: { revoked_at: new Date() },
    });

    return true;
  } catch {
    return false;
  }
}
