import { test, expect, type Page } from '@playwright/test';
import { SignInPage } from './pages/signin.page';
import { SignUpPage } from './pages/signup.page';
import { ForgotPasswordPage } from './pages/forgot-password.page';
import { ResetPasswordPage } from './pages/reset-password.page';
import { MailpitClient } from './helpers/mailpit';

// ---------------------------------------------------------------------------
// Shared constants & helpers
// ---------------------------------------------------------------------------

const TEST_PASSWORD = 'TestPassword1!';

/**
 * Register a fresh user via the full signup flow (basic info → activation
 * code from Mailpit → set password). Returns the email used.
 */
async function registerUser(page: Page, mailpit: MailpitClient): Promise<string> {
	const testEmail = `e2e-user-${Date.now()}@example.com`;
	const signUpPage = new SignUpPage(page);

	await signUpPage.goto();
	await signUpPage.fillBasicInfo('E2E Test User', testEmail);
	await signUpPage.submitBasicInfo();

	await signUpPage.activationDescription.waitFor({ state: 'visible', timeout: 15_000 });
	const code = await mailpit.getActivationCode(testEmail);
	await signUpPage.fillActivationCode(code);
	await signUpPage.submitActivation();

	await signUpPage.passwordDescription.waitFor({ state: 'visible', timeout: 15_000 });
	await signUpPage.fillPassword(TEST_PASSWORD);
	await signUpPage.submitPassword();

	await page.waitForURL('/', { timeout: 15_000 });
	return testEmail;
}

// ---------------------------------------------------------------------------
// Sign In Page
// ---------------------------------------------------------------------------
test.describe('Sign In Page', () => {
	let signInPage: SignInPage;

	test.beforeEach(async ({ page }) => {
		signInPage = new SignInPage(page);
		await signInPage.goto();
		await page.waitForLoadState('networkidle');
	});

	test('should display the sign in form with all elements', async () => {
		await expect(signInPage.heading).toBeVisible();
		await expect(signInPage.description).toBeVisible();
		await expect(signInPage.emailInput).toBeVisible();
		await expect(signInPage.passwordInput).toBeVisible();
		await expect(signInPage.rememberMeCheckbox).toBeVisible();
		await expect(signInPage.loginButton).toBeVisible();
		await expect(signInPage.googleLoginButton).toBeVisible();
		await expect(signInPage.forgotPasswordLink).toBeVisible();
		await expect(signInPage.signUpLink).toBeVisible();
	});

	test('should keep login button disabled when fields are empty', async () => {
		await expect(signInPage.loginButton).toBeDisabled();
	});

	test('should enable login button when email and password are filled', async () => {
		await signInPage.fillCredentials('user@example.com', 'SomePassword1!');
		await expect(signInPage.loginButton).toBeEnabled();
	});

	test('should toggle password visibility', async ({ page }) => {
		const passwordInput = page.locator('input[name="password"]');
		const toggleButton = page.locator('input[name="password"] ~ button');

		await passwordInput.fill('secret');
		expect(await passwordInput.getAttribute('type')).toBe('password');

		// Click toggle button to show
		await toggleButton.click();
		await page.waitForFunction(
			() => document.querySelector<HTMLInputElement>('input[name="password"]')?.type === 'text'
		);
		expect(await passwordInput.getAttribute('type')).toBe('text');

		// Click again to hide
		await toggleButton.click();
		await page.waitForFunction(
			() => document.querySelector<HTMLInputElement>('input[name="password"]')?.type === 'password'
		);
		expect(await passwordInput.getAttribute('type')).toBe('password');
	});

	test('should show error toast on invalid credentials', async () => {
		// When the backend is unavailable or returns an error, the server action
		// fails and sets a flash message (rendered as a toast via svelte-sonner).
		await signInPage.signIn('wrong@example.com', 'WrongPass1!');
		await expect(signInPage.toast).toBeVisible();
	});

	test('should navigate to sign up page', async ({ page }) => {
		await signInPage.signUpLink.click();
		await expect(page).toHaveURL(/\/signup/);
	});

	test('should navigate to forgot password page', async ({ page }) => {
		await signInPage.forgotPasswordLink.click();
		await expect(page).toHaveURL(/\/forgot-password/);
	});
});

