import request from "supertest";
import { app } from "../app";
import { registerUser, loginUser, getUserById } from "../services/auth.service";
import { apiBasePath } from "../config/api";
import { verifyAccessToken } from "../utils/jwt";

jest.mock("../services/auth.service", () => ({
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  getUserById: jest.fn(),
}));

jest.mock("../utils/jwt", () => ({
  verifyAccessToken: jest.fn(),
  signAccessToken: jest.fn(),
}));

jest.mock("../services/token.service", () => ({
  issueRefreshToken: jest.fn().mockResolvedValue({
    token: "refresh.token",
    jti: "jti-1",
    expiresAt: new Date(Date.now() + 60_000),
  }),
}));

jest.mock("../utils/cookie", () => ({
  getAccessTokenFromCookie: jest.fn(),
  getRefreshTokenFromCookie: jest.fn(),
  setAccessTokenCookie: jest.fn(),
  setRefreshTokenCookie: jest.fn(),
}));

jest.mock("../utils/request-helpers", () => ({
  getAuthenticatedUserFromRequest: jest.fn(),
}));

jest.mock("../middlewares/auth.middleware", () => ({
  authMiddleware: jest.fn((req, res, next) => {
    // Mock middleware - skip cookie checking and let the handler use getAuthenticatedUserFromRequest
    // The handler will handle authentication errors via its own error handling
    next();
  }),
}));

const { getAccessTokenFromCookie } = jest.requireMock("../utils/cookie");
const { getAuthenticatedUserFromRequest } = jest.requireMock(
  "../utils/request-helpers"
);

const prefix = apiBasePath;

describe("POST /api/v1/auth/register", () => {
  it("creates user and returns 201", async () => {
    (registerUser as jest.Mock).mockResolvedValue({
      ok: true,
      user: {
        id: 1,
        name: "Alice",
        username: "alice",
        createdAt: new Date(),
      },
    });
    const res = await request(app).post(`${prefix}/auth/register`).send({
      name: "Alice",
      username: "alice",
      password: "Password123",
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      success: true,
      statusCode: 201,
      message: "User registered successfully",
    });
    expect(res.body.data).toMatchObject({
      id: 1,
      name: "Alice",
      username: "alice",
    });
  });

  it("rejects duplicate username", async () => {
    (registerUser as jest.Mock).mockResolvedValue({
      ok: false,
      code: "USERNAME_IN_USE",
    });
    const res = await request(app)
      .post(`${prefix}/auth/register`)
      .send({ name: "Bob", username: "bob", password: "Password123" });
    expect(res.status).toBe(409);
  });

  it("rejects invalid payload", async () => {
    const res = await request(app)
      .post(`${prefix}/auth/register`)
      .send({ name: "", username: "", password: "short" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/auth/login", () => {
  it("returns 200 with correct credentials", async () => {
    (loginUser as jest.Mock).mockResolvedValue({
      ok: true,
      user: { id: 3, name: "Charlie", username: "charlie" },
    });
    const res = await request(app)
      .post(`${prefix}/auth/login`)
      .send({ username: "charlie", password: "Password123" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      statusCode: 200,
      message: "Login successful",
    });
    expect(res.body.data).toMatchObject({
      id: 3,
      name: "Charlie",
      username: "charlie",
    });
  });

  it("returns 401 for bad credentials (no user)", async () => {
    (loginUser as jest.Mock).mockResolvedValue({
      ok: false,
      code: "INVALID_CREDENTIALS",
    });
    const res = await request(app)
      .post(`${prefix}/auth/login`)
      .send({ username: "nobody", password: "Password123" });
    expect(res.status).toBe(401);
  });

  it("rejects invalid payload", async () => {
    const res = await request(app)
      .post(`${prefix}/auth/login`)
      .send({ username: "", password: "short" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/auth/me", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when no token provided", async () => {
    (getAuthenticatedUserFromRequest as jest.Mock).mockImplementation(() => {
      throw new Error("User not authenticated");
    });
    const res = await request(app).get(`${prefix}/auth/me`);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when token is invalid", async () => {
    (getAuthenticatedUserFromRequest as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid user data");
    });
    const res = await request(app).get(`${prefix}/auth/me`);
    expect(res.status).toBe(401);
  });

  it("returns 200 with user data when authenticated", async () => {
    (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
      sub: 1,
      username: "testuser",
    });
    (getUserById as jest.Mock).mockResolvedValue({
      ok: true,
      user: {
        id: 1,
        name: "Test User",
        username: "testuser",
      },
    });

    const res = await request(app).get(`${prefix}/auth/me`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      statusCode: 200,
      message: "User information retrieved successfully",
    });
    expect(res.body.data).toMatchObject({
      id: 1,
      name: "Test User",
      username: "testuser",
    });
    expect(getUserById).toHaveBeenCalledWith(1);
  });

  it("returns 404 when user not found", async () => {
    (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
      sub: 999,
      username: "notfound",
    });
    (getUserById as jest.Mock).mockResolvedValue({
      ok: false,
      code: "USER_NOT_FOUND",
    });

    const res = await request(app).get(`${prefix}/auth/me`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("User not found");
  });
});
