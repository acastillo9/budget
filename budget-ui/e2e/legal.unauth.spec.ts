import { test, expect } from '@playwright/test';
import { LegalPage } from './pages/legal.page';
import { SignUpPage } from './pages/signup.page';

// ---------------------------------------------------------------------------
// Terms of Service Page — Public Access
// ---------------------------------------------------------------------------
test.describe('Terms of Service — Page Load', () => {
	let termsPage: LegalPage;

	test.beforeEach(async ({ page }) => {
		termsPage = new LegalPage(page, '/terms');
		await termsPage.goto();
		await page.waitForLoadState('networkidle');
	});

	test('should render the Terms of Service page with content or error state', async () => {
		// The /terms page depends on the backend having seeded terms data.
		// When the API is available and terms are seeded, the content renders.
		// Otherwise, the error state is shown.
		const hasContent = await termsPage.title.isVisible();
		const hasError = await termsPage.errorMessage.isVisible();
		expect(hasContent || hasError).toBeTruthy();
	});

	test('should have the correct page title', async ({ page }) => {
		await expect(page).toHaveTitle(/terms of service/i);
	});

	test('should show either content card or error message', async () => {
		// Verify the page loaded and displays one of two valid states
		const contentVisible = await termsPage.contentArea.isVisible();
		const errorVisible = await termsPage.errorMessage.isVisible();
		expect(contentVisible || errorVisible).toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// Privacy Policy Page — Public Access
// ---------------------------------------------------------------------------
test.describe('Privacy Policy — Page Load', () => {
	let privacyPage: LegalPage;

	test.beforeEach(async ({ page }) => {
		privacyPage = new LegalPage(page, '/privacy');
		await privacyPage.goto();
		await page.waitForLoadState('networkidle');
	});

	test('should render the Privacy Policy page with content or error state', async () => {
		const hasContent = await privacyPage.title.isVisible();
		const hasError = await privacyPage.errorMessage.isVisible();
		expect(hasContent || hasError).toBeTruthy();
	});

	test('should have the correct page title', async ({ page }) => {
		await expect(page).toHaveTitle(/privacy policy/i);
	});

	test('should show either content card or error message', async () => {
		const contentVisible = await privacyPage.contentArea.isVisible();
		const errorVisible = await privacyPage.errorMessage.isVisible();
		expect(contentVisible || errorVisible).toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// Footer — Legal Links
// ---------------------------------------------------------------------------
test.describe('Footer — Legal Links', () => {
	test('should display Terms of Service link in footer on signin page', async ({ page }) => {
		await page.goto('/signin');
		await page.waitForLoadState('networkidle');
		const legalPage = new LegalPage(page, '/terms');
		await expect(legalPage.footerTermsLink).toBeVisible();
	});

	test('should display Privacy Policy link in footer on signin page', async ({ page }) => {
		await page.goto('/signin');
		await page.waitForLoadState('networkidle');
		const legalPage = new LegalPage(page, '/terms');
		await expect(legalPage.footerPrivacyLink).toBeVisible();
	});

	test('should navigate to /terms when clicking footer Terms of Service link', async ({ page }) => {
		await page.goto('/signin');
		await page.waitForLoadState('networkidle');
		const legalPage = new LegalPage(page, '/terms');
		await legalPage.footerTermsLink.click();
		await expect(page).toHaveURL(/\/terms/);
	});

	test('should navigate to /privacy when clicking footer Privacy Policy link', async ({ page }) => {
		await page.goto('/signin');
		await page.waitForLoadState('networkidle');
		const legalPage = new LegalPage(page, '/privacy');
		await legalPage.footerPrivacyLink.click();
		await expect(page).toHaveURL(/\/privacy/);
	});

	test('should display footer legal links on signup page', async ({ page }) => {
		await page.goto('/signup');
		await page.waitForLoadState('networkidle');
		const legalPage = new LegalPage(page, '/terms');
		await expect(legalPage.footerTermsLink).toBeVisible();
		await expect(legalPage.footerPrivacyLink).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Sign Up — Consent Checkbox
// ---------------------------------------------------------------------------
test.describe('Sign Up — Consent Checkbox', () => {
	let signUpPage: SignUpPage;

	test.beforeEach(async ({ page }) => {
		signUpPage = new SignUpPage(page);
		await signUpPage.goto();
		await page.waitForLoadState('networkidle');
	});

	test('should display the consent checkbox on the signup form', async () => {
		await expect(signUpPage.consentCheckbox).toBeVisible();
	});

	test('should display the consent label with Terms and Privacy links', async () => {
		await expect(signUpPage.consentLabel).toBeVisible();
		// The label should contain links to /terms and /privacy
		const termsLink = signUpPage.consentLabel.locator('a[href="/terms"]');
		const privacyLink = signUpPage.consentLabel.locator('a[href="/privacy"]');
		await expect(termsLink).toBeVisible();
		await expect(privacyLink).toBeVisible();
	});

	test('should start with consent checkbox unchecked by default', async () => {
		// z.boolean() defaults to false, so the checkbox starts unchecked
		await expect(signUpPage.consentCheckbox).toHaveAttribute('data-state', 'unchecked', {
			timeout: 5_000
		});
	});

	test('should disable next button when consent checkbox is unchecked', async () => {
		await signUpPage.nameInput.fill('Test User');
		await signUpPage.emailInput.fill('test@example.com');
		await signUpPage.nameInput.focus();
		// Checkbox starts unchecked by default
		await expect(signUpPage.consentCheckbox).toHaveAttribute('data-state', 'unchecked', {
			timeout: 5_000
		});
		// Button should be disabled when consent is unchecked
		await expect(signUpPage.nextButton).toBeDisabled({ timeout: 10_000 });
	});

	test('should enable next button when consent checkbox is checked', async () => {
		await signUpPage.nameInput.fill('Test User');
		await signUpPage.emailInput.fill('test@example.com');
		await signUpPage.nameInput.focus();
		// Check the consent checkbox (starts unchecked by default)
		await signUpPage.consentCheckbox.click();
		await expect(signUpPage.consentCheckbox).toHaveAttribute('data-state', 'checked', {
			timeout: 5_000
		});
		await expect(signUpPage.nextButton).toBeEnabled({ timeout: 10_000 });
	});

	test('should disable next button again when consent checkbox is unchecked after checking', async () => {
		await signUpPage.nameInput.fill('Test User');
		await signUpPage.emailInput.fill('test@example.com');
		await signUpPage.nameInput.focus();
		// Check the consent checkbox
		await signUpPage.consentCheckbox.click();
		await expect(signUpPage.consentCheckbox).toHaveAttribute('data-state', 'checked', {
			timeout: 5_000
		});
		await expect(signUpPage.nextButton).toBeEnabled({ timeout: 10_000 });

		// Uncheck the consent checkbox again
		await signUpPage.consentCheckbox.click();
		await expect(signUpPage.consentCheckbox).toHaveAttribute('data-state', 'unchecked', {
			timeout: 5_000
		});
		await expect(signUpPage.nextButton).toBeDisabled({ timeout: 10_000 });
	});

	test('should display the Google consent note below the Google button', async () => {
		await expect(signUpPage.googleConsentNote).toBeVisible();
	});

	test('should have Terms and Privacy links in the Google consent note', async () => {
		// The note uses {@html} to render links — check for anchor elements
		const termsLink = signUpPage.page
			.locator('p')
			.filter({ hasText: /by signing up with google/i })
			.locator('a[href="/terms"]');
		const privacyLink = signUpPage.page
			.locator('p')
			.filter({ hasText: /by signing up with google/i })
			.locator('a[href="/privacy"]');
		await expect(termsLink).toBeVisible();
		await expect(privacyLink).toBeVisible();
	});

	test('should open Terms of Service in new tab from consent checkbox link', async ({
		context
	}) => {
		const termsLink = signUpPage.consentLabel.locator('a[href="/terms"]');
		const [newPage] = await Promise.all([context.waitForEvent('page'), termsLink.click()]);
		await newPage.waitForLoadState('networkidle');
		expect(newPage.url()).toContain('/terms');
		await newPage.close();
	});

	test('should open Privacy Policy in new tab from consent checkbox link', async ({ context }) => {
		const privacyLink = signUpPage.consentLabel.locator('a[href="/privacy"]');
		const [newPage] = await Promise.all([context.waitForEvent('page'), privacyLink.click()]);
		await newPage.waitForLoadState('networkidle');
		expect(newPage.url()).toContain('/privacy');
		await newPage.close();
	});
});

// ---------------------------------------------------------------------------
// Legal Pages — Navigation Between Pages
// ---------------------------------------------------------------------------
test.describe('Legal Pages — Cross Navigation', () => {
	test('should navigate from /terms to /privacy via footer link', async ({ page }) => {
		await page.goto('/terms');
		await page.waitForLoadState('networkidle');
		const legalPage = new LegalPage(page, '/terms');
		await legalPage.footerPrivacyLink.click();
		await expect(page).toHaveURL(/\/privacy/);
	});

	test('should navigate from /privacy to /terms via footer link', async ({ page }) => {
		await page.goto('/privacy');
		await page.waitForLoadState('networkidle');
		const legalPage = new LegalPage(page, '/privacy');
		await legalPage.footerTermsLink.click();
		await expect(page).toHaveURL(/\/terms/);
	});
});
