import { compat } from '../../../eslint.config.js';
import baseConfig from '../../../eslint.config.js';

const eslintConfig = [
    ...baseConfig,
    ...compat.config({
        extends: [
            'plugin:@nx/react-typescript'
        ]
    }),
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-require-imports': 'warn'
        }
    }
];

export default eslintConfig;
