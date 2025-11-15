import * as tokenService from "./token.service";
import { prisma } from "../lib/prisma";
import * as jwtUtils from "../utils/jwt";
import jwt from "jsonwebtoken";

jest.mock("../utils/jwt", () => ({
  signAccessToken: jest.fn(() => "access-token"),
  signRefreshToken: jest.fn(() => "refresh-token"),
}));

jest.mock("jsonwebtoken", () => ({
  decode: jest.fn(() => ({ exp: Math.floor(Date.now() / 1000) + 3600 })),
}));

describe("token.service", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    (prisma.refreshToken.findUnique as jest.Mock).mockReset?.();
    (prisma.refreshToken.create as jest.Mock).mockReset?.();
    (prisma.refreshToken.update as jest.Mock).mockReset?.();
  });

  describe("issueRefreshToken", () => {
    it("creates a refresh token record and returns token details", async () => {
      const createMock = jest
        .spyOn(prisma.refreshToken, "create")
        .mockResolvedValue({} as any);

      const result = await tokenService.issueRefreshToken(1, "u@example.com");

      expect(jwtUtils.signRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 1, username: "u@example.com" })
      );
      expect(jwt.decode).toHaveBeenCalledWith("refresh-token");
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            token: "refresh-token",
            user: { connect: { id: 1 } },
          }),
        })
      );
      expect(result.token).toBe("refresh-token");
      expect(typeof result.jti).toBe("string");
      expect(result.expiresAt instanceof Date).toBe(true);
    });
  });

  describe("rotateRefreshToken", () => {
    it("throws when not found", async () => {
      jest.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue(null);
      await expect(
        tokenService.rotateRefreshToken("missing", 1, "u@example.com")
      ).rejects.toThrow("INVALID_REFRESH_TOKEN");
    });

    it("throws when already revoked", async () => {
      jest
        .spyOn(prisma.refreshToken, "findUnique")
        .mockResolvedValue({ jti: "old", revoked_at: new Date() } as any);
      await expect(
        tokenService.rotateRefreshToken("old", 1, "u@example.com")
      ).rejects.toThrow("INVALID_REFRESH_TOKEN");
    });

    it("throws when expired", async () => {
      jest.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue({
        jti: "old",
        revoked_at: null,
        expires_at: new Date(Date.now() - 1000),
      } as any);
      await expect(
        tokenService.rotateRefreshToken("old", 1, "u@example.com")
      ).rejects.toThrow("EXPIRED_REFRESH_TOKEN");
    });

    it("issues a new token when valid and updates old", async () => {
      jest.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue({
        jti: "old",
        revoked_at: null,
        expires_at: new Date(Date.now() + 3600_000),
      } as any);
      const createSpy = jest
        .spyOn(prisma.refreshToken, "create")
        .mockResolvedValue({} as any);
      const updateSpy = jest
        .spyOn(prisma.refreshToken, "update")
        .mockResolvedValue({} as any);

      const res = await tokenService.rotateRefreshToken(
        "old",
        1,
        "u@example.com"
      );

      expect(createSpy).toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { jti: "old" },
          data: expect.any(Object),
        })
      );
      expect(jwtUtils.signAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 1, username: "u@example.com" })
      );
      expect(res).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
    });
  });

  describe("validateStoredRefreshToken", () => {
    it("returns NOT_FOUND when missing", async () => {
      jest.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue(null);
      const res = await tokenService.validateStoredRefreshToken("x");
      expect(res).toEqual({ ok: false, code: "NOT_FOUND" });
    });

    it("returns REVOKED when revoked", async () => {
      jest
        .spyOn(prisma.refreshToken, "findUnique")
        .mockResolvedValue({ revoked_at: new Date() } as any);
      const res = await tokenService.validateStoredRefreshToken("x");
      expect(res).toEqual({ ok: false, code: "REVOKED" });
    });

    it("returns EXPIRED when expired", async () => {
      jest.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue({
        revoked_at: null,
        expires_at: new Date(Date.now() - 1000),
      } as any);
      const res = await tokenService.validateStoredRefreshToken("x");
      expect(res).toEqual({ ok: false, code: "EXPIRED" });
    });

    it("returns ok with record when valid", async () => {
      const rec = {
        revoked_at: null,
        expires_at: new Date(Date.now() + 1000),
        user: { id: 1 },
      } as any;
      jest.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue(rec);
      const res = await tokenService.validateStoredRefreshToken("x");
      expect(res).toEqual({ ok: true, record: rec });
    });
  });

  describe("revokeRefreshToken", () => {
    it("returns false when token not found", async () => {
      jest.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue(null);
      const res = await tokenService.revokeRefreshToken("missing");
      expect(res).toBe(false);
    });

    it("returns false when token already revoked", async () => {
      jest.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue({
        jti: "x",
        revoked_at: new Date(),
      } as any);
      const res = await tokenService.revokeRefreshToken("x");
      expect(res).toBe(false);
    });

    it("returns true and revokes token when valid", async () => {
      const updateSpy = jest
        .spyOn(prisma.refreshToken, "update")
        .mockResolvedValue({} as any);
      jest.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue({
        jti: "x",
        revoked_at: null,
      } as any);
      const res = await tokenService.revokeRefreshToken("x");
      expect(res).toBe(true);
      expect(updateSpy).toHaveBeenCalledWith({
        where: { jti: "x" },
        data: { revoked_at: expect.any(Date) },
      });
    });

    it("returns false when update throws error", async () => {
      jest.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue({
        jti: "x",
        revoked_at: null,
      } as any);
      jest
        .spyOn(prisma.refreshToken, "update")
        .mockRejectedValue(new Error("DB error"));
      const res = await tokenService.revokeRefreshToken("x");
      expect(res).toBe(false);
    });
  });
});
