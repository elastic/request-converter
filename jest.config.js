module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: [
    "jest-expect-message"
  ],
  moduleFileExtensions: [
    "ts",
    "js",
    "tpl"
  ],
  testTimeout: 10000,
};
