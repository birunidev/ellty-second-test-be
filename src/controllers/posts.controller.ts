import { z } from "zod";
import { contract } from "../routes/v1/contracts";
import {
  createPost,
  replyToNode,
  getPostTree,
  getFlatDiscussion,
  getAllPosts,
  getPostById,
} from "../services/posts.service";
import {
  tsRestSuccessResponse,
  tsRestErrorResponse,
} from "../utils/ts-rest-helpers";
import { getAuthenticatedUserFromRequest } from "../utils/request-helpers";
import { Request } from "express";

export const handleGetPost = async (params: { postId: string }) => {
  const postId = parseInt(params.postId, 10);

  if (isNaN(postId)) {
    return tsRestErrorResponse("Invalid post ID", 400 as const);
  }

  const result = await getPostById(postId);

  if (!result.ok) {
    if (result.code === "POST_NOT_FOUND") {
      return tsRestErrorResponse("Post not found", 404 as const);
    }
    return tsRestErrorResponse("Failed to retrieve post", 500 as const);
  }

  return tsRestSuccessResponse(
    result.post,
    200 as const,
    "Post retrieved successfully"
  );
};

export const handleGetAllPosts = async (query: {
  page: number;
  limit: number;
}) => {
  const result = await getAllPosts(query.page, query.limit);
  return tsRestSuccessResponse(
    result,
    200 as const,
    "Posts retrieved successfully"
  );
};

export const handleCreatePost = async (
  body: z.infer<typeof contract.posts.createPost.body>,
  req: Request
) => {
  try {
    const authenticatedUser = getAuthenticatedUserFromRequest(req);
    const result = await createPost(authenticatedUser.sub, body.initialNumber);

    if (!result.ok || !result.post) {
      return tsRestErrorResponse("Failed to create post", 500 as const);
    }

    return tsRestSuccessResponse(
      {
        postId: result.post.id,
      },
      201 as const,
      "Post created successfully"
    );
  } catch (error: any) {
    if (
      error.message === "User not authenticated" ||
      error.message === "Invalid user data"
    ) {
      return tsRestErrorResponse("Unauthorized", 401 as const);
    }
    throw error;
  }
};

export const handleReplyToNode = async (
  body: z.infer<typeof contract.posts.replyToNode.body>,
  params: { postId: string },
  req: Request
) => {
  try {
    const authenticatedUser = getAuthenticatedUserFromRequest(req);
    const postId = parseInt(params.postId, 10);

    if (isNaN(postId)) {
      return tsRestErrorResponse("Invalid post ID", 400 as const);
    }

    const result = await replyToNode(
      authenticatedUser.sub,
      postId,
      body.parentId,
      body.operation,
      body.operandValue
    );

    if (!result.ok) {
      if (result.code === "POST_NOT_FOUND") {
        return tsRestErrorResponse("Post not found", 404 as const);
      }
      if (result.code === "PARENT_NODE_NOT_FOUND") {
        return tsRestErrorResponse("Parent node not found", 404 as const);
      }
      if (result.code === "PARENT_NODE_MISMATCH") {
        return tsRestErrorResponse(
          "Parent node does not belong to this post",
          400 as const
        );
      }
      if (result.code === "CALCULATION_ERROR") {
        return tsRestErrorResponse(
          result.message || "Calculation error",
          400 as const
        );
      }
      return tsRestErrorResponse("Failed to create reply", 500 as const);
    }

    if (!result.node) {
      return tsRestErrorResponse("Failed to create reply", 500 as const);
    }

    return tsRestSuccessResponse(
      {
        id: result.node.id,
        operation: result.node.operation,
        operand: result.node.operand_value,
        value: result.node.result_value,
        user_id: result.node.user_id,
        username: result.node.username,
        children: [],
      },
      201 as const,
      "Reply created successfully"
    );
  } catch (error: any) {
    if (
      error.message === "User not authenticated" ||
      error.message === "Invalid user data"
    ) {
      return tsRestErrorResponse("Unauthorized", 401 as const);
    }
    throw error;
  }
};

export const handleGetPostTree = async (params: { postId: string }) => {
  const postId = parseInt(params.postId, 10);

  if (isNaN(postId)) {
    return tsRestErrorResponse("Invalid post ID", 400 as const);
  }

  const result = await getPostTree(postId);

  if (!result.ok) {
    if (result.code === "POST_NOT_FOUND") {
      return tsRestErrorResponse("Post not found", 404 as const);
    }
    return tsRestErrorResponse("Failed to retrieve post tree", 500 as const);
  }

  return tsRestSuccessResponse(
    result.tree,
    200 as const,
    "Post tree retrieved successfully"
  );
};

export const handleGetFlatDiscussion = async (params: { postId: string }) => {
  const postId = parseInt(params.postId, 10);

  if (isNaN(postId)) {
    return tsRestErrorResponse("Invalid post ID", 400 as const);
  }

  const result = await getFlatDiscussion(postId);

  if (!result.ok) {
    if (result.code === "POST_NOT_FOUND") {
      return tsRestErrorResponse("Post not found", 404 as const);
    }
    return tsRestErrorResponse("Failed to retrieve discussion", 500 as const);
  }

  return tsRestSuccessResponse(
    result.nodes,
    200 as const,
    "Discussion retrieved successfully"
  );
};
