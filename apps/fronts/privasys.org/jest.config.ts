const jestConfig = {
    displayName: 'privasys.org',
    preset: '../../../jest.preset.cjs',
    transform: {
        '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
        '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/next/babel'] }]
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
    coverageDirectory: '../../../coverage/apps/fronts/privasys.org'
};

export default jestConfig;
