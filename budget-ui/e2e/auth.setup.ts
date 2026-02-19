import { test as setup, expect } from '@playwright/test';
import { SignUpPage } from './pages/signup.page';
import { MailpitClient } from './helpers/mailpit';

const authFile = 'e2e/.auth/user.json';

setup('register and authenticate', async ({ page }) => {
	const mailpit = new MailpitClient(process.env.MAILPIT_API_URL);
	const signUpPage = new SignUpPage(page);

	// Generate a unique test user for this run
	const testEmail = `e2e-test-${Date.now()}@example.com`;
	const testName = 'E2E Test User';
	const testPassword = 'TestPassword1!';

	// Clean up any leftover emails from previous runs
	await mailpit.deleteAllMessages();

	// Step 1: Fill basic info and submit
	await signUpPage.goto();
	await signUpPage.fillBasicInfo(testName, testEmail);
	await signUpPage.submitBasicInfo();

	// Wait for step 2 — activation code
	await expect(signUpPage.activationDescription).toBeVisible({ timeout: 15_000 });

	// Retrieve the activation code from the email captured by Mailpit
	const activationCode = await mailpit.getActivationCode(testEmail);

	// Step 2: Fill activation code and submit
	await signUpPage.fillActivationCode(activationCode);
	await signUpPage.submitActivation();

	// Wait for step 3 — set password
	await expect(signUpPage.passwordDescription).toBeVisible({ timeout: 15_000 });

	// Step 3: Set password and submit
	await signUpPage.fillPassword(testPassword);
	await signUpPage.submitPassword();

	// After setting the password the app redirects to the dashboard
	await page.waitForURL('/', { timeout: 15_000 });
	await expect(page.locator('h1')).toBeVisible();

	// Persist auth state (cookies + localStorage) for downstream authenticated tests
	await page.context().storageState({ path: authFile });
});
