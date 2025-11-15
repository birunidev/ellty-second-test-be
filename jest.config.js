const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

module.exports = {
  testEnvironment: "node",
  testMatch: ["**/src/**/*.test.ts", "**/tests/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    ".*/lib/prisma$": "<rootDir>/test/mocks/prisma.ts",
  },
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/server.ts",
    "!src/config/**",
    "!src/**/index.ts",
    "!src/generated/**",
    "!src/lib/prisma.ts",
    "!src/routes/**",
    "!src/routes/v1/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "cobertura"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
