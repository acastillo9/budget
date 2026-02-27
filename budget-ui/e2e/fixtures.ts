import { test as base } from '@playwright/test';
import { SignInPage } from './pages/signin.page';
import { SignUpPage } from './pages/signup.page';
import { MailpitClient } from './helpers/mailpit';

type StorageState = Awaited<ReturnType<import('@playwright/test').BrowserContext['storageState']>>;

/**
 * Mutable auth reference. Stored at worker scope so that when a test-scoped
 * fixture refreshes the tokens, later tests in the same worker benefit.
 */
type AuthRef = {
	state: StorageState;
	email: string;
	password: string;
	capturedAt: number;
};

type WorkerFixtures = {
	authRef: AuthRef;
	secondUserRef: AuthRef;
	secondUserEmail: string;
};

type TestFixtures = {
	secondUserState: StorageState;
};

/** Re-login when the captured state is older than this (ms). */
const AUTH_STALE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Register a fresh user via the signup flow and return the storage state.
 */
async function registerUser(
	browser: import('@playwright/test').Browser,
	name: string,
	email: string,
	password: string,
	mailpit: MailpitClient
): Promise<StorageState> {
	const context = await browser.newContext({
		baseURL: 'http://localhost:4173',
		storageState: { cookies: [], origins: [] }
	});
	const page = await context.newPage();
	const signUpPage = new SignUpPage(page);

	// Step 1: Fill basic info and submit
	await signUpPage.goto();
	await signUpPage.fillBasicInfo(name, email);
	await signUpPage.submitBasicInfo();

	// Wait for step 2 — activation code
	await base.expect(signUpPage.activationDescription).toBeVisible({ timeout: 15_000 });

	// Retrieve the activation code from the email captured by Mailpit
	const activationCode = await mailpit.getActivationCode(email);

	// Step 2: Fill activation code and submit
	await signUpPage.fillActivationCode(activationCode);
	await signUpPage.submitActivation();

	// Wait for step 3 — set password
	await base.expect(signUpPage.passwordDescription).toBeVisible({ timeout: 15_000 });

	// Step 3: Set password and submit
	await signUpPage.fillPassword(password);
	await signUpPage.submitPassword();

	// After setting the password the app redirects to the dashboard
	await page.waitForURL('/', { timeout: 15_000 });
	await base.expect(page.locator('h1')).toBeVisible();

	// Capture storage state in-memory (no file I/O)
	const state = await context.storageState();
	await context.close();

	return state;
}

/**
 * If the auth state is stale (older than AUTH_STALE_MS), sign in again to get
 * fresh tokens. Mutates `ref` in place so later tests in the same worker
 * reuse the refreshed state without re-logging in.
 */
async function ensureFreshAuth(
	browser: import('@playwright/test').Browser,
	ref: AuthRef
): Promise<StorageState> {
	if (Date.now() - ref.capturedAt < AUTH_STALE_MS) {
		return ref.state;
	}

	const context = await browser.newContext({
		baseURL: 'http://localhost:4173',
		storageState: { cookies: [], origins: [] }
	});
	const page = await context.newPage();
	const signInPage = new SignInPage(page);

	await signInPage.goto();
	await signInPage.signIn(ref.email, ref.password);
	await page.waitForURL('/', { timeout: 15_000 });

	ref.state = await context.storageState();
	ref.capturedAt = Date.now();
	await context.close();

	return ref.state;
}

/**
 * Custom test fixture that provides per-worker user isolation.
 *
 * Each Playwright worker registers a fresh user via the signup flow on first
 * use, then reuses the resulting storage state for all tests in that worker.
 * When the JWT access token expires (after AUTH_STALE_MS), the fixture
 * automatically re-authenticates to keep the session alive.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
	authRef: [
		async ({ browser }, use) => {
			const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			const testEmail = `e2e-${uniqueId}@example.com`;
			const password = 'TestPassword1!';
			const mailpit = new MailpitClient(process.env.MAILPIT_API_URL);

			const state = await registerUser(browser, 'E2E Test User', testEmail, password, mailpit);

			await use({ state, email: testEmail, password, capturedAt: Date.now() });
		},
		{ scope: 'worker' }
	],

	secondUserRef: [
		async ({ browser }, use) => {
			const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
			const testEmail = `e2e-second-${uniqueId}@example.com`;
			const password = 'TestPassword1!';
			const mailpit = new MailpitClient(process.env.MAILPIT_API_URL);

			const state = await registerUser(browser, 'E2E Second User', testEmail, password, mailpit);

			await use({ state, email: testEmail, password, capturedAt: Date.now() });
		},
		{ scope: 'worker', timeout: 60_000 }
	],

	secondUserEmail: [
		async ({ secondUserRef }, use) => {
			await use(secondUserRef.email);
		},
		{ scope: 'worker' }
	],

	// Test-scoped: feed worker-scoped authRef into the built-in storageState,
	// refreshing via sign-in if the JWT has gone stale.
	storageState: async ({ authRef, browser }, use) => {
		await use(await ensureFreshAuth(browser, authRef));
	},

	// Test-scoped: provide the second user's storage state, refreshing if stale.
	secondUserState: async ({ secondUserRef, browser }, use) => {
		await use(await ensureFreshAuth(browser, secondUserRef));
	}
});

export { expect } from '@playwright/test';
