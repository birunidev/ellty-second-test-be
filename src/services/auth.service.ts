import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../utils/password";
import { RegisterDto, LoginDto } from "../dtos/auth.dto";

export async function registerUser(registerDto: RegisterDto) {
  const existing = await prisma.user.findUnique({
    where: { username: registerDto.username },
  });
  if (existing) {
    return { ok: false as const, code: "USERNAME_IN_USE" };
  }
  const hashed = await hashPassword(registerDto.password);
  const saved = await prisma.user.create({
    data: {
      name: registerDto.name,
      username: registerDto.username,
      password: hashed,
    },
  });
  return { ok: true as const, user: saved };
}

export async function loginUser(loginDto: LoginDto) {
  const user = await prisma.user.findUnique({
    where: { username: loginDto.username },
  });
  if (!user) {
    return { ok: false as const, code: "INVALID_CREDENTIALS" };
  }
  const ok = await verifyPassword(loginDto.password, user.password);
  if (!ok) {
    return { ok: false as const, code: "INVALID_CREDENTIALS" };
  }
  return { ok: true as const, user };
}

export async function getUserById(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
    },
  });
  if (!user) {
    return { ok: false as const, code: "USER_NOT_FOUND" };
  }
  return { ok: true as const, user };
}
