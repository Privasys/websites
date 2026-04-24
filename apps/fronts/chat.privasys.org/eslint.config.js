import baseConfig from '../../../eslint.config.js';
import { compat } from '../../../eslint.config.js';
import tsParser from '@typescript-eslint/parser';

const eslintConfig = [
    ...baseConfig,
    ...compat.config({ extends: ['plugin:@nx/react-typescript'] }),
    {
        rules: {
            '@next/next/no-html-link-for-pages': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/jsx-uses-react': 'off',
            'react/jsx-uses-vars': 'error'
        }
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                sourceType: 'module'
            }
        }
    },
    {
        ignores: ['.next/**/*', 'dist/**/*']
    }
];

export default eslintConfig;
