import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.E2E_BASE_URL || 'https://developer-test.privasys.org';
const E2E_DIR = __dirname;
const AUTH_FILE = path.join(E2E_DIR, '.auth', 'state.json');

export default defineConfig({
    testDir: E2E_DIR,
    outputDir: path.join(E2E_DIR, 'test-results'),
    fullyParallel: false,
    retries: 0,
    workers: 1,
    timeout: 60_000,
    expect: { timeout: 10_000 },

    use: {
        baseURL: BASE_URL,
        screenshot: 'on',
        trace: 'on-first-retry',
        ignoreHTTPSErrors: true,
        ...devices['Desktop Chrome'],
    },

    projects: [
        {
            name: 'auth-setup',
            testMatch: 'auth.setup.ts',
        },
        {
            name: 'portal',
            testMatch: '**/*.spec.ts',
            dependencies: ['auth-setup'],
            use: {
                storageState: AUTH_FILE,
            },
        },
    ],
});
