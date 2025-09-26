export default {

  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "./tests/coverage",
  coverageProvider: "v8",
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: [],
  setupFilesAfterEnv: [
    "./tests/setup.ts"
  ],
  coverageReporters: [
    "text",
    "lcov"
  ],
  coverageThreshold: {
    global: {
      branch: 100,
      function: 100,
      lines: 100,
      statements: 100
    }
  },
  // collectCoverageFrom: ['<rootDir>/**/*.tsx', '<rootDir>/**/*.ts']
};
