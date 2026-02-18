import { type Page, type Locator } from '@playwright/test';

export class SignUpPage {
	readonly page: Page;

	// Step 1 — Basic info
	readonly heading: Locator;
	readonly description: Locator;
	readonly nameInput: Locator;
	readonly emailInput: Locator;
	readonly nextButton: Locator;
	readonly googleButton: Locator;
	readonly signInLink: Locator;

	// Step 2 — Activation code
	readonly activationDescription: Locator;
	readonly activationCodeInput: Locator;
	readonly otpCells: Locator;
	readonly otpHiddenInput: Locator;
	readonly resendActivationCodeButton: Locator;
	readonly activationNextButton: Locator;

	// Step 3 — Set password
	readonly passwordDescription: Locator;
	readonly passwordInput: Locator;
	readonly togglePasswordButton: Locator;
	readonly passwordNextButton: Locator;

	// Shared
	readonly toast: Locator;

	constructor(page: Page) {
		this.page = page;

		// Step 1
		this.heading = page.locator('[data-slot="card-title"]', { hasText: /create an account/i });
		this.description = page.getByText(/create a new account to get started/i);
		this.nameInput = page.getByLabel(/name/i);
		this.emailInput = page.getByLabel(/email/i);
		this.nextButton = page.getByRole('button', { name: /next/i });
		this.googleButton = page.getByRole('link', { name: /google/i });
		this.signInLink = page.getByRole('link', { name: /sign in/i });

		// Step 2
		this.activationDescription = page.getByText(/enter the activation code/i);
		this.activationCodeInput = page.getByLabel(/activation code/i);
		// bits-ui PinInput: cell divs get data-slot="input-otp-slot" from shadcn wrapper
		this.otpCells = page.locator('[data-slot="input-otp-slot"]');
		// bits-ui PinInput: the actual hidden <input> that captures keystrokes
		this.otpHiddenInput = page.locator('input[data-pin-input-input]');
		this.resendActivationCodeButton = page.getByRole('button', {
			name: /resend activation code/i
		});
		this.activationNextButton = page.getByRole('button', { name: /next/i });

		// Step 3
		this.passwordDescription = page.getByText(/set your password to complete/i);
		this.passwordInput = page.getByLabel(/password/i);
		this.togglePasswordButton = page.locator('form button[type="button"]');
		this.passwordNextButton = page.getByRole('button', { name: /next/i });

		// Shared
		this.toast = page.locator('[data-sonner-toast]');
	}

	async goto() {
		await this.page.goto('/signup');
	}

	// ---------------------------------------------------------------------------
	// Step 1 — Basic info
	// ---------------------------------------------------------------------------

	async fillBasicInfo(name: string, email: string) {
		await this.nameInput.fill(name);
		await this.emailInput.fill(email);
	}

	async submitBasicInfo() {
		await this.nextButton.click();
	}

	// ---------------------------------------------------------------------------
	// Step 2 — Activation code
	// ---------------------------------------------------------------------------

	/**
	 * Fill the 6-digit OTP activation code.
	 *
	 * bits-ui PinInput renders a hidden <input data-pin-input-input> that
	 * captures keystrokes and distributes characters across the visible cells.
	 * We focus that input and type the digits sequentially.
	 */
	async fillActivationCode(code: string) {
		await this.otpHiddenInput.focus();
		await this.page.keyboard.type(code, { delay: 50 });
	}

	async submitActivation() {
		await this.activationNextButton.click();
	}

	// ---------------------------------------------------------------------------
	// Step 3 — Set password
	// ---------------------------------------------------------------------------

	async fillPassword(password: string) {
		await this.passwordInput.fill(password);
	}

	async submitPassword() {
		await this.passwordNextButton.click();
	}

	// ---------------------------------------------------------------------------
	// Full registration flow (convenience)
	// ---------------------------------------------------------------------------

	/**
	 * Execute the complete registration flow from step 1 through step 3.
	 *
	 * @param name       User display name
	 * @param email      User email address
	 * @param code       6-digit activation code (obtained from Mailpit)
	 * @param password   Password meeting strength requirements
	 */
	async register(name: string, email: string, code: string, password: string) {
		// Step 1 — Basic info
		await this.fillBasicInfo(name, email);
		await this.submitBasicInfo();

		// Wait for step 2
		await this.activationDescription.waitFor({ state: 'visible' });

		// Step 2 — Activation code
		await this.fillActivationCode(code);
		await this.submitActivation();

		// Wait for step 3
		await this.passwordDescription.waitFor({ state: 'visible' });

		// Step 3 — Set password
		await this.fillPassword(password);
		await this.submitPassword();
	}
}
