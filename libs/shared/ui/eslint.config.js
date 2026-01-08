import baseConfig from '../../../eslint.config.js';

const eslintConfig = [
    ...baseConfig,
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-require-imports': 'warn'
        }
    }
];

export default eslintConfig;
