import { type Page, type Locator } from '@playwright/test';

export class SignInPage {
	readonly page: Page;
	readonly heading: Locator;
	readonly description: Locator;
	readonly emailInput: Locator;
	readonly passwordInput: Locator;
	readonly rememberMeCheckbox: Locator;
	readonly loginButton: Locator;
	readonly googleLoginButton: Locator;
	readonly forgotPasswordLink: Locator;
	readonly signUpLink: Locator;
	readonly togglePasswordButton: Locator;
	readonly toast: Locator;

	constructor(page: Page) {
		this.page = page;
		this.heading = page.locator('[data-slot="card-title"]', { hasText: /sign in/i });
		this.description = page.getByText(/sign in to your account/i);
		this.emailInput = page.getByLabel(/email/i);
		this.passwordInput = page.getByLabel(/password/i);
		this.rememberMeCheckbox = page.getByRole('checkbox');
		this.loginButton = page.getByRole('button', { name: /^login$/i });
		this.googleLoginButton = page.getByRole('link', { name: /login with google/i });
		this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
		this.signUpLink = page.getByRole('link', { name: /sign up/i });
		this.togglePasswordButton = page.locator('div.relative:has(input[name="password"]) > button');
		this.toast = page.locator('[data-sonner-toast]');
	}

	async goto() {
		await this.page.goto('/signin');
	}

	async fillCredentials(email: string, password: string) {
		await this.emailInput.fill(email);
		await this.passwordInput.fill(password);
	}

	async submit() {
		await this.loginButton.click();
	}

	async signIn(email: string, password: string) {
		await this.fillCredentials(email, password);
		await this.submit();
	}
}
