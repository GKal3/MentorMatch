export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/backend/test/**/*.test.js'],
  moduleNameMapper: {
    '^@paypal/paypal-server-sdk$': '<rootDir>/backend/test/mocks/paypalServerSdkMock.js',
  },
};
