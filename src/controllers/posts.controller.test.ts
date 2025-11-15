import {
  handleCreatePost,
  handleReplyToNode,
  handleGetPostTree,
  handleGetFlatDiscussion,
  handleGetPost,
  handleGetAllPosts,
} from "./posts.controller";
import {
  createPost,
  replyToNode,
  getPostTree,
  getFlatDiscussion,
  getPostById,
  getAllPosts,
} from "../services/posts.service";
import { getAuthenticatedUserFromRequest } from "../utils/request-helpers";
import { Request } from "express";

jest.mock("../services/posts.service");
jest.mock("../utils/request-helpers");

describe("posts.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleCreatePost", () => {
    it("should return error when user is not authenticated", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockImplementation(() => {
        throw new Error("User not authenticated");
      });

      const result = await handleCreatePost({ initialNumber: 6 }, {} as Request);

      expect(result.status).toBe(401);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Unauthorized");
    });

    it("should return error when user data is invalid", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid user data");
      });

      const result = await handleCreatePost({ initialNumber: 6 }, {} as Request);

      expect(result.status).toBe(401);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Unauthorized");
    });

    it("should return error when post creation fails", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
        sub: 1,
        username: "testuser",
      });
      (createPost as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const result = await handleCreatePost({ initialNumber: 6 }, {
        user: { sub: 1, username: "testuser" },
      } as any);

      expect(result.status).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Failed to create post");
    });

    it("should return success when post is created", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
        sub: 1,
        username: "testuser",
      });
      (createPost as jest.Mock).mockResolvedValue({
        ok: true,
        post: {
          id: 1,
          user_id: 1,
          username: "testuser",
          initial_number: 6,
          created_at: new Date("2024-01-01"),
        },
      });

      const result = await handleCreatePost({ initialNumber: 6 }, {
        user: { sub: 1, username: "testuser" },
      } as any);

      expect(result.status).toBe(201);
      expect(result.body.success).toBe(true);
      if (result.body.success) {
        expect(result.body.data).toEqual({ postId: 1 });
        expect(result.body.message).toBe("Post created successfully");
      }
      expect(createPost).toHaveBeenCalledWith(1, 6);
    });

    it("should throw error when unexpected error occurs", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
        sub: 1,
        username: "testuser",
      });
      (createPost as jest.Mock).mockRejectedValue(new Error("Unexpected error"));

      await expect(
        handleCreatePost({ initialNumber: 6 }, {
          user: { sub: 1, username: "testuser" },
        } as any)
      ).rejects.toThrow("Unexpected error");
    });
  });

  describe("handleReplyToNode", () => {
    it("should return error when user is not authenticated", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockImplementation(() => {
        throw new Error("User not authenticated");
      });

      const result = await handleReplyToNode(
        { parentId: null, operation: "+", operandValue: 10 },
        { postId: "1" },
        {} as Request
      );

      expect(result.status).toBe(401);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Unauthorized");
    });

    it("should return error when post ID is invalid", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
        sub: 1,
        username: "testuser",
      });

      const result = await handleReplyToNode(
        { parentId: null, operation: "+", operandValue: 10 },
        { postId: "invalid" },
        { user: { sub: 1, username: "testuser" } } as any
      );

      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Invalid post ID");
    });

    it("should return error when post not found", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
        sub: 1,
        username: "testuser",
      });
      (replyToNode as jest.Mock).mockResolvedValue({
        ok: false,
        code: "POST_NOT_FOUND",
      });

      const result = await handleReplyToNode(
        { parentId: null, operation: "+", operandValue: 10 },
        { postId: "999" },
        { user: { sub: 1, username: "testuser" } } as any
      );

      expect(result.status).toBe(404);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Post not found");
    });

    it("should return error when parent node not found", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
        sub: 1,
        username: "testuser",
      });
      (replyToNode as jest.Mock).mockResolvedValue({
        ok: false,
        code: "PARENT_NODE_NOT_FOUND",
      });

      const result = await handleReplyToNode(
        { parentId: 999, operation: "+", operandValue: 10 },
        { postId: "1" },
        { user: { sub: 1, username: "testuser" } } as any
      );

      expect(result.status).toBe(404);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Parent node not found");
    });

    it("should return error when parent node mismatch", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
        sub: 1,
        username: "testuser",
      });
      (replyToNode as jest.Mock).mockResolvedValue({
        ok: false,
        code: "PARENT_NODE_MISMATCH",
      });

      const result = await handleReplyToNode(
        { parentId: 2, operation: "+", operandValue: 10 },
        { postId: "1" },
        { user: { sub: 1, username: "testuser" } } as any
      );

      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe(
        "Parent node does not belong to this post"
      );
    });

    it("should return error on calculation error", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
        sub: 1,
        username: "testuser",
      });
      (replyToNode as jest.Mock).mockResolvedValue({
        ok: false,
        code: "CALCULATION_ERROR",
        message: "Division by zero is not allowed",
      });

      const result = await handleReplyToNode(
        { parentId: null, operation: "/", operandValue: 0 },
        { postId: "1" },
        { user: { sub: 1, username: "testuser" } } as any
      );

      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Division by zero is not allowed");
    });

    it("should return error when reply fails with unknown error code", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
        sub: 1,
        username: "testuser",
      });
      (replyToNode as jest.Mock).mockResolvedValue({
        ok: false,
        code: "UNKNOWN_ERROR",
      });

      const result = await handleReplyToNode(
        { parentId: null, operation: "+", operandValue: 10 },
        { postId: "1" },
        { user: { sub: 1, username: "testuser" } } as any
      );

      expect(result.status).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Failed to create reply");
    });

    it("should return error when node is null after creation", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
        sub: 1,
        username: "testuser",
      });
      (replyToNode as jest.Mock).mockResolvedValue({
        ok: true,
        node: null,
      });

      const result = await handleReplyToNode(
        { parentId: null, operation: "+", operandValue: 10 },
        { postId: "1" },
        { user: { sub: 1, username: "testuser" } } as any
      );

      expect(result.status).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Failed to create reply");
    });

    it("should throw error when unexpected error occurs", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
        sub: 1,
        username: "testuser",
      });
      (replyToNode as jest.Mock).mockRejectedValue(new Error("Unexpected error"));

      await expect(
        handleReplyToNode(
          { parentId: null, operation: "+", operandValue: 10 },
          { postId: "1" },
          { user: { sub: 1, username: "testuser" } } as any
        )
      ).rejects.toThrow("Unexpected error");
    });

    it("should return success when reply is created", async () => {
      (getAuthenticatedUserFromRequest as jest.Mock).mockReturnValue({
        sub: 2,
        username: "user2",
      });
      (replyToNode as jest.Mock).mockResolvedValue({
        ok: true,
        node: {
          id: 2,
          post_id: 1,
          parent_id: null,
          user_id: 2,
          username: "user2",
          operation: "+",
          operand_value: 10,
          result_value: 16,
          depth: 0,
          created_at: new Date("2024-01-01"),
        },
      });

      const result = await handleReplyToNode(
        { parentId: null, operation: "+", operandValue: 10 },
        { postId: "1" },
        { user: { sub: 2, username: "user2" } } as any
      );

      expect(result.status).toBe(201);
      expect(result.body.success).toBe(true);
      if (result.body.success) {
        expect(result.body.data).toEqual({
          id: 2,
          operation: "+",
          operand: 10,
          value: 16,
          user_id: 2,
          username: "user2",
          children: [],
        });
        expect(result.body.message).toBe("Reply created successfully");
      }
      expect(replyToNode).toHaveBeenCalledWith(2, 1, null, "+", 10);
    });
  });

  describe("handleGetPostTree", () => {
    it("should return error when post ID is invalid", async () => {
      const result = await handleGetPostTree({ postId: "invalid" });

      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Invalid post ID");
    });

    it("should return error when post not found", async () => {
      (getPostTree as jest.Mock).mockResolvedValue({
        ok: false,
        code: "POST_NOT_FOUND",
      });

      const result = await handleGetPostTree({ postId: "999" });

      expect(result.status).toBe(404);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Post not found");
    });

    it("should return success with post tree", async () => {
      const mockTree = {
        id: 1,
        value: 6,
        operation: null,
        operand: null,
        user_id: 1,
        username: "user1",
        created_at: "2024-01-01T00:00:00.000Z",
        children: [
          {
            id: 2,
            operation: "*",
            operand: 3,
            value: 18,
            user_id: 2,
            username: "user2",
            created_at: "2024-01-01T00:00:00.000Z",
            children: [],
          },
        ],
      };

      (getPostTree as jest.Mock).mockResolvedValue({
        ok: true,
        tree: mockTree,
      });

      const result = await handleGetPostTree({ postId: "1" });

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      if (result.body.success) {
        expect(result.body.data).toEqual(mockTree);
        expect(result.body.message).toBe("Post tree retrieved successfully");
      }
      expect(getPostTree).toHaveBeenCalledWith(1);
    });

    it("should return error when getPostTree fails with unknown error", async () => {
      (getPostTree as jest.Mock).mockResolvedValue({
        ok: false,
        code: "UNKNOWN_ERROR",
      });

      const result = await handleGetPostTree({ postId: "1" });

      expect(result.status).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Failed to retrieve post tree");
    });
  });

  describe("handleGetFlatDiscussion", () => {
    it("should return error when post ID is invalid", async () => {
      const result = await handleGetFlatDiscussion({ postId: "invalid" });

      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Invalid post ID");
    });

    it("should return error when post not found", async () => {
      (getFlatDiscussion as jest.Mock).mockResolvedValue({
        ok: false,
        code: "POST_NOT_FOUND",
      });

      const result = await handleGetFlatDiscussion({ postId: "999" });

      expect(result.status).toBe(404);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Post not found");
    });

    it("should return success with flat discussion", async () => {
      const mockNodes = [
        {
          id: 2,
          post_id: 1,
          parent_id: null,
          user_id: 2,
          username: "user2",
          operation: "*",
          operand_value: 3,
          result_value: 18,
          depth: 0,
          created_at: "2024-01-01T10:00:00.000Z",
        },
        {
          id: 3,
          post_id: 1,
          parent_id: 2,
          user_id: 3,
          username: "user3",
          operation: "+",
          operand_value: 4,
          result_value: 22,
          depth: 1,
          created_at: "2024-01-01T11:00:00.000Z",
        },
      ];

      (getFlatDiscussion as jest.Mock).mockResolvedValue({
        ok: true,
        nodes: mockNodes,
      });

      const result = await handleGetFlatDiscussion({ postId: "1" });

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      if (result.body.success) {
        expect(result.body.data).toEqual(mockNodes);
        expect(result.body.message).toBe("Discussion retrieved successfully");
      }
      expect(getFlatDiscussion).toHaveBeenCalledWith(1);
    });

    it("should return error when getFlatDiscussion fails with unknown error", async () => {
      (getFlatDiscussion as jest.Mock).mockResolvedValue({
        ok: false,
        code: "UNKNOWN_ERROR",
      });

      const result = await handleGetFlatDiscussion({ postId: "1" });

      expect(result.status).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Failed to retrieve discussion");
    });
  });

  describe("handleGetPost", () => {
    it("should return error when post ID is invalid", async () => {
      const result = await handleGetPost({ postId: "invalid" });

      expect(result.status).toBe(400);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Invalid post ID");
    });

    it("should return error when post not found", async () => {
      (getPostById as jest.Mock).mockResolvedValue({
        ok: false,
        code: "POST_NOT_FOUND",
      });

      const result = await handleGetPost({ postId: "999" });

      expect(result.status).toBe(404);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Post not found");
    });

    it("should return success with post", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        username: "testuser",
        initial_number: 6,
        nodes_count: 2,
        created_at: "2024-01-01T10:00:00.000Z",
      };

      (getPostById as jest.Mock).mockResolvedValue({
        ok: true,
        post: mockPost,
      });

      const result = await handleGetPost({ postId: "1" });

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      if (result.body.success) {
        expect(result.body.data).toEqual(mockPost);
        expect(result.body.message).toBe("Post retrieved successfully");
      }
      expect(getPostById).toHaveBeenCalledWith(1);
    });

    it("should return error when getPostById fails with unknown error", async () => {
      (getPostById as jest.Mock).mockResolvedValue({
        ok: false,
        code: "UNKNOWN_ERROR",
      });

      const result = await handleGetPost({ postId: "1" });

      expect(result.status).toBe(500);
      expect(result.body.success).toBe(false);
      expect(result.body.message).toBe("Failed to retrieve post");
    });
  });

  describe("handleGetAllPosts", () => {
    it("should return success with posts and pagination", async () => {
      const mockResult = {
        ok: true as const,
        posts: [
          {
            id: 1,
            user_id: 1,
            username: "user1",
            initial_number: 6,
            nodes_count: 2,
            created_at: "2024-01-01T10:00:00.000Z",
          },
          {
            id: 2,
            user_id: 2,
            username: "user2",
            initial_number: 10,
            nodes_count: 1,
            created_at: "2024-01-02T10:00:00.000Z",
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          total_pages: 1,
        },
      };

      (getAllPosts as jest.Mock).mockResolvedValue(mockResult);

      const result = await handleGetAllPosts({ page: 1, limit: 10 });

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      if (result.body.success) {
        expect(result.body.data).toEqual(mockResult);
        expect(result.body.message).toBe("Posts retrieved successfully");
      }
      expect(getAllPosts).toHaveBeenCalledWith(1, 10);
    });

    it("should handle different page and limit values", async () => {
      const mockResult = {
        ok: true as const,
        posts: [],
        pagination: {
          page: 2,
          limit: 5,
          total: 10,
          total_pages: 2,
        },
      };

      (getAllPosts as jest.Mock).mockResolvedValue(mockResult);

      const result = await handleGetAllPosts({ page: 2, limit: 5 });

      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);
      expect(getAllPosts).toHaveBeenCalledWith(2, 5);
    });
  });
});

