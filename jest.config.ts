import type { Config } from "jest";

const config: Config = {
  projects: [
    {
      displayName: "backend",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: [
        "<rootDir>/tests/unit/modules/**/*.test.ts",
        "<rootDir>/tests/integration/**/*.test.ts",
      ],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
      },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.backend.ts"],
    },
    {
      displayName: "ui",
      preset: "ts-jest",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/tests/unit/ui/**/*.test.{ts,tsx}"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "\\.module\\.css$": "<rootDir>/tests/__mocks__/styleMock.ts",
      },
      transform: {
        "^.+\\.tsx?$": [
          "ts-jest",
          { tsconfig: { jsx: "react-jsx", esModuleInterop: true } },
        ],
      },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    },
  ],
};

export default config;
