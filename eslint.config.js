import { FlatCompat } from '@eslint/eslintrc';
// Note: avoid importing plugin objects here to prevent circular references
import tsEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import jsoncParser from 'jsonc-eslint-parser';
import stylisticPlugin from '@stylistic/eslint-plugin';
import nxEslintPlugin from '@nx/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jsoncPlugin from 'eslint-plugin-jsonc';
import js from '@eslint/js';
import path from 'path';
import { fileURLToPath } from 'url';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended
});

const jsonRules = {
    '@stylistic/indent': [
        'error',
        4,
        {
            SwitchCase: 1,
            ignoredNodes: ['VariableDeclaration[declarations.length=0]']
        }
    ],
    '@stylistic/consistent-type-assertions': 'off'
};

const javascriptRules = {
    ...jsonRules,
    'no-unused-vars': 'error',
    '@/no-trailing-spaces': 'error',
    '@nx/enforce-module-boundaries': [
        'error',
        {
            enforceBuildableLibDependency: true,
            allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
            depConstraints: [
                {
                    sourceTag: '*',
                    onlyDependOnLibsWithTags: ['*']
                }
            ]
        }
    ],
    'react/style-prop-object': 'off',
    '@stylistic/quotes': ['error', 'single'],
    '@stylistic/quote-props': ['error', 'consistent-as-needed'],
    '@stylistic/comma-dangle': ['error', 'never'],
    '@stylistic/no-extra-semi': 'error',
    '@stylistic/semi': ['error', 'always']
};

const typescriptRules = {
    ...javascriptRules,
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'error'
};

const baseConfig = [
    js.configs.recommended,
    {
        name: 'base',
        plugins: {
            '@stylistic': stylisticPlugin,
            '@nx': nxEslintPlugin,
            '@typescript-eslint': tsEslint
            ,
            react: reactPlugin,
            'react-hooks': reactHooksPlugin
        },
        languageOptions: {
            ecmaVersion: 'latest',
            parser: tsParser,
            parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
            globals: {
                ...globals.browser,
                ...globals.node
            }
        }
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' }
        },
        rules: typescriptRules
    },
    {
        files: ['**/*.js', '**/*.jsx'],
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' } },
        rules: javascriptRules
    },
    {
        files: ['**/*.json'],
        languageOptions: { parser: jsoncParser },
        plugins: { jsonc: jsoncPlugin },
        rules: jsonRules
    },
    {
        name: 'ignore',
        ignores: [
            '.nx/',
            '.husky/',
            'dist/',
            'tmp/',
            '**/build',
            '**/dist',
            '**/out',
            '**/node_modules',
            '**/web-build',
            '**/.next',
            'tools/**/_msr*',
            '**/assembly/**/*.ts',
            '**/stac*',
            '**/node_modules/**',
            '**/template/',
            '**/app/(website)/**',
            '**/*.d.ts',
            '**/utils/**',
            '**/vendor/',
            '**/web-build/',
            '**/*.spec.tsx',
            '**/*.spec.ts',
            '**/admin'
        ]
    }
];

export default baseConfig;
