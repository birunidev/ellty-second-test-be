import {
  createPost,
  replyToNode,
  getPostTree,
  getFlatDiscussion,
} from "./posts.service";
import { prisma } from "../lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

describe("posts.service", () => {
  afterEach(() => jest.restoreAllMocks());

  describe("createPost", () => {
    it("should create a post successfully", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(6),
        created_at: new Date("2024-01-01"),
        user: {
          id: 1,
          username: "testuser",
        },
      };

      jest.spyOn(prisma.post, "create").mockResolvedValue(mockPost as any);

      const result = await createPost(1, 6);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.post.id).toBe(1);
        expect(result.post.user_id).toBe(1);
        expect(result.post.initial_number).toBe(6);
        expect(result.post.username).toBe("testuser");
      }
      expect(prisma.post.create).toHaveBeenCalledWith({
        data: {
          user_id: 1,
          initial_number: expect.any(Decimal),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });
    });
  });

  describe("replyToNode", () => {
    it("should create a reply to root post successfully", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(6),
        created_at: new Date("2024-01-01"),
      };

      const mockNode = {
        id: 2,
        post_id: 1,
        parent_id: null,
        user_id: 2,
        operation: "+",
        operand_value: new Decimal(10),
        result_value: new Decimal(16),
        depth: 0,
        created_at: new Date("2024-01-01"),
        user: {
          id: 2,
          username: "user2",
        },
      };

      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost as any);
      jest.spyOn(prisma.node, "create").mockResolvedValue(mockNode as any);

      const result = await replyToNode(2, 1, null, "+", 10);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.node.id).toBe(2);
        expect(result.node.operation).toBe("+");
        expect(result.node.operand_value).toBe(10);
        expect(result.node.result_value).toBe(16);
        expect(result.node.depth).toBe(0);
      }
    });

    it("should create a reply to a node successfully", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(6),
        created_at: new Date("2024-01-01"),
      };

      const mockParentNode = {
        id: 2,
        post_id: 1,
        parent_id: null,
        user_id: 2,
        operation: "+",
        operand_value: new Decimal(10),
        result_value: new Decimal(16),
        depth: 0,
        created_at: new Date("2024-01-01"),
      };

      const mockNode = {
        id: 3,
        post_id: 1,
        parent_id: 2,
        user_id: 3,
        operation: "*",
        operand_value: new Decimal(2),
        result_value: new Decimal(32),
        depth: 1,
        created_at: new Date("2024-01-01"),
        user: {
          id: 3,
          username: "user3",
        },
      };

      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost as any);
      jest
        .spyOn(prisma.node, "findUnique")
        .mockResolvedValue(mockParentNode as any);
      jest.spyOn(prisma.node, "create").mockResolvedValue(mockNode as any);

      const result = await replyToNode(3, 1, 2, "*", 2);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.node.id).toBe(3);
        expect(result.node.operation).toBe("*");
        expect(result.node.result_value).toBe(32);
        expect(result.node.depth).toBe(1);
      }
    });

    it("should return error when post not found", async () => {
      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(null);

      const result = await replyToNode(1, 999, null, "+", 10);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("POST_NOT_FOUND");
      }
    });

    it("should return error when parent node not found", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(6),
        created_at: new Date("2024-01-01"),
      };

      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost as any);
      jest.spyOn(prisma.node, "findUnique").mockResolvedValue(null);

      const result = await replyToNode(1, 1, 999, "+", 10);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("PARENT_NODE_NOT_FOUND");
      }
    });

    it("should return error when parent node belongs to different post", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(6),
        created_at: new Date("2024-01-01"),
      };

      const mockParentNode = {
        id: 2,
        post_id: 2, // Different post
        parent_id: null,
        user_id: 2,
        operation: "+",
        operand_value: new Decimal(10),
        result_value: new Decimal(16),
        depth: 0,
        created_at: new Date("2024-01-01"),
      };

      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost as any);
      jest
        .spyOn(prisma.node, "findUnique")
        .mockResolvedValue(mockParentNode as any);

      const result = await replyToNode(1, 1, 2, "+", 10);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("PARENT_NODE_MISMATCH");
      }
    });

    it("should return error on division by zero", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(6),
        created_at: new Date("2024-01-01"),
      };

      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost as any);

      const result = await replyToNode(1, 1, null, "/", 0);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("CALCULATION_ERROR");
        expect(result.message).toBe("Division by zero is not allowed");
      }
    });

    it("should handle subtraction operation", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(10),
        created_at: new Date("2024-01-01"),
      };

      const mockNode = {
        id: 2,
        post_id: 1,
        parent_id: null,
        user_id: 2,
        operation: "-",
        operand_value: new Decimal(3),
        result_value: new Decimal(7),
        depth: 0,
        created_at: new Date("2024-01-01"),
        user: {
          id: 2,
          username: "user2",
        },
      };

      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost as any);
      jest.spyOn(prisma.node, "create").mockResolvedValue(mockNode as any);

      const result = await replyToNode(2, 1, null, "-", 3);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.node.result_value).toBe(7);
      }
    });

    it("should handle multiplication operation", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(5),
        created_at: new Date("2024-01-01"),
      };

      const mockNode = {
        id: 2,
        post_id: 1,
        parent_id: null,
        user_id: 2,
        operation: "*",
        operand_value: new Decimal(3),
        result_value: new Decimal(15),
        depth: 0,
        created_at: new Date("2024-01-01"),
        user: {
          id: 2,
          username: "user2",
        },
      };

      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost as any);
      jest.spyOn(prisma.node, "create").mockResolvedValue(mockNode as any);

      const result = await replyToNode(2, 1, null, "*", 3);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.node.result_value).toBe(15);
      }
    });

    it("should handle division operation", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(20),
        created_at: new Date("2024-01-01"),
      };

      const mockNode = {
        id: 2,
        post_id: 1,
        parent_id: null,
        user_id: 2,
        operation: "/",
        operand_value: new Decimal(4),
        result_value: new Decimal(5),
        depth: 0,
        created_at: new Date("2024-01-01"),
        user: {
          id: 2,
          username: "user2",
        },
      };

      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost as any);
      jest.spyOn(prisma.node, "create").mockResolvedValue(mockNode as any);

      const result = await replyToNode(2, 1, null, "/", 4);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.node.result_value).toBe(5);
      }
    });

    it("should handle exponentiation operation", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(2),
        created_at: new Date("2024-01-01"),
      };

      const mockNode = {
        id: 2,
        post_id: 1,
        parent_id: null,
        user_id: 2,
        operation: "^",
        operand_value: new Decimal(3),
        result_value: new Decimal(8),
        depth: 0,
        created_at: new Date("2024-01-01"),
        user: {
          id: 2,
          username: "user2",
        },
      };

      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost as any);
      jest.spyOn(prisma.node, "create").mockResolvedValue(mockNode as any);

      const result = await replyToNode(2, 1, null, "^", 3);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.node.result_value).toBe(8);
      }
    });

    it("should handle unsupported operation", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(10),
        created_at: new Date("2024-01-01"),
      };

      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost as any);

      // @ts-expect-error - Testing unsupported operation
      const result = await replyToNode(1, 1, null, "UNSUPPORTED", 5);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("CALCULATION_ERROR");
        expect(result.message).toContain("Unsupported operation");
      }
    });
  });

  describe("getPostTree", () => {
    it("should return post tree successfully", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(6),
        created_at: new Date("2024-01-01"),
        user: {
          id: 1,
          username: "user1",
        },
        nodes: [
          {
            id: 2,
            post_id: 1,
            parent_id: null,
            user_id: 2,
            operation: "*",
            operand_value: new Decimal(3),
            result_value: new Decimal(18),
            depth: 0,
            created_at: new Date("2024-01-01"),
            user: {
              id: 2,
              username: "user2",
            },
          },
          {
            id: 3,
            post_id: 1,
            parent_id: 2,
            user_id: 3,
            operation: "+",
            operand_value: new Decimal(4),
            result_value: new Decimal(22),
            depth: 1,
            created_at: new Date("2024-01-01"),
            user: {
              id: 3,
              username: "user3",
            },
          },
          {
            id: 4,
            post_id: 1,
            parent_id: null,
            user_id: 4,
            operation: "+",
            operand_value: new Decimal(10),
            result_value: new Decimal(16),
            depth: 0,
            created_at: new Date("2024-01-01"),
            user: {
              id: 4,
              username: "user4",
            },
          },
        ],
      };

      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost as any);

      const result = await getPostTree(1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.tree.id).toBe(1);
        expect(result.tree.value).toBe(6);
        expect(result.tree.user_id).toBe(1);
        expect(result.tree.username).toBe("user1");
        expect(result.tree.created_at).toBe("2024-01-01T00:00:00.000Z");
        expect(result.tree.children).toHaveLength(2);
        expect(result.tree.children[0].id).toBe(2);
        expect(result.tree.children[0].created_at).toBe("2024-01-01T00:00:00.000Z");
        expect(result.tree.children[0].children).toHaveLength(1);
        expect(result.tree.children[0].children[0].id).toBe(3);
        expect(result.tree.children[0].children[0].created_at).toBe("2024-01-01T00:00:00.000Z");
        expect(result.tree.children[1].id).toBe(4);
        expect(result.tree.children[1].created_at).toBe("2024-01-01T00:00:00.000Z");
      }
    });

    it("should return error when post not found", async () => {
      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(null);

      const result = await getPostTree(999);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("POST_NOT_FOUND");
      }
    });

    it("should return empty children when post has no nodes", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(6),
        created_at: new Date("2024-01-01"),
        user: {
          id: 1,
          username: "user1",
        },
        nodes: [],
      };

      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost as any);

      const result = await getPostTree(1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.tree.children).toHaveLength(0);
        expect(result.tree.created_at).toBe("2024-01-01T00:00:00.000Z");
      }
    });
  });

  describe("getFlatDiscussion", () => {
    it("should return flat discussion successfully", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(6),
        created_at: new Date("2024-01-01"),
      };

      const mockNodes = [
        {
          id: 2,
          post_id: 1,
          parent_id: null,
          user_id: 2,
          operation: "*",
          operand_value: new Decimal(3),
          result_value: new Decimal(18),
          depth: 0,
          created_at: new Date("2024-01-01T10:00:00Z"),
          user: {
            id: 2,
            username: "user2",
          },
        },
        {
          id: 3,
          post_id: 1,
          parent_id: 2,
          user_id: 3,
          operation: "+",
          operand_value: new Decimal(4),
          result_value: new Decimal(22),
          depth: 1,
          created_at: new Date("2024-01-01T11:00:00Z"),
          user: {
            id: 3,
            username: "user3",
          },
        },
      ];

      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost as any);
      jest.spyOn(prisma.node, "findMany").mockResolvedValue(mockNodes as any);

      const result = await getFlatDiscussion(1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.nodes).toHaveLength(2);
        expect(result.nodes[0].id).toBe(2);
        expect(result.nodes[0].username).toBe("user2");
        expect(result.nodes[1].id).toBe(3);
        expect(result.nodes[1].username).toBe("user3");
      }
    });

    it("should return error when post not found", async () => {
      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(null);

      const result = await getFlatDiscussion(999);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("POST_NOT_FOUND");
      }
    });

    it("should return empty array when post has no nodes", async () => {
      const mockPost = {
        id: 1,
        user_id: 1,
        initial_number: new Decimal(6),
        created_at: new Date("2024-01-01"),
      };

      jest.spyOn(prisma.post, "findUnique").mockResolvedValue(mockPost as any);
      jest.spyOn(prisma.node, "findMany").mockResolvedValue([]);

      const result = await getFlatDiscussion(1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.nodes).toHaveLength(0);
      }
    });
  });
});