// ---------------------------------------------------------------------------
// Sign Up Page
// ---------------------------------------------------------------------------
test.describe('Sign Up Page', () => {
	let signUpPage: SignUpPage;

	test.beforeEach(async ({ page }) => {
		signUpPage = new SignUpPage(page);
		await signUpPage.goto();
	});

	test('should display the step 1 registration form with all elements', async () => {
		await expect(signUpPage.heading).toBeVisible();
		await expect(signUpPage.description).toBeVisible();
		await expect(signUpPage.nameInput).toBeVisible();
		await expect(signUpPage.emailInput).toBeVisible();
		await expect(signUpPage.currencyTrigger).toBeVisible();
		await expect(signUpPage.nextButton).toBeVisible();
		await expect(signUpPage.googleButton).toBeVisible();
		await expect(signUpPage.signInLink).toBeVisible();
	});

	test('should show USD as the default currency', async () => {
		await expect(signUpPage.currencyTrigger).toContainText('USD');
	});

	test('should allow selecting a different currency', async () => {
		await signUpPage.selectCurrency('COP');
		await expect(signUpPage.currencyTrigger).toContainText('COP');
	});

	test('should keep next button disabled when fields are empty', async () => {
		await expect(signUpPage.nextButton).toBeDisabled();
	});

	test('should enable next button when name and email are filled', async () => {
		await signUpPage.fillBasicInfo('John Doe', 'john@example.com');
		await expect(signUpPage.nextButton).toBeEnabled();
	});

	test('should show validation error for invalid email format', async () => {
		await signUpPage.nameInput.fill('John Doe');
		await signUpPage.emailInput.fill('invalid-email');
		// Focus away to trigger oninput validation
		await signUpPage.nameInput.focus();
		await expect(signUpPage.page.getByText(/invalid/i)).toBeVisible();
	});

	test('should keep next button disabled when only email is filled', async () => {
		await signUpPage.emailInput.fill('john@example.com');
		// Name is not filled — button should stay disabled
		await expect(signUpPage.nextButton).toBeDisabled();
	});

	test('should keep next button disabled when only name is filled', async () => {
		await signUpPage.nameInput.fill('John Doe');
		// Email is not filled — button should stay disabled
		await expect(signUpPage.nextButton).toBeDisabled();
	});

	test('should navigate to sign in page', async ({ page }) => {
		await signUpPage.signInLink.click();
		await expect(page).toHaveURL(/\/signin/);
	});
});

// ---------------------------------------------------------------------------
// Forgot Password Page
// ---------------------------------------------------------------------------
test.describe('Forgot Password Page', () => {
	let forgotPasswordPage: ForgotPasswordPage;

	test.beforeEach(async ({ page }) => {
		forgotPasswordPage = new ForgotPasswordPage(page);
		await forgotPasswordPage.goto();
	});

	test('should display the forgot password form with all elements', async () => {
		await expect(forgotPasswordPage.heading).toBeVisible();
		await expect(forgotPasswordPage.description).toBeVisible();
		await expect(forgotPasswordPage.emailInput).toBeVisible();
		await expect(forgotPasswordPage.sendButton).toBeVisible();
		await expect(forgotPasswordPage.signInLink).toBeVisible();
	});

	test('should keep send button disabled when email is empty', async () => {
		await expect(forgotPasswordPage.sendButton).toBeDisabled();
	});

	test('should enable send button when valid email is entered', async () => {
		await forgotPasswordPage.fillEmail('user@example.com');
		await expect(forgotPasswordPage.sendButton).toBeEnabled();
	});

	test('should navigate to sign in page', async ({ page }) => {
		await forgotPasswordPage.signInLink.click();
		await expect(page).toHaveURL(/\/signin/);
	});
});

