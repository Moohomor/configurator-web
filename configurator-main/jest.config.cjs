/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/scripts'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  collectCoverageFrom: [
    'scripts/**/*.ts',
    '!scripts/**/*.test.ts',
    '!scripts/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: './tsconfig.jest.json'
    }]
  }
};