import express from "express";
import request from "supertest";
import { authMiddleware } from "./auth.middleware";
import { TokenExpiredError } from "jsonwebtoken";

jest.mock("../utils/jwt", () => ({
  verifyAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  signAccessToken: jest.requireActual("../utils/jwt").signAccessToken,
}));

jest.mock("../services/token.service", () => ({
  validateStoredRefreshToken: jest.fn(),
  rotateRefreshToken: jest.fn(),
}));

jest.mock("../utils/cookie", () => ({
  getAccessTokenFromCookie: jest.fn(),
  getRefreshTokenFromCookie: jest.fn(),
  setAccessTokenCookie: jest.fn(),
  setRefreshTokenCookie: jest.fn(),
}));

const { verifyAccessToken, verifyRefreshToken } =
  jest.requireMock("../utils/jwt");
const { validateStoredRefreshToken, rotateRefreshToken } = jest.requireMock(
  "../services/token.service"
);
const { getAccessTokenFromCookie, getRefreshTokenFromCookie } =
  jest.requireMock("../utils/cookie");

function buildApp() {
  const app = express();
  app.get("/protected", authMiddleware, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("authMiddleware", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 401 with no access token cookie", async () => {
    (getAccessTokenFromCookie as jest.Mock).mockReturnValue(undefined);
    const app = buildApp();
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
  });

  it("allows with valid access token", async () => {
    (getAccessTokenFromCookie as jest.Mock).mockReturnValue("valid.access");
    (verifyAccessToken as jest.Mock).mockReturnValue({
      sub: 1,
      username: "testuser",
    });
    const app = buildApp();
    const res = await request(app).get("/protected");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(res.headers["x-access-token"]).toBeUndefined();
    expect(res.headers["x-refresh-token"]).toBeUndefined();
  });

  it("rotates when access expired and refresh valid", async () => {
    (getAccessTokenFromCookie as jest.Mock).mockReturnValue("expired.access");
    (getRefreshTokenFromCookie as jest.Mock).mockReturnValue("refresh.jwt");
    (verifyAccessToken as jest.Mock).mockImplementation(() => {
      throw new TokenExpiredError("expired", new Date());
    });
    (verifyRefreshToken as jest.Mock).mockReturnValue({
      sub: 1,
      username: "testuser",
      jti: "jti-1",
    });
    (validateStoredRefreshToken as jest.Mock).mockResolvedValue({
      ok: true,
      record: {},
    });
    (rotateRefreshToken as jest.Mock).mockResolvedValue({
      accessToken: "new.access",
      refreshToken: "new.refresh",
    });

    const app = buildApp();
    const res = await request(app).get("/protected");

    expect(res.status).toBe(200);
    expect(res.headers["x-access-token"]).toBe("new.access");
    expect(res.headers["x-refresh-token"]).toBe("new.refresh");
  });

  it("returns 401 when both tokens invalid/expired", async () => {
    (getAccessTokenFromCookie as jest.Mock).mockReturnValue("expired.access");
    (getRefreshTokenFromCookie as jest.Mock).mockReturnValue("bad.refresh");
    (verifyAccessToken as jest.Mock).mockImplementation(() => {
      throw new TokenExpiredError("expired", new Date());
    });
    (verifyRefreshToken as jest.Mock).mockImplementation(() => {
      throw new Error("bad refresh");
    });

    const app = buildApp();
    const res = await request(app).get("/protected");

    expect(res.status).toBe(401);
  });

  it("returns 401 when access expired and no refresh cookie", async () => {
    (getAccessTokenFromCookie as jest.Mock).mockReturnValue("expired.access");
    (getRefreshTokenFromCookie as jest.Mock).mockReturnValue(undefined);
    (verifyAccessToken as jest.Mock).mockImplementation(() => {
      throw new TokenExpiredError("expired", new Date());
    });

    const app = buildApp();
    const res = await request(app).get("/protected");

    expect(res.status).toBe(401);
  });

  it("returns 401 when stored refresh token is invalid", async () => {
    (getAccessTokenFromCookie as jest.Mock).mockReturnValue("expired.access");
    (getRefreshTokenFromCookie as jest.Mock).mockReturnValue("refresh.jwt");
    (verifyAccessToken as jest.Mock).mockImplementation(() => {
      throw new TokenExpiredError("expired", new Date());
    });
    (verifyRefreshToken as jest.Mock).mockReturnValue({
      sub: 1,
      username: "testuser",
      jti: "jti-1",
    });
    (validateStoredRefreshToken as jest.Mock).mockResolvedValue({
      ok: false,
      code: "NOT_FOUND",
    });

    const app = buildApp();
    const res = await request(app).get("/protected");

    expect(res.status).toBe(401);
  });

  it("returns 401 when rotation throws", async () => {
    (getAccessTokenFromCookie as jest.Mock).mockReturnValue("expired.access");
    (getRefreshTokenFromCookie as jest.Mock).mockReturnValue("refresh.jwt");
    (verifyAccessToken as jest.Mock).mockImplementation(() => {
      throw new TokenExpiredError("expired", new Date());
    });
    (verifyRefreshToken as jest.Mock).mockReturnValue({
      sub: 1,
      username: "testuser",
      jti: "jti-1",
    });
    (validateStoredRefreshToken as jest.Mock).mockResolvedValue({
      ok: true,
      record: {},
    });
    (rotateRefreshToken as jest.Mock).mockRejectedValue(
      new Error("rotate failed")
    );

    const app = buildApp();
    const res = await request(app).get("/protected");

    expect(res.status).toBe(401);
  });
});
