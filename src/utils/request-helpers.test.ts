import { Request } from "express";
import {
  getAuthenticatedUser,
  withAuth,
  getAuthenticatedUserFromRequest,
  createAuthenticatedHandler,
} from "./request-helpers";

describe("request-helpers", () => {
  describe("getAuthenticatedUser", () => {
    it("should return user when authenticated", () => {
      const mockReq = {
        user: { sub: 1, username: "testuser" },
      } as Request;
      const user = getAuthenticatedUser(mockReq);
      expect(user).toEqual({ sub: 1, username: "testuser" });
    });

    it("should throw error when user not authenticated", () => {
      const mockReq = {} as Request;
      expect(() => getAuthenticatedUser(mockReq)).toThrow(
        "User not authenticated"
      );
    });
  });

  describe("withAuth", () => {
    it("should call handler with authenticated user", async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const mockReq = {
        user: { sub: 1, username: "testuser" },
      } as Request;

      const wrappedHandler = withAuth(mockHandler);
      const result = await wrappedHandler(mockReq);

      expect(mockHandler).toHaveBeenCalledWith({
        sub: 1,
        username: "testuser",
      });
      expect(result).toEqual({ success: true });
    });

    it("should return 401 when user not authenticated", async () => {
      const mockHandler = jest.fn();
      const mockReq = {} as Request;

      const wrappedHandler = withAuth(mockHandler);
      const result = await wrappedHandler(mockReq);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        status: 401,
        body: expect.objectContaining({
          success: false,
          message: "Unauthorized",
        }),
      });
    });

    it("should throw other errors", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error("Other error"));
      const mockReq = {
        user: { sub: 1, username: "testuser" },
      } as Request;

      const wrappedHandler = withAuth(mockHandler);
      await expect(wrappedHandler(mockReq)).rejects.toThrow("Other error");
    });
  });

  describe("getAuthenticatedUserFromRequest", () => {
    it("should return validated user when authenticated", () => {
      const mockReq = {
        user: { sub: 1, username: "testuser" },
      };
      const user = getAuthenticatedUserFromRequest(mockReq);
      expect(user).toEqual({ sub: 1, username: "testuser" });
    });

    it("should throw error when user not present", () => {
      const mockReq = {};
      expect(() => getAuthenticatedUserFromRequest(mockReq)).toThrow(
        "User not authenticated"
      );
    });

    it("should throw error when user is null", () => {
      const mockReq = { user: null };
      expect(() => getAuthenticatedUserFromRequest(mockReq)).toThrow(
        "User not authenticated"
      );
    });

    it("should throw error when user data is invalid", () => {
      const mockReq = { user: { sub: "invalid", username: "test" } };
      expect(() => getAuthenticatedUserFromRequest(mockReq)).toThrow(
        "Invalid user data"
      );
    });
  });

  describe("createAuthenticatedHandler", () => {
    it("should call handler with authenticated user and params", async () => {
      const mockHandler = jest.fn().mockResolvedValue({ success: true });
      const mockReq = {
        user: { sub: 1, username: "testuser" },
      };

      const wrappedHandler = createAuthenticatedHandler(mockHandler);
      const result = await wrappedHandler({
        params: { id: "123" },
        body: { name: "Test" },
        query: { page: "1" },
        req: mockReq,
      });

      expect(mockHandler).toHaveBeenCalledWith(
        { sub: 1, username: "testuser" },
        { id: "123" },
        { name: "Test" },
        { page: "1" }
      );
      expect(result).toEqual({ success: true });
    });

    it("should return 401 when user not authenticated", async () => {
      const mockHandler = jest.fn();
      const mockReq = {};

      const wrappedHandler = createAuthenticatedHandler(mockHandler);
      const result = await wrappedHandler({
        params: {},
        body: {},
        query: {},
        req: mockReq,
      });

      expect(mockHandler).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        status: 401,
        body: expect.objectContaining({
          success: false,
          message: "Unauthorized",
        }),
      });
    });

    it("should return 401 when user data is invalid", async () => {
      const mockHandler = jest.fn();
      const mockReq = { user: { sub: "invalid" } };

      const wrappedHandler = createAuthenticatedHandler(mockHandler);
      const result = await wrappedHandler({
        params: {},
        body: {},
        query: {},
        req: mockReq,
      });

      expect(mockHandler).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        status: 401,
        body: expect.objectContaining({
          success: false,
          message: "Unauthorized",
        }),
      });
    });

    it("should throw other errors", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error("Other error"));
      const mockReq = {
        user: { sub: 1, username: "testuser" },
      };

      const wrappedHandler = createAuthenticatedHandler(mockHandler);
      await expect(
        wrappedHandler({
          params: {},
          body: {},
          query: {},
          req: mockReq,
        })
      ).rejects.toThrow("Other error");
    });
  });
});
