import { NextFunction, Request, Response } from "express";
import { RequestValidationError } from "@ts-rest/express";
import { z } from "zod";

/**
 * Format validation errors dari ts-rest ke format contract
 */
export const formatTsRestValidationError = (err: RequestValidationError) => {
  const errors: Array<{ path: string; errors: string[] }> = [];

  if (err.pathParams) {
    err.pathParams.issues.forEach((issue) => {
      const path = issue.path.join(".") || "params";
      errors.push({
        path,
        errors: [issue.message],
      });
    });
  }

  if (err.query) {
    err.query.issues.forEach((issue) => {
      const path = `query.${issue.path.join(".") || "root"}`;
      errors.push({
        path,
        errors: [issue.message],
      });
    });
  }

  if (err.body) {
    err.body.issues.forEach((issue) => {
      const fieldPath = issue.path.join(".");
      const path = fieldPath || "root";
      errors.push({
        path,
        errors: [issue.message],
      });
    });
  }

  if (err.headers) {
    err.headers.issues.forEach((issue) => {
      const path = `headers.${issue.path.join(".") || "root"}`;
      errors.push({
        path,
        errors: [issue.message],
      });
    });
  }

  return {
    success: false as const,
    message: "Validation failed",
    statusCode: 400,
    errors,
  };
};

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof RequestValidationError) {
    const validationError = formatTsRestValidationError(err);
    res.status(400).json(validationError);
    return;
  }

  if (err instanceof z.ZodError || (err?.name === "ZodError" && err?.issues)) {
    const errors = (err.issues || []).map((issue: any) => ({
      path: issue.path?.join(".") || "root",
      errors: [issue.message],
    }));

    res.status(400).json({
      success: false,
      message: "Validation failed",
      statusCode: 400,
      errors,
    });
    return;
  }

  const status =
    typeof err?.status === "number"
      ? err.status
      : res.statusCode >= 400
      ? res.statusCode
      : 500;
  const message = err?.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    message,
    statusCode: status,
  });
}
