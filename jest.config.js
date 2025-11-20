module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(axios)/)',
  ],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/node_modules/react-native',
  },
  collectCoverageFrom: [
    'services/**/*.{ts,tsx}',
    'api/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.test.{ts,tsx}',
  ],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
};
