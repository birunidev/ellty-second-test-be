import { initContract } from "@ts-rest/core";
import { authContract } from "./auth.contract";
import { postsContract } from "./posts.contract";
import { apiBasePath } from "../../../config/api";
import {
  validationErrorResponseSchema,
  errorResponseSchema,
} from "../../../schemas/common";

// Re-export schemas for convenience
export { successResponseSchema, userDataSchema } from "../../../schemas/common";

// ============================================================================
// Contract Definition
// ============================================================================

const c = initContract();

export const contract = c.router(
  {
    auth: authContract,
    posts: postsContract,
  },
  {
    commonResponses: {
      400: validationErrorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      403: errorResponseSchema,
      409: errorResponseSchema,
      429: errorResponseSchema,
      500: errorResponseSchema,
    },
    pathPrefix: apiBasePath,
  }
);
