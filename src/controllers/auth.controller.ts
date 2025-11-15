import { z } from "zod";
import { contract } from "../routes/v1/contracts";
import { registerUser, loginUser, getUserById } from "../services/auth.service";
import { signAccessToken } from "../utils/jwt";
import {
  issueRefreshToken,
  revokeRefreshToken,
} from "../services/token.service";
import {
  tsRestSuccessResponse,
  tsRestErrorResponse,
} from "../utils/ts-rest-helpers";
import { getAuthenticatedUserFromRequest } from "../utils/request-helpers";
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAllAuthCookies,
  getRefreshTokenFromCookie,
} from "../utils/cookie";
import { Response, Request } from "express";
import { verifyRefreshToken } from "../utils/jwt";

export const handleRegister = async (
  body: z.infer<typeof contract.auth.register.body>
) => {
  const result = await registerUser(body);

  if (!result.ok && result.code === "USERNAME_IN_USE") {
    return tsRestErrorResponse("Username already registered", 409 as const);
  }

  if (!result.ok || !result.user) {
    return tsRestErrorResponse("Internal server error", 400 as const);
  }

  const saved = result.user;

  return tsRestSuccessResponse(
    {
      id: saved.id,
      name: saved.name,
      username: saved.username,
    },
    201 as const,
    "User registered successfully"
  );
};

export const handleLogin = async (
  body: z.infer<typeof contract.auth.login.body>,
  res: Response
) => {
  const result = await loginUser(body);

  if (!result.ok || !result.user) {
    return tsRestErrorResponse("Invalid credentials", 401 as const);
  }

  const user = result.user;
  const accessToken = signAccessToken({ sub: user.id, username: user.username });
  const issued = await issueRefreshToken(user.id, user.username);

  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, issued.token);

  return tsRestSuccessResponse(
    {
      id: user.id,
      name: user.name,
      username: user.username,
    },
    200 as const,
    "Login successful"
  );
};

export const handleMe = async (req: any) => {
  try {
    const authenticatedUser = getAuthenticatedUserFromRequest(req);
    const result = await getUserById(authenticatedUser.sub);

    if (!result.ok || !result.user) {
      return tsRestErrorResponse("User not found", 404 as const);
    }

    return tsRestSuccessResponse(
      {
        id: result.user.id,
        name: result.user.name,
        username: result.user.username,
      },
      200 as const,
      "User information retrieved successfully"
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

export const handleLogout = async (req: Request, res: Response) => {
  try {
    const refreshToken = getRefreshTokenFromCookie(req);

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken) as {
          jti?: string;
        };
        if (payload.jti) {
          await revokeRefreshToken(payload.jti);
        }
      } catch {}
    }

    clearAllAuthCookies(res);

    return tsRestSuccessResponse(null, 200 as const, "Logout successful");
  } catch (error: any) {
    clearAllAuthCookies(res);
    return tsRestSuccessResponse(null, 200 as const, "Logout successful");
  }
};
