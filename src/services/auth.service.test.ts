import { registerUser, loginUser, getUserById } from "./auth.service";
import { prisma } from "../lib/prisma";

jest.mock("../utils/password", () => ({
  hashPassword: jest.fn(async (p: string) => `hashed:${p}`),
  verifyPassword: jest.fn(async (_p: string, _h: string) => true),
}));

describe("auth.service", () => {
  afterEach(() => jest.restoreAllMocks());

  it("registerUser returns USERNAME_IN_USE if username exists", async () => {
    jest.spyOn(prisma.user, "findUnique").mockResolvedValue({ id: 1 } as any);
    const res = await registerUser({
      name: "n",
      username: "testuser",
      password: "p",
    });
    expect(res).toEqual({ ok: false, code: "USERNAME_IN_USE" });
  });

  it("registerUser creates and saves user", async () => {
    jest.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
    jest.spyOn(prisma.user, "create").mockResolvedValue({
      id: 2,
      name: "Alice",
      username: "alice",
      password: "hashed:Secret123",
    } as any);
    const res = await registerUser({
      name: "Alice",
      username: "alice",
      password: "Secret123",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.user.username).toBe("alice");
  });

  it("loginUser invalid when user not found", async () => {
    jest.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
    const res = await loginUser({ username: "nonexistent", password: "x" });
    expect(res).toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
  });

  it("loginUser ok when password verified", async () => {
    jest.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: 3,
      username: "testuser",
      password: "hashed",
    } as any);
    const res = await loginUser({
      username: "testuser",
      password: "Secret123",
    });
    expect(res.ok).toBe(true);
  });

  describe("getUserById", () => {
    it("returns USER_NOT_FOUND when user does not exist", async () => {
      jest.spyOn(prisma.user, "findUnique").mockResolvedValue(null);
      const res = await getUserById(999);
      expect(res).toEqual({ ok: false, code: "USER_NOT_FOUND" });
    });

    it("returns user data when user exists", async () => {
      const mockUser = {
        id: 1,
        name: "Alice",
        username: "alice",
      };
      jest.spyOn(prisma.user, "findUnique").mockResolvedValue(mockUser as any);
      const res = await getUserById(1);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.user).toEqual({
          id: 1,
          name: "Alice",
          username: "alice",
        });
      }
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          name: true,
          username: true,
        },
      });
    });
  });
});
