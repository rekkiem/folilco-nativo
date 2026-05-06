import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "CommonJS" } }],
  },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: [
    "**/tests/unit/**/*.test.ts",
    "**/tests/integration/**/*.test.ts",
    "**/tests/security/**/*.test.ts",
  ],
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "src/app/api/**/*.ts",
    "!src/lib/logger.ts",
    "!src/lib/env.ts",
  ],
  coverageThreshold: {
    global: { branches: 60, functions: 70, lines: 70, statements: 70 },
  },
  testTimeout: 15000,
  // Silenciar warnings de módulos ESM en node_modules
  transformIgnorePatterns: ["/node_modules/(?!(date-fns)/)"],
};

export default config;
