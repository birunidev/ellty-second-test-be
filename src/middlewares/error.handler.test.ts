import express from "express";
import request from "supertest";
import { RequestValidationError } from "@ts-rest/express";
import { z } from "zod";
import { errorHandler, formatTsRestValidationError } from "./error.handler";

describe("errorHandler middleware", () => {
  const buildApp = () => {
    const app = express();
    app.use(express.json());

    app.get("/err-status", (_req, _res, next) => {
      next({ status: 400, message: "Bad Request" });
    });

    app.get("/err-res-status", (_req, res, next) => {
      res.status(418);
      next(new Error("Teapot"));
    });

    app.get("/err-default", (_req, _res, next) => {
      next(new Error("Default error"));
    });

    app.use(errorHandler);
    return app;
  };

  it("wraps error with provided status on error object", async () => {
    const app = buildApp();
    const res = await request(app).get("/err-status");
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      message: "Bad Request",
      statusCode: 400,
    });
  });

  it("wraps error using existing response status when no err.status", async () => {
    const app = buildApp();
    const res = await request(app).get("/err-res-status");
    expect(res.status).toBe(418);
    expect(res.body).toMatchObject({
      success: false,
      message: "Teapot",
      statusCode: 418,
    });
  });

  it("handles default error with 500 status", async () => {
    const app = buildApp();
    const res = await request(app).get("/err-default");
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      success: false,
      message: "Default error",
      statusCode: 500,
    });
  });

  it("handles error with res.statusCode < 400 and no err.status", async () => {
    const app = express();
    app.use(express.json());
    app.get("/err-low-status", (_req, res, next) => {
      res.status(200);
      next(new Error("Error with 200 status"));
    });
    app.use(errorHandler);

    const res = await request(app).get("/err-low-status");
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      success: false,
      message: "Error with 200 status",
      statusCode: 500,
    });
  });

  it("handles error without message", async () => {
    const app = express();
    app.use(express.json());
    app.get("/err-no-message", (_req, _res, next) => {
      next({});
    });
    app.use(errorHandler);

    const res = await request(app).get("/err-no-message");
    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      success: false,
      message: "Internal Server Error",
      statusCode: 500,
    });
  });

  it("handles RequestValidationError in errorHandler", async () => {
    const app = express();
    app.use(express.json());
    app.get("/ts-rest-error", (_req, _res, next) => {
      const mockError = Object.create(RequestValidationError.prototype);
      Object.assign(mockError, {
        pathParams: {
          issues: [{ path: ["id"], message: "Invalid format" }],
        },
      });
      next(mockError);
    });
    app.use(errorHandler);

    const res = await request(app).get("/ts-rest-error");
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      message: "Validation failed",
      statusCode: 400,
    });
    expect(res.body.errors).toBeDefined();
  });
});

describe("formatTsRestValidationError", () => {
  it("should format body validation errors", () => {
    const mockError = {
      body: {
        issues: [
          { path: ["email"], message: "Invalid email" },
          { path: ["password"], message: "Required" },
        ],
      },
    } as unknown as RequestValidationError;

    const result = formatTsRestValidationError(mockError);
    expect(result).toEqual({
      success: false,
      message: "Validation failed",
      statusCode: 400,
      errors: [
        { path: "email", errors: ["Invalid email"] },
        { path: "password", errors: ["Required"] },
      ],
    });
  });

  it("should format query validation errors", () => {
    const mockError = {
      query: {
        issues: [{ path: ["page"], message: "Must be a number" }],
      },
    } as unknown as RequestValidationError;

    const result = formatTsRestValidationError(mockError);
    expect(result.errors).toContainEqual({
      path: "query.page",
      errors: ["Must be a number"],
    });
  });

  it("should format path params validation errors", () => {
    const mockError = {
      pathParams: {
        issues: [{ path: ["id"], message: "Invalid format" }],
      },
    } as unknown as RequestValidationError;

    const result = formatTsRestValidationError(mockError);
    expect(result.errors).toContainEqual({
      path: "id",
      errors: ["Invalid format"],
    });
  });

  it("should format headers validation errors", () => {
    const mockError = {
      headers: {
        issues: [{ path: ["authorization"], message: "Required" }],
      },
    } as unknown as RequestValidationError;

    const result = formatTsRestValidationError(mockError);
    expect(result.errors).toContainEqual({
      path: "headers.authorization",
      errors: ["Required"],
    });
  });

  it("should handle empty path in body errors", () => {
    const mockError = {
      body: {
        issues: [{ path: [], message: "Invalid" }],
      },
    } as unknown as RequestValidationError;

    const result = formatTsRestValidationError(mockError);
    expect(result.errors).toContainEqual({
      path: "root",
      errors: ["Invalid"],
    });
  });
});

describe("errorHandler - ZodError handling", () => {
  it("should handle ZodError instance", async () => {
    const app = express();
    app.use(express.json());
    app.get("/zod-error", (_req, _res, next) => {
      const schema = z.object({ email: z.string().email() });
      try {
        schema.parse({ email: "invalid" });
      } catch (err) {
        next(err);
      }
    });
    app.use(errorHandler);

    const res = await request(app).get("/zod-error");
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      message: "Validation failed",
      statusCode: 400,
    });
    expect(res.body.errors).toBeDefined();
  });

  it("should handle ZodError-like object", async () => {
    const app = express();
    app.use(express.json());
    app.get("/zod-like-error", (_req, _res, next) => {
      next({
        name: "ZodError",
        issues: [{ path: ["email"], message: "Invalid email" }],
      });
    });
    app.use(errorHandler);

    const res = await request(app).get("/zod-like-error");
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      message: "Validation failed",
      statusCode: 400,
      errors: [{ path: "email", errors: ["Invalid email"] }],
    });
  });
});
