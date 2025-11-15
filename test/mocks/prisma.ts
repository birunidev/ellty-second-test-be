export const prisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
  },
  post: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  node: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
} as any;
