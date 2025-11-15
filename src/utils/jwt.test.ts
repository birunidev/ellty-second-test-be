import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./jwt";

describe("utils/jwt", () => {
  it("signs and verifies access token", () => {
    const token = signAccessToken({ sub: 1, role: "user" });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(1);
    expect(payload.role).toBe("user");
  });

  it("signs and verifies refresh token", () => {
    const token = signRefreshToken({ sub: 2, scope: "refresh" });
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe(2);
    expect(payload.scope).toBe("refresh");
  });

  it("throws on invalid access token", () => {
    expect(() => verifyAccessToken("invalid.token.value" as any)).toThrow();
  });

  it("throws on invalid refresh token", () => {
    expect(() => verifyRefreshToken("invalid.token.value" as any)).toThrow();
  });
});
