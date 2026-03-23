const nx = require('@nx/eslint-plugin');
const tsEslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
    {
        plugins: {
            '@nx': nx,
            '@typescript-eslint': tsEslint
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
        },
        rules: {
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn'
        }
    },
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        rules: {
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    enforceBuildableLibDependency: true,
                    allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
                    depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }]
                }
            ]
        }
    },
    { ignores: ['.next/**/*', '.source/**/*', 'dist/**/*'] }
];
