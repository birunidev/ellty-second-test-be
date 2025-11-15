import { z } from "zod";

// ============================================================================
// Common Response Schemas
// ============================================================================

export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema,
    statusCode: z.number(),
  });

const validationErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  statusCode: z.number(),
  errors: z
    .array(
      z.object({
        path: z.string(),
        errors: z.array(z.string()),
      })
    )
    .optional(),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  statusCode: z.number(),
});

// ============================================================================
// Common Data Schemas
// ============================================================================

export const userDataSchema = z.object({
  id: z.number(),
  name: z.string(),
  username: z.string(),
});

// ============================================================================
// Schema Helpers for OpenAPI Compatibility
// ============================================================================

export const positiveInt = () => z.number().int().min(1);

export const positiveIntWithDefault = (defaultValue: number = 1) =>
  z.number().int().min(1).default(defaultValue);

export { validationErrorResponseSchema };
