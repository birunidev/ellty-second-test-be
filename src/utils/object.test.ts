import { filterUndefined } from "./object";

describe("object", () => {
  describe("filterUndefined", () => {
    it("should filter out undefined values", () => {
      const obj = {
        a: 1,
        b: undefined,
        c: "test",
        d: undefined,
      };
      const result = filterUndefined(obj);
      expect(result).toEqual({
        a: 1,
        c: "test",
      });
    });

    it("should keep null values", () => {
      const obj = {
        a: 1,
        b: null,
        c: undefined,
      };
      const result = filterUndefined(obj);
      expect(result).toEqual({
        a: 1,
        b: null,
      });
    });

    it("should return empty object for all undefined", () => {
      const obj = {
        a: undefined,
        b: undefined,
      };
      const result = filterUndefined(obj);
      expect(result).toEqual({});
    });

    it("should return same object when no undefined", () => {
      const obj = {
        a: 1,
        b: "test",
        c: null,
      };
      const result = filterUndefined(obj);
      expect(result).toEqual(obj);
    });
  });
});
