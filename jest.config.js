module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  modulePathIgnorePatterns: ['<rootDir>/.worktrees/'],
  testPathIgnorePatterns: ['<rootDir>/.worktrees/', '<rootDir>/server/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\.(t|j)sx?$': '@swc/jest',
  },
};