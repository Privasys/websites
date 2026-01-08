import { compat } from '../../../eslint.config.js';
import baseConfig from '../../../eslint.config.js';
import tsParser from '@typescript-eslint/parser';
import jsoncParser from 'jsonc-eslint-parser';

const eslintConfig = [
    ...baseConfig,
    ...compat.config({
        extends: [
            'plugin:@nx/react-typescript'
        ]
    }),
    {
        rules: {
            '@next/next/no-html-link-for-pages': 'off',
            'react/react-in-jsx-scope': 'off', // Disable for React 17+ JSX transform
            'react/jsx-uses-react': 'off',     // Prevents unnecessary React imports
            'react/jsx-uses-vars': 'error'    // Ensures variables used in JSX are marked
        }
    },
    {
        files: ['**/*.json'],
        languageOptions: { parser: jsoncParser }
    }
    ,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' } }
    }
];

export default eslintConfig;
