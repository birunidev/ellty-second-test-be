import {
  successResponseSchema,
  errorResponseSchema,
  userDataSchema,
  positiveInt,
  positiveIntWithDefault,
} from "./common";

describe("schemas/common", () => {
  describe("successResponseSchema", () => {
    it("should validate success response with data", () => {
      const schema = successResponseSchema(userDataSchema);
      const result = schema.safeParse({
        success: true,
        message: "Success",
        data: { id: 1, name: "Test", username: "testuser" },
        statusCode: 200,
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid success response", () => {
      const schema = successResponseSchema(userDataSchema);
      const result = schema.safeParse({
        success: false,
        message: "Error",
        statusCode: 400,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("errorResponseSchema", () => {
    it("should validate error response", () => {
      const result = errorResponseSchema.safeParse({
        success: false,
        message: "Error message",
        statusCode: 400,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("userDataSchema", () => {
    it("should validate user data", () => {
      const result = userDataSchema.safeParse({
        id: 1,
        name: "Test User",
        username: "testuser",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("positiveInt", () => {
    it("should validate positive integer", () => {
      const schema = positiveInt();
      expect(schema.safeParse(1).success).toBe(true);
      expect(schema.safeParse(100).success).toBe(true);
      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(-1).success).toBe(false);
      expect(schema.safeParse(1.5).success).toBe(false);
    });
  });

  describe("positiveIntWithDefault", () => {
    it("should validate positive integer with default value", () => {
      const schema = positiveIntWithDefault(5);
      expect(schema.safeParse(1).success).toBe(true);
      expect(schema.safeParse(100).success).toBe(true);
      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(-1).success).toBe(false);
    });

    it("should use default value when undefined", () => {
      const schema = positiveIntWithDefault(10);
      const result = schema.safeParse(undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(10);
      }
    });

    it("should use default value of 1 when no default provided", () => {
      const schema = positiveIntWithDefault();
      const result = schema.safeParse(undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1);
      }
    });
  });
});