// ---------------------------------------------------------------------------
// Reset Password Page
// ---------------------------------------------------------------------------
test.describe('Reset Password Page', () => {
	test('should redirect to forgot password if token is invalid', async ({ page }) => {
		// The server-side load function verifies the token against the backend.
		// With no backend or an invalid token, it redirects to /forgot-password.
		await page.goto('/reset-password/invalid-token-abc123');
		await expect(page).toHaveURL(/\/forgot-password/);
	});
});

// ---------------------------------------------------------------------------
// Auth Redirects — Protected routes
// ---------------------------------------------------------------------------
test.describe('Auth Redirects', () => {
	const protectedRoutes = ['/', '/accounts', '/transactions', '/bills', '/categories', '/budgets'];

	for (const route of protectedRoutes) {
		test(`should redirect unauthenticated user from ${route} to sign in`, async ({ browser }) => {
			// Create a fresh context with no stored auth state
			const context = await browser.newContext();
			const page = await context.newPage();

			await page.goto(route);
			await expect(page).toHaveURL(/\/signin/);

			await context.close();
		});
	}
});

// ---------------------------------------------------------------------------
// Navigation between auth pages
// ---------------------------------------------------------------------------
test.describe('Auth Page Navigation', () => {
	test('should navigate signin → signup → signin', async ({ page }) => {
		await page.goto('/signin');
		await page.getByRole('link', { name: /sign up/i }).click();
		await expect(page).toHaveURL(/\/signup/);

		await page.getByRole('link', { name: /sign in/i }).click();
		await expect(page).toHaveURL(/\/signin/);
	});

	test('should navigate signin → forgot password → signin', async ({ page }) => {
		await page.goto('/signin');
		await page.getByRole('link', { name: /forgot password/i }).click();
		await expect(page).toHaveURL(/\/forgot-password/);

		await page.getByRole('link', { name: /sign in/i }).click();
		await expect(page).toHaveURL(/\/signin/);
	});
});

