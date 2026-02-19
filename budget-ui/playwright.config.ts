import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [['html', { open: 'never' }], ['list']],
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},
	projects: [
		// Auth setup project — runs first to store authenticated state
		{ name: 'setup', testMatch: /.*\.setup\.ts/ },
		{
			name: 'authenticated',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'e2e/.auth/user.json'
			},
			dependencies: ['setup'],
			testIgnore: /.*\.unauth\.spec\.ts/
		},
		{
			name: 'unauthenticated',
			use: { ...devices['Desktop Chrome'] },
			testMatch: /.*\.unauth\.spec\.ts/
		}
	],
	webServer: {
		command: 'npm run dev -- --port 4173 --mode test',
		port: 4173,
		reuseExistingServer: !process.env.CI
	}
});
