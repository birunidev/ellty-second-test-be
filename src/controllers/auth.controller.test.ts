import {
  handleRegister,
  handleLogin,
  handleMe,
  handleLogout,
} from "./auth.controller";
import { registerUser, loginUser, getUserById } from "../services/auth.service";
import { signAccessToken, verifyRefreshToken } from "../utils/jwt";
import {
  issueRefreshToken,
  revokeRefreshToken,
} from "../services/token.service";
import { getAuthenticatedUserFromRequest } from "../utils/request-helpers";
import { Response, Request } from "express";
import {
  getRefreshTokenFromCookie,
  clearAllAuthCookies,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from "../utils/cookie";

jest.mock("../services/auth.service");
jest.mock("../utils/jwt");
jest.mock("../services/token.service");
jest.mock("../utils/request-helpers");
jest.mock("../utils/cookie", () => ({
  setAccessTokenCookie: jest.fn(),
  setRefreshTokenCookie: jest.fn(),
  getRefreshTokenFromCookie: jest.fn(),
  clearAllAuthCookies: jest.fn(),
}));

describe("auth.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (signAccessToken as jest.Mock).mockReturnValue("access-token");
    (issueRefreshToken as jest.Mock).mockResolvedValue({
      token: "refresh-token",
    });
  });

  describe("handleRegister", () => {
    it("should return error when username is in use", async () => {
      (registerUser as jest.Mock).mockResolvedValue({
        ok: false,
        code: "USERNAME_IN_USE",
      });

      const result = await handleRegister({
        name: "Test",
        username: "testuser",
        password: "password123",
      });

      expect(result.status).toBe(409);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Username already registered");
    });

    it("should return error when registration fails", async () => {
      (registerUser as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const result = await handleRegister({
        name: "Test",
        username: "testuser",
        password: "password123",
      });

      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Internal server error");
    });

    it("should return success when registration succeeds", async () => {
      const mockUser = {
        id: 1,
        name: "Test User",
        username: "testuser",
        createdAt: new Date("2024-01-01"),
      };

      (registerUser as jest.Mock).mockResolvedValue({
        ok: true,
        user: mockUser,
      });

      const result = await handleRegister({
        name: "Test User",
        username: "testuser",
        password: "password123",
      });

      expect(result.status).toBe(201);
      expect(result.body.success).toBe(true);
      if (result.body.success) {
        expect(result.body.data).toEqual({
          id: 1,
          name: "Test User",
          username: "testuser",
        });
      }
      expect(signAccessToken).not.toHaveBeenCalled();
      expect(issueRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe("handleLogin", () => {
    const createMockResponse = (): Partial<Response> => {
      const res = {
        cookie: jest.fn(),
      } as any;
      return res;
    };

    it("should return error when credentials are invalid", async () => {
      (loginUser as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const mockRes = createMockResponse();
      const result = await handleLogin(
        {
          username: "testuser",
          password: "wrongpassword",
        },
        mockRes as Response
      );

      expect(result.status).toBe(401);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Invalid credentials");
    });

    it("should return success when login succeeds", async () => {
      const mockUser = {
        id: 1,
        name: "Test User",
        username: "testuser",
        createdAt: new Date("2024-01-01"),
      };

      (loginUser as jest.Mock).mockResolvedValue({
        ok: true,
        user: mockUser,
      });
      (signAccessToken as jest.Mock).mockReturnValue("access-token");
      (issueRefreshToken as jest.Mock).mockResolvedValue({
        token: "refresh-token",
      });

      const mockRes = createMockResponse();
      const result = await handleLogin(
        {
          username: "testuser",
          password: "password123",
        },
        mockRes as Response
      );

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      if (result.body.success) {
        expect(result.body.data).toEqual({
          id: 1,
          name: "Test User",
          username: "testuser",
        });
      }
      expect(signAccessToken).toHaveBeenCalledWith({
        sub: 1,
        username: "testuser",
      });
      expect(issueRefreshToken).toHaveBeenCalledWith(1, "testuser");
      expect(setAccessTokenCookie).toHaveBeenCalledWith(
        mockRes,
        "access-token"
      );
      expect(setRefreshTokenCookie).toHaveBeenCalledWith(
        mockRes,
        "refresh-token"
      );
    });
  });

  describe("handleMe", () => {
    it("should return error when user is not authenticated", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockImplementation(() => {
        throw new Error("User not authenticated");
      });

      const result = await handleMe({});

      expect(result.status).toBe(401);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Unauthorized");
    });

    it("should return error when user data is invalid", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid user data");
      });

      const result = await handleMe({});

      expect(result.status).toBe(401);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Unauthorized");
    });

    it("should return error when user is not found", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
        sub: 999,
        username: "notfound",
      });
      (getUserById as jest.Mock).mockResolvedValue({
        ok: false,
        code: "USER_NOT_FOUND",
      });

      const result = await handleMe({
        user: { sub: 999, username: "notfound" },
      });

      expect(result.status).toBe(404);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("User not found");
    });

    it("should return success with user data when user is found", async () => {
      const mockUser = {
        id: 1,
        name: "Test User",
        username: "testuser",
      };

      (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
        sub: 1,
        username: "testuser",
      });
      (getUserById as jest.Mock).mockResolvedValue({
        ok: true,
        user: mockUser,
      });

      const result = await handleMe({
        user: { sub: 1, username: "testuser" },
      });

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      if (result.body.success) {
        expect(result.body.data).toEqual({
          id: 1,
          name: "Test User",
          username: "testuser",
        });
        expect(result.body.message).toBe(
          "User information retrieved successfully"
        );
      }
      expect(getUserById).toHaveBeenCalledWith(1);
    });
  });

  describe("handleLogout", () => {
    const createMockRequest = (): Partial<Request> => {
      return {
        cookies: {},
      } as any;
    };

    const createMockResponse = (): Partial<Response> => {
      return {
        clearCookie: jest.fn(),
      } as any;
    };

    it("should logout successfully when refresh token exists and is valid", async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      (getRefreshTokenFromCookie as jest.Mock).mockReturnValue("refresh-token");
      (verifyRefreshToken as jest.Mock).mockReturnValue({ jti: "jti-123" });
      (revokeRefreshToken as jest.Mock).mockResolvedValue(undefined);

      const result = await handleLogout(
        mockReq as Request,
        mockRes as Response
      );

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.message).toBe("Logout successful");
      expect(revokeRefreshToken).toHaveBeenCalledWith("jti-123");
      expect(clearAllAuthCookies).toHaveBeenCalledWith(mockRes);
    });

    it("should logout successfully when refresh token exists but has no jti", async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      (getRefreshTokenFromCookie as jest.Mock).mockReturnValue("refresh-token");
      (verifyRefreshToken as jest.Mock).mockReturnValue({});

      const result = await handleLogout(
        mockReq as Request,
        mockRes as Response
      );

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(revokeRefreshToken).not.toHaveBeenCalled();
      expect(clearAllAuthCookies).toHaveBeenCalledWith(mockRes);
    });

    it("should logout successfully when refresh token is invalid", async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      (getRefreshTokenFromCookie as jest.Mock).mockReturnValue("invalid-token");
      (verifyRefreshToken as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const result = await handleLogout(
        mockReq as Request,
        mockRes as Response
      );

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(clearAllAuthCookies).toHaveBeenCalledWith(mockRes);
    });

    it("should logout successfully when no refresh token", async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      (getRefreshTokenFromCookie as jest.Mock).mockReturnValue(undefined);

      const result = await handleLogout(
        mockReq as Request,
        mockRes as Response
      );

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(clearAllAuthCookies).toHaveBeenCalledWith(mockRes);
    });

    it("should logout successfully even when revoke throws error", async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      (getRefreshTokenFromCookie as jest.Mock).mockReturnValue("refresh-token");
      (verifyRefreshToken as jest.Mock).mockReturnValue({ jti: "jti-123" });
      (revokeRefreshToken as jest.Mock).mockRejectedValue(
        new Error("Revoke failed")
      );

      const result = await handleLogout(
        mockReq as Request,
        mockRes as Response
      );

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(clearAllAuthCookies).toHaveBeenCalledWith(mockRes);
    });
  });
});
