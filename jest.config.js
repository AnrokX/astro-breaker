/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false, // Changed to false to use CommonJS
      isolatedModules: true
    }],
  },
  moduleNameMapper: {
    '^hytopia$': '<rootDir>/src/__tests__/mocks/hytopia.ts',
    '^hytopia/server$': '<rootDir>/src/__tests__/mocks/hytopia.ts',
    'bun:test': '<rootDir>/src/__tests__/mocks/bun-test.ts'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(hytopia)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/__tests__/**/*.test.ts']
}; 