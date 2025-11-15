import { Request, Response } from "express";
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  getAccessTokenFromCookie,
  getRefreshTokenFromCookie,
  clearAccessTokenCookie,
  clearRefreshTokenCookie,
  clearAllAuthCookies,
} from "./cookie";

describe("cookie utils", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      cookies: {},
      headers: {},
    };
    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  describe("setAccessTokenCookie", () => {
    it("should set access token cookie with correct options", () => {
      setAccessTokenCookie(mockResponse as Response, "test-access-token");
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "accessToken",
        "test-access-token",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
      );
    });

    it("should use secure in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      setAccessTokenCookie(mockResponse as Response, "test-token");
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "accessToken",
        "test-token",
        expect.objectContaining({
          secure: true,
        })
      );
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("setRefreshTokenCookie", () => {
    it("should set refresh token cookie with correct options", () => {
      setRefreshTokenCookie(mockResponse as Response, "test-refresh-token");
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "test-refresh-token",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
      );
    });
  });

  describe("getAccessTokenFromCookie", () => {
    it("should return access token from cookie", () => {
      mockRequest.cookies = { accessToken: "test-access-token" };
      const token = getAccessTokenFromCookie(mockRequest as Request);
      expect(token).toBe("test-access-token");
    });

    it("should return undefined when cookie not present", () => {
      const token = getAccessTokenFromCookie(mockRequest as Request);
      expect(token).toBeUndefined();
    });

    it("should return undefined when cookies is undefined", () => {
      mockRequest.cookies = undefined;
      const token = getAccessTokenFromCookie(mockRequest as Request);
      expect(token).toBeUndefined();
    });
  });

  describe("getRefreshTokenFromCookie", () => {
    it("should return refresh token from cookie", () => {
      mockRequest.cookies = { refreshToken: "test-refresh-token" };
      const token = getRefreshTokenFromCookie(mockRequest as Request);
      expect(token).toBe("test-refresh-token");
    });

    it("should return undefined when cookie not present", () => {
      const token = getRefreshTokenFromCookie(mockRequest as Request);
      expect(token).toBeUndefined();
    });
  });

  describe("clearAccessTokenCookie", () => {
    it("should clear access token cookie", () => {
      clearAccessTokenCookie(mockResponse as Response);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        "accessToken",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
      );
    });

    it("should use secure in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      clearAccessTokenCookie(mockResponse as Response);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        "accessToken",
        expect.objectContaining({
          secure: true,
        })
      );
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("clearRefreshTokenCookie", () => {
    it("should clear refresh token cookie", () => {
      clearRefreshTokenCookie(mockResponse as Response);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        "refreshToken",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
      );
    });
  });

  describe("clearAllAuthCookies", () => {
    it("should clear both access and refresh token cookies", () => {
      clearAllAuthCookies(mockResponse as Response);
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        "accessToken",
        expect.any(Object)
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        "refreshToken",
        expect.any(Object)
      );
    });
  });
});
