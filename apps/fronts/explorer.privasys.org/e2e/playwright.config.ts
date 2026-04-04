import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const EXPLORER_URL = process.env.E2E_EXPLORER_URL || 'http://localhost:54281';
const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    testDir: E2E_DIR,
    outputDir: path.join(E2E_DIR, 'test-results'),
    fullyParallel: false,
    retries: 0,
    workers: 1,
    timeout: 60_000,
    expect: { timeout: 10_000 },

    use: {
        baseURL: EXPLORER_URL,
        screenshot: 'on',
        trace: 'on-first-retry',
        ignoreHTTPSErrors: true,
        ...devices['Desktop Chrome']
    },

    /* Start a local HTTP server for the explorer when testing locally */
    ...(process.env.E2E_EXPLORER_URL ? {} : {
        webServer: {
            command: 'npx serve -l 54281 -s apps/fronts/explorer.privasys.org',
            port: 54281,
            reuseExistingServer: true,
            cwd: path.resolve(E2E_DIR, '..', '..', '..', '..')
        }
    }),

    projects: [
        {
            name: 'explorer',
            testMatch: '**/*.spec.ts'
        }
    ]
});
