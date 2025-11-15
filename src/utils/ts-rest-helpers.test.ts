import {
  convertDecimalToNumber,
  formatSuccessResponse,
  formatErrorResponse,
  formatDate,
  tsRestSuccessResponse,
  tsRestErrorResponse,
} from "./ts-rest-helpers";

describe("ts-rest-helpers", () => {
  describe("convertDecimalToNumber", () => {
    it("should convert Decimal to number", () => {
      const decimal = { toNumber: () => 123.45 };
      expect(convertDecimalToNumber(decimal)).toBe(123.45);
    });

    it("should return number as is", () => {
      expect(convertDecimalToNumber(123.45)).toBe(123.45);
    });

    it("should parse string to number", () => {
      expect(convertDecimalToNumber("123.45")).toBe(123.45);
    });

    it("should handle null", () => {
      expect(convertDecimalToNumber(null)).toBeNaN();
    });
  });

  describe("formatSuccessResponse", () => {
    it("should format success response with default values", () => {
      const result = formatSuccessResponse({ id: 1 });
      expect(result).toEqual({
        success: true,
        message: "OK",
        data: { id: 1 },
        statusCode: 200,
      });
    });

    it("should format success response with custom values", () => {
      const result = formatSuccessResponse({ id: 1 }, "Custom message", 201);
      expect(result).toEqual({
        success: true,
        message: "Custom message",
        data: { id: 1 },
        statusCode: 201,
      });
    });
  });

  describe("formatErrorResponse", () => {
    it("should format error response without errors", () => {
      const result = formatErrorResponse("Error message", 400);
      expect(result).toEqual({
        success: false,
        message: "Error message",
        statusCode: 400,
      });
    });

    it("should format error response with errors", () => {
      const errors = [{ path: "email", errors: ["Invalid email"] }];
      const result = formatErrorResponse("Validation failed", 400, errors);
      expect(result).toEqual({
        success: false,
        message: "Validation failed",
        statusCode: 400,
        errors,
      });
    });
  });

  describe("formatDate", () => {
    it("should format Date object", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      const result = formatDate(date);
      expect(result).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should format date string", () => {
      const result = formatDate("2024-01-01T00:00:00Z");
      expect(result).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should handle invalid date and return current date", () => {
      const result = formatDate("invalid");
      expect(result).toBeDefined();
      expect(new Date(result).getTime()).not.toBeNaN();
    });
  });

  describe("tsRestSuccessResponse", () => {
    it("should format ts-rest success response", () => {
      const result = tsRestSuccessResponse({ id: 1 }, 201 as const, "Created");
      expect(result.status).toBe(201);
      expect(result.body).toEqual({
        success: true,
        message: "Created",
        data: { id: 1 },
        statusCode: 201,
      });
    });
  });

  describe("tsRestErrorResponse", () => {
    it("should format ts-rest error response without errors", () => {
      const result = tsRestErrorResponse("Error", 400 as const);
      expect(result.status).toBe(400);
      expect(result.body).toEqual({
        success: false,
        message: "Error",
        statusCode: 400,
      });
    });

    it("should format ts-rest error response with errors", () => {
      const errors = [{ path: "email", errors: ["Invalid"] }];
      const result = tsRestErrorResponse(
        "Validation failed",
        400 as const,
        errors
      );
      expect(result.status).toBe(400);
      expect(result.body).toEqual({
        success: false,
        message: "Validation failed",
        statusCode: 400,
        errors,
      });
    });
  });
});
