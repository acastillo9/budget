import { type Page, type Locator } from '@playwright/test';

export class ForgotPasswordPage {
	readonly page: Page;
	readonly heading: Locator;
	readonly emailInput: Locator;
	readonly sendButton: Locator;
	readonly signInLink: Locator;
	readonly description: Locator;
	readonly toast: Locator;

	constructor(page: Page) {
		this.page = page;
		this.heading = page.locator('[data-slot="card-title"]', { hasText: /forgot password/i });
		this.emailInput = page.getByLabel(/email/i);
		this.sendButton = page.getByRole('button', { name: /send/i });
		this.signInLink = page.getByRole('link', { name: /sign in/i });
		this.description = page.getByText(/enter your email to receive a password reset link/i);
		this.toast = page.locator('[data-sonner-toast]');
	}

	async goto() {
		await this.page.goto('/forgot-password');
	}

	async fillEmail(email: string) {
		await this.emailInput.fill(email);
	}

	async submit() {
		await this.sendButton.click();
	}

	async requestPasswordReset(email: string) {
		await this.fillEmail(email);
		await this.submit();
	}
}
