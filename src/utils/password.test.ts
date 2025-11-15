import { hashPassword, verifyPassword } from "./password";

describe("password utils", () => {
  it("hashes and verifies password", async () => {
    const password = "StrongPassw0rd!";
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    const ok = await verifyPassword(password, hash);
    expect(ok).toBe(true);
  });
});
