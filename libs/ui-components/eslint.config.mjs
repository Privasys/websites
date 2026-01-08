import { compat } from '../../eslint.config.js';
import baseConfig from '../../eslint.config.js';

export default [
    ...baseConfig,
    ...compat.config({
        extends: ['plugin:@nx/react-typescript']
    }),
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        rules: {},
    },
];
