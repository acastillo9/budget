import { type Page, type Locator, expect } from '@playwright/test';

export class AccountsPage {
	readonly page: Page;

	// Page header
	readonly heading: Locator;
	readonly description: Locator;

	// Add account dialog trigger
	readonly addAccountButton: Locator;

	// Dialog elements
	readonly dialog: Locator;
	readonly dialogTitle: Locator;
	readonly nameInput: Locator;
	readonly balanceInput: Locator;
	readonly accountTypeTrigger: Locator;
	readonly currencyTrigger: Locator;
	readonly createAccountButton: Locator;
	readonly saveButton: Locator;

	// Account list
	readonly accountList: Locator;
	readonly emptyState: Locator;

	// Confirmation dialog
	readonly confirmationDialog: Locator;
	readonly confirmationTitle: Locator;
	readonly confirmationDescription: Locator;
	readonly confirmDeleteButton: Locator;
	readonly cancelDeleteButton: Locator;

	// Toast
	readonly toast: Locator;

	constructor(page: Page) {
		this.page = page;

		// Page header
		this.heading = page.getByRole('heading', { level: 1, name: /accounts/i });
		this.description = page.getByText(/view and manage your accounts/i);

		// Add account dialog trigger
		this.addAccountButton = page.getByRole('button', { name: /add account/i });

		// Dialog elements (inside the dialog overlay)
		this.dialog = page.getByRole('dialog');
		this.dialogTitle = this.dialog.locator('[data-dialog-title]');
		this.nameInput = page.getByLabel(/account name/i);
		this.balanceInput = page.getByLabel(/account balance/i);
		this.accountTypeTrigger = this.dialog.locator('[data-slot="select-trigger"]').first();
		this.currencyTrigger = this.dialog.locator('[data-slot="select-trigger"]').last();
		this.createAccountButton = page.getByRole('button', { name: /create account/i });
		this.saveButton = page.getByRole('button', { name: /^save$/i });

		// Account list — each account card is a bordered div inside the card content
		this.accountList = page.locator('.space-y-4 > .rounded-lg.border');
		this.emptyState = page.getByText(/no accounts yet/i);

		// Confirmation dialog (AlertDialog)
		this.confirmationDialog = page.getByRole('alertdialog');
		this.confirmationTitle = this.confirmationDialog.locator('[data-alert-dialog-title]');
		this.confirmationDescription = this.confirmationDialog.locator(
			'[data-alert-dialog-description]'
		);
		this.confirmDeleteButton = this.confirmationDialog.getByRole('button', { name: /delete/i });
		this.cancelDeleteButton = this.confirmationDialog.getByRole('button', { name: /cancel/i });

		// Toast
		this.toast = page.locator('[data-sonner-toast]');
	}

	async goto() {
		await this.page.goto('/accounts');
	}

	// ---------------------------------------------------------------------------
	// Account form interactions
	// ---------------------------------------------------------------------------

	async openAddDialog() {
		await this.addAccountButton.click();
		await expect(this.dialog).toBeVisible();
	}

	async fillName(name: string) {
		await this.nameInput.fill(name);
	}

	async fillBalance(balance: string) {
		await this.balanceInput.fill(balance);
	}

	async selectAccountType(typeName: string) {
		await this.accountTypeTrigger.click();
		await this.page.getByRole('option', { name: typeName, exact: true }).click();
	}

	async selectCurrency(currencyCode: string) {
		await this.currencyTrigger.click();
		await this.page.getByRole('option', { name: new RegExp(currencyCode, 'i') }).click();
	}

	async submitCreate() {
		await this.createAccountButton.click();
	}

	async submitSave() {
		await this.saveButton.click();
	}

	/**
	 * Complete flow: open dialog → fill form → submit for creation.
	 */
	async createAccount(
		name: string,
		balance: string,
		accountType: string,
		currency?: string
	) {
		await this.openAddDialog();
		await this.fillName(name);
		await this.fillBalance(balance);
		await this.selectAccountType(accountType);
		if (currency) {
			await this.selectCurrency(currency);
		}
		await this.submitCreate();
	}

	// ---------------------------------------------------------------------------
	// Account list interactions
	// ---------------------------------------------------------------------------

	/**
	 * Returns the card locator for an account identified by its name.
	 */
	getAccountCard(name: string): Locator {
		return this.page.locator('.rounded-lg.border', { hasText: name });
	}

	/**
	 * Click the edit (pencil) icon button for the given account.
	 */
	async clickEdit(accountName: string) {
		const card = this.getAccountCard(accountName);
		await card.getByRole('button').first().click();
		await expect(this.dialog).toBeVisible();
	}

	/**
	 * Click the delete (trash) icon button for the given account.
	 */
	async clickDelete(accountName: string) {
		const card = this.getAccountCard(accountName);
		await card.getByRole('button').last().click();
		await expect(this.confirmationDialog).toBeVisible();
	}

	/**
	 * Confirm deletion in the confirmation dialog.
	 */
	async confirmDeletion() {
		await this.confirmDeleteButton.click();
	}

	/**
	 * Cancel deletion in the confirmation dialog.
	 */
	async cancelDeletion() {
		await this.cancelDeleteButton.click();
	}

	/**
	 * Complete flow: click edit → update fields → submit.
	 */
	async editAccount(
		existingName: string,
		newData: { name?: string; balance?: string; accountType?: string; currency?: string }
	) {
		await this.clickEdit(existingName);
		if (newData.name !== undefined) {
			await this.nameInput.clear();
			await this.fillName(newData.name);
		}
		if (newData.balance !== undefined) {
			await this.balanceInput.clear();
			await this.fillBalance(newData.balance);
		}
		if (newData.accountType) {
			await this.selectAccountType(newData.accountType);
		}
		if (newData.currency) {
			await this.selectCurrency(newData.currency);
		}
		await this.submitSave();
	}

	/**
	 * Complete flow: click delete → confirm in dialog.
	 */
	async deleteAccount(accountName: string) {
		await this.clickDelete(accountName);
		await this.confirmDeletion();
	}

	/**
	 * Wait for a success toast to appear and optionally check its text.
	 */
	async expectSuccessToast(textPattern?: RegExp) {
		const toastLocator = textPattern
			? this.page.locator('[data-sonner-toast]', { hasText: textPattern })
			: this.toast;
		await expect(toastLocator).toBeVisible({ timeout: 10_000 });
	}
}
