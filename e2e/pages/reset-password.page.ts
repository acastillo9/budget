import { type Page, type Locator } from '@playwright/test';

export class ResetPasswordPage {
	readonly page: Page;
	readonly heading: Locator;
	readonly description: Locator;
	readonly passwordInput: Locator;
	readonly saveButton: Locator;
	readonly togglePasswordButton: Locator;
	readonly signInLink: Locator;
	readonly toast: Locator;

	constructor(page: Page) {
		this.page = page;
		this.heading = page.locator('[data-slot="card-title"]', { hasText: /reset password/i });
		this.description = page.getByText(/please enter your new password/i);
		this.passwordInput = page.getByLabel(/password/i);
		this.saveButton = page.getByRole('button', { name: /save/i });
		this.togglePasswordButton = page.locator('form button[type="button"]');
		this.signInLink = page.getByRole('link', { name: /sign in/i });
		this.toast = page.locator('[data-sonner-toast]');
	}

	async goto(token: string) {
		await this.page.goto(`/reset-password/${token}`);
	}

	async fillPassword(password: string) {
		await this.passwordInput.fill(password);
	}

	async submit() {
		await this.saveButton.click();
	}
}
