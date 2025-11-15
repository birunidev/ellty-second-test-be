import express, { Application } from "express";
import swaggerUi from "swagger-ui-express";
import { createExpressEndpoints } from "@ts-rest/express";
import {
  errorHandler,
  formatTsRestValidationError,
} from "./middlewares/error.handler";
import { contract } from "./routes/v1/contracts";
import { tsRestRouter } from "./routes/v1";
import { generateOpenAPIDocument } from "./config/openapi";
import { formatSuccessResponse } from "./utils/ts-rest-helpers";
import { authMiddleware } from "./middlewares/auth.middleware";
import { apiBasePath } from "./config/api";
import cors from "cors";
import cookieParser from "cookie-parser";

export const app: Application = express();

app.set("trust proxy", 1);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
// Cookie parser must be before CORS to ensure cookies are parsed
app.use(cookieParser());

const getCorsOrigin = () => {
  const origin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL;

  if (!origin) {
    return "http://localhost:3000";
  }

  if (origin.includes(",")) {
    return origin.split(",").map((o) => o.trim());
  }

  return origin;
};

const corsOptions = {
  origin: getCorsOrigin(),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["Set-Cookie"],
};

app.use(cors(corsOptions));

app.get(`${apiBasePath}/health`, (_req, res) => {
  res.json(formatSuccessResponse({ status: "ok" }, "OK"));
});

// Apply auth middleware only to POST routes for posts
app.use(`${apiBasePath}/auth/me`, authMiddleware);
app.use(`${apiBasePath}/auth/logout`, authMiddleware);
app.post(`${apiBasePath}/posts`, authMiddleware);
app.post(`${apiBasePath}/posts/:postId/reply`, authMiddleware);

createExpressEndpoints(contract, tsRestRouter, app, {
  requestValidationErrorHandler: (err, _, res) => {
    const validationError = formatTsRestValidationError(err);
    res.status(400).json(validationError);
  },
});

const openApiDocument = generateOpenAPIDocument();

app.get("/docs-json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json(openApiDocument);
});

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
    `,
    customSiteTitle: "Ellty Second Test API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
      persistAuthorizationSupport: true,
    },
  })
);

app.get("/", (_req, res) => {
  res.json(
    formatSuccessResponse({ name: "Ellty Second Test API", docs: "/docs" })
  );
});

app.use(errorHandler);
