import { test as base } from '@playwright/test';
import { SignUpPage } from './pages/signup.page';
import { MailpitClient } from './helpers/mailpit';

type StorageState = Awaited<ReturnType<import('@playwright/test').BrowserContext['storageState']>>;

type WorkerFixtures = {
	authState: StorageState;
};

/**
 * Custom test fixture that provides per-worker user isolation.
 *
 * Each Playwright worker registers a fresh user via the signup flow on first
 * use, then reuses the resulting storage state for all tests in that worker.
 */
export const test = base.extend<object, WorkerFixtures>({
	authState: [
		async ({ browser }, use) => {
			const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			const testEmail = `e2e-${uniqueId}@example.com`;
			const testName = 'E2E Test User';
			const testPassword = 'TestPassword1!';

			const mailpit = new MailpitClient(process.env.MAILPIT_API_URL);

			// Create a temporary context to perform registration (baseURL needed for relative navigation)
			const context = await browser.newContext({ baseURL: 'http://localhost:4173' });
			const page = await context.newPage();
			const signUpPage = new SignUpPage(page);

			// Step 1: Fill basic info and submit
			await signUpPage.goto();
			await signUpPage.fillBasicInfo(testName, testEmail);
			await signUpPage.submitBasicInfo();

			// Wait for step 2 — activation code
			await base.expect(signUpPage.activationDescription).toBeVisible({ timeout: 15_000 });

			// Retrieve the activation code from the email captured by Mailpit
			const activationCode = await mailpit.getActivationCode(testEmail);

			// Step 2: Fill activation code and submit
			await signUpPage.fillActivationCode(activationCode);
			await signUpPage.submitActivation();

			// Wait for step 3 — set password
			await base.expect(signUpPage.passwordDescription).toBeVisible({ timeout: 15_000 });

			// Step 3: Set password and submit
			await signUpPage.fillPassword(testPassword);
			await signUpPage.submitPassword();

			// After setting the password the app redirects to the dashboard
			await page.waitForURL('/', { timeout: 15_000 });
			await base.expect(page.locator('h1')).toBeVisible();

			// Capture storage state in-memory (no file I/O)
			const state = await context.storageState();
			await context.close();

			// Provide the authenticated state to all tests in this worker
			await use(state);
		},
		{ scope: 'worker' }
	],

	// Feed worker-scoped authState into the built-in storageState (test scope)
	storageState: async ({ authState }, use) => {
		await use(authState);
	}
});

export { expect } from '@playwright/test';
