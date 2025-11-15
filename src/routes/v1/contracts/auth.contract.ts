import { initContract } from "@ts-rest/core";
import z from "zod";
import { successResponseSchema, userDataSchema } from "../../../schemas/common";

// ============================================================================
// Auth Request Schemas
// ============================================================================
const registerBodySchema = z.object({
  name: z.string().min(1).max(100),
  username: z.string().min(1).max(191),
  password: z.string().min(8).max(255),
});

const loginBodySchema = z.object({
  username: z.string().min(1).max(191),
  password: z.string().min(8).max(255),
});

const c = initContract();

export const authContract = c.router({
  register: {
    method: "POST",
    path: "/auth/register",
    body: registerBodySchema,
    responses: {
      201: successResponseSchema(userDataSchema),
    },
    summary: "Register a new user",
    metadata: {
      tags: ["Auth"],
    },
  },
  login: {
    method: "POST",
    path: "/auth/login",
    body: loginBodySchema,
    responses: {
      200: successResponseSchema(userDataSchema),
    },
    summary: "Login with username and password",
    metadata: {
      tags: ["Auth"],
    },
  },
  me: {
    method: "GET",
    path: "/auth/me",
    responses: {
      200: successResponseSchema(userDataSchema),
    },
    summary: "Get current authenticated user information",
    metadata: {
      tags: ["Auth"],
      jwtAuthRequired: true,
    },
  },
  logout: {
    method: "POST",
    path: "/auth/logout",
    body: z.object({}),
    responses: {
      200: successResponseSchema(z.null()),
    },
    summary: "Logout and revoke refresh token",
    metadata: {
      tags: ["Auth"],
      jwtAuthRequired: false,
    },
  },
});
