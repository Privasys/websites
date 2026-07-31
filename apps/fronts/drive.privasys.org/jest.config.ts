const jestConfig = {
    displayName: 'drive.privasys.org',
    preset: '../../../jest.preset.cjs',
    transform: {
        '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
        '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/next/babel'] }]
    },
    // The auth SDK ships ESM only, and its package exports resolve to the
    // .d.ts under jest's CommonJS conditions. Point at the built module and
    // let babel transform it like first-party source.
    moduleNameMapper: {
        '^@privasys/auth$': '<rootDir>/../../../node_modules/@privasys/auth/dist/index.js'
    },
    transformIgnorePatterns: ['/node_modules/(?!@privasys/)'],
    setupFiles: ['<rootDir>/jest.setup.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    coverageDirectory: '../../../coverage/apps/fronts/drive.privasys.org'
};

export default jestConfig;
