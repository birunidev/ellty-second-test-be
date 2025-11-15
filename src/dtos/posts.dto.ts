import { z } from "zod";

// ============================================================================
// Post Request Schemas
// ============================================================================

export const createPostBodySchema = z.object({
  initialNumber: z.number(),
});

export const replyToNodeBodySchema = z.object({
  parentId: z.number().nullable(),
  operation: z.enum(["+", "-", "*", "/", "^"]),
  operandValue: z.number(),
});

// ============================================================================
// Post Response Schemas
// ============================================================================

export const userInfoSchema = z.object({
  id: z.number(),
  username: z.string(),
});

export const nodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.number(),
    operation: z.string().nullable(),
    operand: z.number().nullable(),
    value: z.number(),
    user_id: z.number(),
    username: z.string(),
    created_at: z.string(),
    children: z.array(nodeSchema),
  })
);

export const postTreeSchema = z.object({
  id: z.number(),
  value: z.number(),
  operation: z.null(),
  operand: z.null(),
  user_id: z.number(),
  username: z.string(),
  created_at: z.string(),
  children: z.array(nodeSchema),
});

export const flatNodeSchema = z.object({
  id: z.number(),
  post_id: z.number(),
  parent_id: z.number().nullable(),
  user_id: z.number(),
  username: z.string(),
  operation: z.string().nullable(),
  operand_value: z.number().nullable(),
  result_value: z.number(),
  depth: z.number(),
  created_at: z.string(),
});

export const createPostResponseSchema = z.object({
  postId: z.number(),
});

export const replyToNodeResponseSchema = nodeSchema;

export const getPostTreeResponseSchema = postTreeSchema;

export const getFlatDiscussionResponseSchema = z.array(flatNodeSchema);

export const postListItemSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  username: z.string(),
  initial_number: z.number(),
  nodes_count: z.number(),
  created_at: z.string(),
});

export const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  total_pages: z.number(),
});

export const getAllPostsResponseSchema = z.object({
  posts: z.array(postListItemSchema),
  pagination: paginationSchema,
});

export const getPostResponseSchema = postListItemSchema;

