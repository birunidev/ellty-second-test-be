import request from "supertest";
import { app } from "./app";
import { authMiddleware } from "./middlewares/auth.middleware";
import { apiBasePath } from "./config/api";

jest.mock("./middlewares/auth.middleware");
jest.mock("./routes/v1", () => ({
  tsRestRouter: {},
}));

const mockAuthMiddleware = authMiddleware as jest.Mock;

describe("app", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("CORS configuration", () => {
    it("should handle CORS preflight requests", async () => {
      const res = await request(app)
        .options("/api/v1/posts")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "POST");

      expect(res.status).toBe(204);
    });

    it("should include CORS headers in responses", async () => {
      const res = await request(app)
        .get("/")
        .set("Origin", "http://localhost:3000");

      expect(res.headers["access-control-allow-origin"]).toBeDefined();
    });
  });

  describe("Health endpoint", () => {
    it("should return health status", async () => {
      const res = await request(app).get(`${apiBasePath}/health`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: { status: "ok" },
        message: "OK",
      });
    });
  });

  describe("Root endpoint", () => {
    it("should return API information", async () => {
      const res = await request(app).get("/");

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: {
          name: "Ellty Second Test API",
          docs: "/docs",
        },
      });
    });
  });

  describe("OpenAPI documentation", () => {
    it("should return OpenAPI JSON document", async () => {
      const res = await request(app).get("/docs-json");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/json");
      // The document should be an object (not empty)
      expect(typeof res.body).toBe("object");
      expect(res.body).not.toBeNull();
    });

    it("should serve Swagger UI", async () => {
      // Swagger UI may redirect /docs to /docs/
      const res = await request(app).get("/docs");

      // Either redirects or serves content
      expect([200, 301]).toContain(res.status);
      // If redirect, follow it
      if (res.status === 301) {
        const finalRes = await request(app).get("/docs/");
        expect(finalRes.status).toBe(200);
      }
    });
  });

  describe("Auth middleware", () => {
    it("should apply auth middleware to POST /posts", async () => {
      mockAuthMiddleware.mockImplementation((req, res, next) => next());

      await request(app).post(`${apiBasePath}/posts`).send({ initialNumber: 6 });

      expect(mockAuthMiddleware).toHaveBeenCalled();
    });

    it("should apply auth middleware to POST /posts/:postId/reply", async () => {
      mockAuthMiddleware.mockImplementation((req, res, next) => next());

      await request(app)
        .post(`${apiBasePath}/posts/1/reply`)
        .send({ parentId: null, operation: "+", operandValue: 10 });

      expect(mockAuthMiddleware).toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should handle 404 errors", async () => {
      const res = await request(app).get("/nonexistent");

      expect(res.status).toBe(404);
    });

    it("should use error handler middleware", async () => {
      // The error handler is applied at the end, so any unhandled errors should be caught
      const res = await request(app).get("/nonexistent");

      expect(res.status).toBe(404);
    });
  });

  describe("JSON parsing", () => {
    it("should parse JSON request bodies", async () => {
      const res = await request(app)
        .post(`${apiBasePath}/posts`)
        .set("Content-Type", "application/json")
        .send({ initialNumber: 6 });

      // Should not return 400 for invalid JSON (if it did, it would mean JSON parsing failed)
      expect(res.status).not.toBe(400);
    });
  });

  describe("CORS origin configuration", () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should use default origin when CORS_ORIGIN is not set", async () => {
      delete process.env.CORS_ORIGIN;
      delete process.env.FRONTEND_URL;

      const res = await request(app)
        .get("/")
        .set("Origin", "http://localhost:3000");

      expect(res.status).toBe(200);
    });

    it("should handle comma-separated origins", async () => {
      process.env.CORS_ORIGIN = "http://localhost:3000,http://localhost:3001";

      const res = await request(app)
        .get("/")
        .set("Origin", "http://localhost:3000");

      expect(res.status).toBe(200);
    });
  });
});

