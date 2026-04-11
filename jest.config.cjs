'use strict';

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.cjs'],
  setupFiles: ['<rootDir>/test/setup-env.cjs'],
  testTimeout: 20000,
  verbose: true
};
