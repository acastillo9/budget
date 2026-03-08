import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page object for the /terms and /privacy public legal pages.
 * Both pages use the same `legal-content-page.svelte` layout component.
 */
export class LegalPage {
	readonly page: Page;
	readonly route: '/terms' | '/privacy';

	// Content
	readonly title: Locator;
	readonly versionText: Locator;
	readonly lastUpdatedText: Locator;
	readonly contentArea: Locator;

	// Error state
	readonly errorMessage: Locator;

	// Footer legal links (present on all auth-layout pages)
	readonly footerTermsLink: Locator;
	readonly footerPrivacyLink: Locator;

	constructor(page: Page, route: '/terms' | '/privacy') {
		this.page = page;
		this.route = route;

		// The legal-content-page renders a Card with title in card-title slot
		this.title = page.locator('[data-slot="card-title"]');
		this.versionText = page.locator('[data-slot="card-description"]');
		this.lastUpdatedText = page.locator('[data-slot="card-description"]');
		this.contentArea = page.locator('.prose');

		// Error state
		this.errorMessage = page.getByText(/error loading legal content/i);

		// Footer links
		this.footerTermsLink = page.locator('footer').getByRole('link', {
			name: /terms of service/i
		});
		this.footerPrivacyLink = page.locator('footer').getByRole('link', {
			name: /privacy policy/i
		});
	}

	async goto() {
		await this.page.goto(this.route);
	}
}

/**
 * Page object for the Legal & Privacy section on the /workspaces settings page.
 * This section is rendered by `legal-settings-section.svelte`.
 */
export class LegalSettingsSection {
	readonly page: Page;

	// Section card
	readonly sectionCard: Locator;
	readonly sectionTitle: Locator;
	readonly sectionDescription: Locator;

	// Quick links
	readonly viewTermsButton: Locator;
	readonly viewPrivacyButton: Locator;

	// Consent status
	readonly consentStatusHeading: Locator;
	readonly upToDateBadge: Locator;
	readonly actionRequiredBadge: Locator;

	// Consent history
	readonly consentHistoryHeading: Locator;
	readonly noHistoryMessage: Locator;
	readonly consentHistoryItems: Locator;

	constructor(page: Page) {
		this.page = page;

		// The legal settings section is a Card containing "Legal & Privacy"
		this.sectionCard = page.locator('[data-slot="card"]').filter({ hasText: /legal & privacy/i });
		this.sectionTitle = this.sectionCard.locator('[data-slot="card-title"]');
		this.sectionDescription = this.sectionCard.getByText(
			/your legal documents and consent history/i
		);

		// Quick link buttons
		this.viewTermsButton = this.sectionCard.getByRole('link', {
			name: /view terms of service/i
		});
		this.viewPrivacyButton = this.sectionCard.getByRole('link', {
			name: /view privacy policy/i
		});

		// Consent status
		this.consentStatusHeading = this.sectionCard.getByText(/consent status/i);
		this.upToDateBadge = this.sectionCard.getByText(/up to date/i);
		this.actionRequiredBadge = this.sectionCard.getByText(/action required/i);

		// Consent history
		this.consentHistoryHeading = this.sectionCard.getByText(/consent history/i).first();
		this.noHistoryMessage = this.sectionCard.getByText(/no consent history available/i);
		this.consentHistoryItems = this.sectionCard.locator('.rounded-lg.border');
	}

	async expectVisible() {
		await expect(this.sectionCard).toBeVisible({ timeout: 10_000 });
	}
}
