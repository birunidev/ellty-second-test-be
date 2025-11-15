import { contract } from "../routes/v1/contracts";
import { generateOpenApi } from "@ts-rest/open-api";
import { apiBasePath } from "./api";
import { AppRoute } from "@ts-rest/core";
import type { OperationObject } from "openapi3-ts";

const hasJwtAuthRequired = (
  metadata: unknown
): metadata is { jwtAuthRequired: boolean } => {
  return (
    !!metadata && typeof metadata === "object" && "jwtAuthRequired" in metadata
  );
};
/**
 * Generate OpenAPI document dari ts-rest contract
 */
export const generateOpenAPIDocument = () => {
  const openApiDoc = generateOpenApi(
    contract,
    {
      openapi: "3.0.3",
      info: {
        title: "Ellty Second Test API",
        version: "1.0.0",
        description: "API documentation generated from ts-rest contract",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description:
              "JWT Authorization header using the Bearer scheme. Enter your access token (without 'Bearer' prefix). Token will be persisted across page refreshes.",
          },
        },
      },
      servers: [
        {
          url:
            process.env.SERVER_URL ||
            `http://localhost:${process.env.APP_PORT || "3000"}${apiBasePath}`,
          description:
            process.env.NODE_ENV === "production"
              ? "Production server"
              : "Development server",
        },
      ],
    },
    {
      operationMapper: (operation: OperationObject, appRoute: AppRoute) => ({
        ...operation,
        ...(hasJwtAuthRequired(appRoute.metadata)
          ? {
              security: [{ bearerAuth: [] }],
            }
          : {}),
      }),
    }
  );

  if (openApiDoc.paths) {
    const transformedPaths: Record<string, any> = {};
    for (const [path, pathItem] of Object.entries(openApiDoc.paths)) {
      const newPath = path.startsWith(apiBasePath)
        ? path.slice(apiBasePath.length) || "/"
        : path;
      transformedPaths[newPath] = pathItem;
    }
    openApiDoc.paths = transformedPaths;
  }

  return openApiDoc;
};
