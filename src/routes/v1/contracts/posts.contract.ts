import { initContract } from "@ts-rest/core";
import z from "zod";
import { successResponseSchema } from "../../../schemas/common";
import {
  createPostBodySchema,
  replyToNodeBodySchema,
  createPostResponseSchema,
  replyToNodeResponseSchema,
  getPostTreeResponseSchema,
  getFlatDiscussionResponseSchema,
  getAllPostsResponseSchema,
  getPostResponseSchema,
} from "../../../dtos/posts.dto";

const c = initContract();

export const postsContract = c.router({
  getAllPosts: {
    method: "GET",
    path: "/posts",
    query: z.object({
      page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1)),
      limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 10)),
    }),
    responses: {
      200: successResponseSchema(getAllPostsResponseSchema),
    },
    summary: "Get all posts with pagination",
    metadata: {
      tags: ["Posts"],
      jwtAuthRequired: false,
    },
  },
  getPost: {
    method: "GET",
    path: "/posts/:postId",
    pathParams: z.object({
      postId: z.string(),
    }),
    responses: {
      200: successResponseSchema(getPostResponseSchema),
    },
    summary: "Get a single post by ID",
    metadata: {
      tags: ["Posts"],
      jwtAuthRequired: false,
    },
  },
  createPost: {
    method: "POST",
    path: "/posts",
    body: createPostBodySchema,
    responses: {
      201: successResponseSchema(createPostResponseSchema),
    },
    summary: "Create a new post with an initial number",
    metadata: {
      tags: ["Posts"],
      jwtAuthRequired: true,
    },
  },
  replyToNode: {
    method: "POST",
    path: "/posts/:postId/reply",
    pathParams: z.object({
      postId: z.string(),
    }),
    body: replyToNodeBodySchema,
    responses: {
      201: successResponseSchema(replyToNodeResponseSchema),
    },
    summary: "Reply to a post or node with an operation",
    metadata: {
      tags: ["Posts"],
      jwtAuthRequired: true,
    },
  },
  getPostTree: {
    method: "GET",
    path: "/posts/:postId/tree",
    pathParams: z.object({
      postId: z.string(),
    }),
    responses: {
      200: successResponseSchema(getPostTreeResponseSchema),
    },
    summary: "Get the nested tree structure of a post",
    metadata: {
      tags: ["Posts"],
      jwtAuthRequired: false,
    },
  },
  getFlatDiscussion: {
    method: "GET",
    path: "/posts/:postId/flat",
    pathParams: z.object({
      postId: z.string(),
    }),
    responses: {
      200: successResponseSchema(getFlatDiscussionResponseSchema),
    },
    summary: "Get a flat list of all nodes in a post sorted by creation date",
    metadata: {
      tags: ["Posts"],
      jwtAuthRequired: false,
    },
  },
});
