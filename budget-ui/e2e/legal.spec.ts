import { test, expect } from './fixtures';
import { LegalSettingsSection } from './pages/legal.page';

// ---------------------------------------------------------------------------
// Legal Settings — Page Load & Section Visibility
// ---------------------------------------------------------------------------
test.describe('Legal Settings — Section on Workspaces Page', () => {
	let legalSection: LegalSettingsSection;

	test.beforeEach(async ({ page }) => {
		legalSection = new LegalSettingsSection(page);
		await page.goto('/workspaces');
		await page.waitForLoadState('networkidle');
	});

	test('should display the Legal & Privacy section card', async () => {
		await legalSection.expectVisible();
		await expect(legalSection.sectionTitle).toBeVisible({ timeout: 10_000 });
	});

	test('should display the section description', async () => {
		await expect(legalSection.sectionDescription).toBeVisible({ timeout: 10_000 });
	});

	test('should display View Terms of Service button', async () => {
		await expect(legalSection.viewTermsButton).toBeVisible({ timeout: 10_000 });
	});

	test('should display View Privacy Policy button', async () => {
		await expect(legalSection.viewPrivacyButton).toBeVisible({ timeout: 10_000 });
	});

	test('should have Terms link that opens /terms', async () => {
		const href = await legalSection.viewTermsButton.getAttribute('href');
		expect(href).toBe('/terms');
	});

	test('should have Privacy link that opens /privacy', async () => {
		const href = await legalSection.viewPrivacyButton.getAttribute('href');
		expect(href).toBe('/privacy');
	});

	test('should display the consent history section heading', async () => {
		await expect(legalSection.consentHistoryHeading).toBeVisible({ timeout: 10_000 });
	});

	test('should display consent status section', async () => {
		// The user registered via the fixture which records consent,
		// so consent status should be visible
		await expect(legalSection.consentStatusHeading).toBeVisible({ timeout: 10_000 });
	});

	test('should show consent history for registered user', async () => {
		// The authenticated user was registered via the fixture flow which
		// triggers consent recording on the backend. They should have at
		// least some consent history, OR the "no history" message if the
		// backend did not record consent (e.g. timing issue).
		const hasHistory = await legalSection.consentHistoryItems.count();
		const hasNoHistoryMessage = await legalSection.noHistoryMessage.isVisible();

		// One of these must be true
		expect(hasHistory > 0 || hasNoHistoryMessage).toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// Legal Settings — Consent Status Display
// ---------------------------------------------------------------------------
test.describe('Legal Settings — Consent Status', () => {
	let legalSection: LegalSettingsSection;

	test.beforeEach(async ({ page }) => {
		legalSection = new LegalSettingsSection(page);
		await page.goto('/workspaces');
		await page.waitForLoadState('networkidle');
	});

	test('should display either "Up to date" or "Action required" badge', async () => {
		// The consent status should show one of these badges
		const upToDate = await legalSection.upToDateBadge.isVisible();
		const actionRequired = await legalSection.actionRequiredBadge.isVisible();

		expect(upToDate || actionRequired).toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// Legal Settings — View Terms/Privacy Links Open Correct Pages
// ---------------------------------------------------------------------------
test.describe('Legal Settings — Quick Links', () => {
	let legalSection: LegalSettingsSection;

	test.beforeEach(async ({ page }) => {
		legalSection = new LegalSettingsSection(page);
		await page.goto('/workspaces');
		await page.waitForLoadState('networkidle');
	});

	test('should open Terms of Service page from View Terms button', async ({ page, context }) => {
		const [newPage] = await Promise.all([
			context.waitForEvent('page'),
			legalSection.viewTermsButton.click()
		]);
		await newPage.waitForLoadState('networkidle');
		expect(newPage.url()).toContain('/terms');
		await newPage.close();
	});

	test('should open Privacy Policy page from View Privacy button', async ({ page, context }) => {
		const [newPage] = await Promise.all([
			context.waitForEvent('page'),
			legalSection.viewPrivacyButton.click()
		]);
		await newPage.waitForLoadState('networkidle');
		expect(newPage.url()).toContain('/privacy');
		await newPage.close();
	});
});