// ---------------------------------------------------------------------------
// Complete Registration Flow
// ---------------------------------------------------------------------------
test.describe('Complete Registration Flow', () => {
	let signUpPage: SignUpPage;
	let mailpit: MailpitClient;

	test.beforeEach(async ({ page }) => {
		mailpit = new MailpitClient(process.env.MAILPIT_API_URL);
		signUpPage = new SignUpPage(page);
	});

	test('should complete the full registration flow: signup → activation code → set password → dashboard', async ({
		page
	}) => {
		const testEmail = `register-flow-${Date.now()}@example.com`;
		const testName = 'Register Flow User';

		// ---- Step 1: Basic info ----
		await signUpPage.goto();
		await expect(signUpPage.heading).toBeVisible();
		await expect(signUpPage.description).toBeVisible();

		await signUpPage.fillBasicInfo(testName, testEmail);
		await signUpPage.selectCurrency('COP');
		await expect(signUpPage.currencyTrigger).toContainText('COP');
		await expect(signUpPage.nextButton).toBeEnabled();
		await signUpPage.submitBasicInfo();

		// ---- Step 2: Activation code ----
		// The app moves to step 2 and shows the activation code form
		await expect(signUpPage.activationDescription).toBeVisible({ timeout: 15_000 });
		await expect(signUpPage.otpCells.first()).toBeVisible();
		await expect(signUpPage.resendActivationCodeButton).toBeVisible();

		// Retrieve the activation code from the email captured by Mailpit
		const activationCode = await mailpit.getActivationCode(testEmail);
		expect(activationCode).toMatch(/^\d{6}$/);

		await signUpPage.fillActivationCode(activationCode);
		await signUpPage.submitActivation();

		// ---- Step 3: Set password ----
		await expect(signUpPage.passwordDescription).toBeVisible({ timeout: 15_000 });
		await expect(signUpPage.passwordInput).toBeVisible();

		await signUpPage.fillPassword(TEST_PASSWORD);
		await signUpPage.submitPassword();

		// ---- Verify: redirected to dashboard ----
		await page.waitForURL('/', { timeout: 15_000 });
		await expect(page.locator('h1')).toBeVisible();
	});

	test('should show activation code step after registering with valid info', async () => {
		const testEmail = `step2-check-${Date.now()}@example.com`;

		await signUpPage.goto();
		await signUpPage.fillBasicInfo('Step 2 User', testEmail);
		await signUpPage.submitBasicInfo();

		// Verify step 2 is shown
		await expect(signUpPage.activationDescription).toBeVisible({ timeout: 15_000 });
		await expect(signUpPage.otpCells.first()).toBeVisible();
		await expect(signUpPage.activationNextButton).toBeVisible();
	});

	test('should show set password step after entering a valid activation code', async () => {
		const testEmail = `step3-check-${Date.now()}@example.com`;

		await signUpPage.goto();
		await signUpPage.fillBasicInfo('Step 3 User', testEmail);
		await signUpPage.submitBasicInfo();

		await expect(signUpPage.activationDescription).toBeVisible({ timeout: 15_000 });

		const activationCode = await mailpit.getActivationCode(testEmail);
		await signUpPage.fillActivationCode(activationCode);
		await signUpPage.submitActivation();

		// Verify step 3 is shown
		await expect(signUpPage.passwordDescription).toBeVisible({ timeout: 15_000 });
		await expect(signUpPage.passwordInput).toBeVisible();
		await expect(signUpPage.passwordNextButton).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Complete Login Flow
// ---------------------------------------------------------------------------
test.describe('Complete Login Flow', () => {
	test('should log in with valid credentials and redirect to dashboard', async ({ browser }) => {
		const mailpit = new MailpitClient(process.env.MAILPIT_API_URL);

		// 1. Register a user in a disposable context
		const registerContext = await browser.newContext();
		const registerPage = await registerContext.newPage();
		const testEmail = await registerUser(registerPage, mailpit);
		await registerContext.close();

		// 2. Log in with the registered credentials in a fresh context
		const loginContext = await browser.newContext();
		const page = await loginContext.newPage();
		const signInPage = new SignInPage(page);

		await signInPage.goto();
		await expect(signInPage.heading).toBeVisible();

		await signInPage.fillCredentials(testEmail, TEST_PASSWORD);
		await expect(signInPage.loginButton).toBeEnabled();
		await signInPage.submit();

		// 3. Verify redirect to dashboard
		await page.waitForURL('/', { timeout: 15_000 });
		await expect(page.locator('h1')).toBeVisible();

		await loginContext.close();
	});

	test('should show error toast when logging in with wrong password', async ({ browser }) => {
		const mailpit = new MailpitClient(process.env.MAILPIT_API_URL);

		// Register a user first
		const registerContext = await browser.newContext();
		const registerPage = await registerContext.newPage();
		const testEmail = await registerUser(registerPage, mailpit);
		await registerContext.close();

		// Try to log in with wrong password
		const loginContext = await browser.newContext();
		const page = await loginContext.newPage();
		const signInPage = new SignInPage(page);

		await signInPage.goto();
		await signInPage.signIn(testEmail, 'WrongPassword1!');

		await expect(signInPage.toast).toBeVisible({ timeout: 10_000 });
		// Should still be on the sign-in page
		await expect(page).toHaveURL(/\/signin/);

		await loginContext.close();
	});

	test('should show error toast when logging in with unregistered email', async ({ page }) => {
		const signInPage = new SignInPage(page);

		await signInPage.goto();
		await signInPage.signIn(`nonexistent-${Date.now()}@example.com`, 'SomePassword1!');

		await expect(signInPage.toast).toBeVisible({ timeout: 10_000 });
		await expect(page).toHaveURL(/\/signin/);
	});
});

// ---------------------------------------------------------------------------
// Complete Reset Password Flow
// ---------------------------------------------------------------------------
test.describe('Complete Reset Password Flow', () => {
	test('should reset password via email link and log in with the new password', async ({
		browser
	}) => {
		const mailpit = new MailpitClient(process.env.MAILPIT_API_URL);
		const newPassword = 'NewSecurePass1!';

		// 1. Register a user so we have valid credentials
		const registerContext = await browser.newContext();
		const registerPage = await registerContext.newPage();
		const testEmail = await registerUser(registerPage, mailpit);
		await registerContext.close();

		// Record how many emails exist for this user (activation code email)
		const emailCountBefore = await mailpit.countEmailsFor(testEmail);

		// 2. Request a password reset
		const resetContext = await browser.newContext();
		const resetPage = await resetContext.newPage();
		const forgotPasswordPage = new ForgotPasswordPage(resetPage);

		await forgotPasswordPage.goto();
		await expect(forgotPasswordPage.heading).toBeVisible();
		await expect(forgotPasswordPage.emailInput).toBeVisible();

		await forgotPasswordPage.requestPasswordReset(testEmail);

		// After submitting, the app redirects to /signin with a success flash
		await resetPage.waitForURL(/\/signin/, { timeout: 15_000 });

		// 3. Get the reset token from the email sent by the backend
		const resetToken = await mailpit.getResetPasswordToken(testEmail, emailCountBefore);
		expect(resetToken).toBeTruthy();

		// 4. Navigate to the reset page and set a new password
		const resetPasswordPage = new ResetPasswordPage(resetPage);
		await resetPasswordPage.goto(resetToken);

		await expect(resetPasswordPage.heading).toBeVisible({ timeout: 15_000 });
		await expect(resetPasswordPage.passwordInput).toBeVisible();

		await resetPasswordPage.fillPassword(newPassword);
		await resetPasswordPage.submit();

		// After saving, the app redirects to /signin
		await resetPage.waitForURL(/\/signin/, { timeout: 15_000 });
		await resetContext.close();

		// 5. Log in with the NEW password
		const loginContext = await browser.newContext();
		const loginPage = await loginContext.newPage();
		const signInPage = new SignInPage(loginPage);

		await signInPage.goto();
		await signInPage.fillCredentials(testEmail, newPassword);
		await signInPage.submit();

		await loginPage.waitForURL('/', { timeout: 15_000 });
		await expect(loginPage.locator('h1')).toBeVisible();

		await loginContext.close();
	});

	test('should confirm old password no longer works after reset', async ({ browser }) => {
		const mailpit = new MailpitClient(process.env.MAILPIT_API_URL);
		const newPassword = 'ChangedPass1!';

		// Register a user
		const registerContext = await browser.newContext();
		const registerPage = await registerContext.newPage();
		const testEmail = await registerUser(registerPage, mailpit);
		await registerContext.close();

		const emailCountBefore = await mailpit.countEmailsFor(testEmail);

		// Request password reset
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		const forgotPasswordPage = new ForgotPasswordPage(page);

		await forgotPasswordPage.goto();
		await forgotPasswordPage.requestPasswordReset(testEmail);
		await page.waitForURL(/\/signin/, { timeout: 15_000 });

		// Get reset token and set a new password
		const resetToken = await mailpit.getResetPasswordToken(testEmail, emailCountBefore);
		const resetPasswordPage = new ResetPasswordPage(page);
		await resetPasswordPage.goto(resetToken);

		await expect(resetPasswordPage.heading).toBeVisible({ timeout: 15_000 });
		await resetPasswordPage.fillPassword(newPassword);
		await resetPasswordPage.submit();
		await page.waitForURL(/\/signin/, { timeout: 15_000 });
		await ctx.close();

		// Try to log in with the OLD password — should fail
		const oldPwCtx = await browser.newContext();
		const oldPwPage = await oldPwCtx.newPage();
		const signInPageOld = new SignInPage(oldPwPage);

		await signInPageOld.goto();
		await signInPageOld.signIn(testEmail, TEST_PASSWORD);
		await expect(signInPageOld.toast).toBeVisible({ timeout: 10_000 });
		await expect(oldPwPage).toHaveURL(/\/signin/);
		await oldPwCtx.close();

		// Log in with the NEW password — should succeed
		const newPwCtx = await browser.newContext();
		const newPwPage = await newPwCtx.newPage();
		const signInPageNew = new SignInPage(newPwPage);

		await signInPageNew.goto();
		await signInPageNew.fillCredentials(testEmail, newPassword);
		await signInPageNew.submit();

		await newPwPage.waitForURL('/', { timeout: 15_000 });
		await expect(newPwPage.locator('h1')).toBeVisible();
		await newPwCtx.close();
	});
});
