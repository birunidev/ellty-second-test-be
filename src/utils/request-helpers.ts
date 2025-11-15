import { Request } from "express";
import { tsRestErrorResponse } from "./ts-rest-helpers";
import { z } from "zod";

export function getAuthenticatedUser(req: Request): {
  sub: number;
  username: string;
} {
  if (!req.user) {
    throw new Error("User not authenticated");
  }
  return req.user;
}

export const authenticatedUserSchema = z.object({
  sub: z.number(),
  username: z.string(),
});

export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;

export function withAuth<T extends any[], R>(
  handler: (user: AuthenticatedUser, ...args: T) => Promise<R>
) {
  return async (
    req: Request,
    ...args: T
  ): Promise<R | ReturnType<typeof tsRestErrorResponse>> => {
    try {
      const user = getAuthenticatedUser(req);
      return await handler(user, ...args);
    } catch (error: any) {
      if (error.message === "User not authenticated") {
        return tsRestErrorResponse("Unauthorized", 401 as const);
      }
      throw error;
    }
  };
}

export function getAuthenticatedUserFromRequest(req: any): AuthenticatedUser {
  if (!req?.user) {
    throw new Error("User not authenticated");
  }

  try {
    const user = authenticatedUserSchema.parse(req.user);
    return user;
  } catch (error) {
    throw new Error("Invalid user data");
  }
}

export function createAuthenticatedHandler<
  TParams extends Record<string, any> = {},
  TBody extends Record<string, any> = {},
  TQuery extends Record<string, any> = {},
  TResponse = any
>(
  handler: (
    user: AuthenticatedUser,
    params: TParams,
    body: TBody,
    query: TQuery
  ) => Promise<TResponse>
) {
  return async ({
    params = {} as TParams,
    body = {} as TBody,
    query = {} as TQuery,
    req,
  }: {
    params?: TParams;
    body?: TBody;
    query?: TQuery;
    req: any;
  }): Promise<TResponse | ReturnType<typeof tsRestErrorResponse>> => {
    try {
      const user = getAuthenticatedUserFromRequest(req);
      return await handler(user, params, body, query);
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
}
