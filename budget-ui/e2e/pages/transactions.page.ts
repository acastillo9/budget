import { type Page, type Locator, expect } from '@playwright/test';

export class TransactionsPage {
	readonly page: Page;

	// Page header
	readonly heading: Locator;
	readonly description: Locator;

	// Add transaction dialog trigger
	readonly addTransactionButton: Locator;

	// Dialog elements
	readonly dialog: Locator;

	// Step 1: Transaction type buttons
	readonly incomeTypeButton: Locator;
	readonly expenseTypeButton: Locator;
	readonly transferTypeButton: Locator;

	// Navigation buttons
	readonly nextButton: Locator;
	readonly backButton: Locator;
	readonly saveButton: Locator;

	// Step 3: Transaction form fields
	readonly accountTrigger: Locator;
	readonly amountInput: Locator;
	readonly dateTrigger: Locator;
	readonly descriptionInput: Locator;
	readonly notesInput: Locator;

	// Step 3: Transfer form fields
	readonly fromAccountTrigger: Locator;
	readonly toAccountTrigger: Locator;

	// Confirmation dialog
	readonly confirmationDialog: Locator;
	readonly confirmationDescription: Locator;
	readonly confirmDeleteButton: Locator;
	readonly cancelDeleteButton: Locator;

	// Toast
	readonly toast: Locator;

	// Empty state
	readonly emptyState: Locator;

	constructor(page: Page) {
		this.page = page;

		// Page header
		this.heading = page.getByRole('heading', { level: 1, name: /transactions/i });
		this.description = page.getByText(/view and manage your transactions/i);

		// Add transaction dialog trigger
		this.addTransactionButton = page.getByRole('button', { name: /add transaction/i });

		// Dialog
		this.dialog = page.getByRole('dialog');

		// Step 1: Transaction type buttons (inside dialog)
		this.incomeTypeButton = this.dialog.getByRole('button', { name: /^income$/i });
		this.expenseTypeButton = this.dialog.getByRole('button', { name: /^expense$/i });
		this.transferTypeButton = this.dialog.getByRole('button', { name: /^transfer$/i });

		// Navigation buttons
		this.nextButton = this.dialog.getByRole('button', { name: /next/i });
		this.backButton = this.dialog.getByRole('button', { name: /back/i });
		this.saveButton = this.dialog.getByRole('button', { name: /^save$/i });

		// Step 3: Transaction form fields
		this.accountTrigger = this.dialog.getByLabel(/^account$/i);
		this.amountInput = this.dialog.getByLabel(/^amount$/i);
		this.dateTrigger = this.dialog.getByLabel(/^date$/i);
		this.descriptionInput = this.dialog.getByLabel(/^description$/i);
		this.notesInput = this.dialog.getByLabel(/notes/i);

		// Step 3: Transfer form fields
		this.fromAccountTrigger = this.dialog.getByLabel(/from account/i);
		this.toAccountTrigger = this.dialog.getByLabel(/to account/i);

		// Confirmation dialog (AlertDialog)
		this.confirmationDialog = page.getByRole('alertdialog');
		this.confirmationDescription = this.confirmationDialog.locator(
			'[data-alert-dialog-description]'
		);
		this.confirmDeleteButton = this.confirmationDialog.getByRole('button', { name: /delete/i });
		this.cancelDeleteButton = this.confirmationDialog.getByRole('button', { name: /cancel/i });

		// Toast
		this.toast = page.locator('[data-sonner-toast]');

		// Empty state
		this.emptyState = page.getByText(/no transactions yet/i);
	}

	async goto() {
		await this.page.goto('/transactions');
	}

	// ---------------------------------------------------------------------------
	// Dialog interactions
	// ---------------------------------------------------------------------------

	async openAddDialog() {
		await this.page.waitForLoadState('networkidle');
		await this.addTransactionButton.click();
		await expect(this.dialog).toBeVisible({ timeout: 10_000 });
	}

	// ---------------------------------------------------------------------------
	// Step 1: Transaction type selection
	// ---------------------------------------------------------------------------

	async selectTransactionType(type: 'INCOME' | 'EXPENSE' | 'TRANSFER') {
		const typeButton = {
			INCOME: this.incomeTypeButton,
			EXPENSE: this.expenseTypeButton,
			TRANSFER: this.transferTypeButton
		}[type];
		await typeButton.click();
	}

	// ---------------------------------------------------------------------------
	// Step 2: Category selection
	// ---------------------------------------------------------------------------

	async selectCategory(categoryName: string) {
		const categoryContainer = this.dialog.locator('.flex.flex-col.items-center', {
			hasText: categoryName
		});
		await categoryContainer.getByRole('button').click();
	}

	/**
	 * Returns the search input in the choose-category step.
	 */
	get categorySearchInput(): Locator {
		return this.dialog.getByPlaceholder(/search categories/i);
	}

	/**
	 * Returns all visible category items in the choose-category grid (excludes "Create New").
	 */
	getCategoryItems(): Locator {
		return this.dialog.locator('.grid .flex.flex-col.items-center').filter({
			hasNot: this.dialog.locator('text=Create New')
		});
	}

	/**
	 * Type a search term in the category search field.
	 */
	async searchCategory(term: string) {
		await this.categorySearchInput.fill(term);
	}

	/**
	 * Click the "Create New" category button on step 2 to open the nested category creation dialog.
	 */
	async clickCreateNewCategory() {
		const createNewContainer = this.dialog.locator('.flex.flex-col.items-center', {
			hasText: /create new/i
		});
		await createNewContainer.getByRole('button').click();
	}

	/**
	 * Fill and submit the nested "Create New Category" dialog from within step 2.
	 * After success the nested dialog closes and the new category appears in the grid.
	 */
	async createCategoryInWizard(categoryName: string, iconTitle: string) {
		await this.clickCreateNewCategory();

		// The nested dialog has the title "Create New Category"
		const nestedDialog = this.page.getByRole('dialog', { name: /create new category/i });
		await expect(nestedDialog).toBeVisible({ timeout: 10_000 });

		// Fill category name
		await nestedDialog.getByLabel(/category name/i).fill(categoryName);

		// Select an icon by its title attribute
		await nestedDialog.getByRole('button', { name: iconTitle, exact: true }).click();

		// Submit
		await nestedDialog.getByRole('button', { name: /create category/i }).click();

		// Wait for the nested dialog to close
		await expect(nestedDialog).not.toBeVisible({ timeout: 10_000 });
	}

	// ---------------------------------------------------------------------------
	// Navigation
	// ---------------------------------------------------------------------------

	async goToNextStep() {
		await this.nextButton.scrollIntoViewIfNeeded();
		await this.nextButton.click();
	}

	async goToPreviousStep() {
		await this.backButton.scrollIntoViewIfNeeded();
		await this.backButton.click();
	}

	// ---------------------------------------------------------------------------
	// Step 3: Form interactions
	// ---------------------------------------------------------------------------

	async selectAccount(accountName: string) {
		await this.accountTrigger.click();
		await this.page
			.getByRole('option', { name: new RegExp(accountName) })
			.and(this.page.locator(':visible'))
			.click();
	}

	async selectFromAccount(accountName: string) {
		await this.fromAccountTrigger.click();
		await this.page
			.locator('[data-slot="select-content"][data-state="open"]')
			.getByRole('option', { name: new RegExp(accountName) })
			.click();
	}

	async selectToAccount(accountName: string) {
		await this.toAccountTrigger.click();
		await this.page
			.locator('[data-slot="select-content"][data-state="open"]')
			.getByRole('option', { name: new RegExp(accountName) })
			.click();
	}

	async fillAmount(amount: string) {
		await this.amountInput.fill(amount);
	}

	async fillDescription(description: string) {
		await this.descriptionInput.fill(description);
	}

	async fillNotes(notes: string) {
		await this.notesInput.fill(notes);
	}

	async submitSave() {
		await this.saveButton.click();
	}

	// ---------------------------------------------------------------------------
	// High-level creation methods
	// ---------------------------------------------------------------------------

	/**
	 * Complete flow: open dialog → select income type → select category → fill form → save.
	 */
	async createIncomeTransaction(data: {
		categoryName: string;
		account: string;
		amount: string;
		description: string;
		notes?: string;
	}) {
		await this.openAddDialog();
		await this.selectTransactionType('INCOME');
		await this.goToNextStep();
		await this.selectCategory(data.categoryName);
		await this.goToNextStep();
		await this.selectAccount(data.account);
		await this.fillAmount(data.amount);
		await this.fillDescription(data.description);
		if (data.notes) await this.fillNotes(data.notes);
		await this.submitSave();
	}

	/**
	 * Complete flow: open dialog → select expense type → select category → fill form → save.
	 */
	async createExpenseTransaction(data: {
		categoryName: string;
		account: string;
		amount: string;
		description: string;
		notes?: string;
	}) {
		await this.openAddDialog();
		await this.selectTransactionType('EXPENSE');
		await this.goToNextStep();
		await this.selectCategory(data.categoryName);
		await this.goToNextStep();
		await this.selectAccount(data.account);
		await this.fillAmount(data.amount);
		await this.fillDescription(data.description);
		if (data.notes) await this.fillNotes(data.notes);
		await this.submitSave();
	}

	/**
	 * Complete flow: open dialog → select transfer type → fill form → save.
	 * Transfer skips the category step (goes directly from step 1 to step 3).
	 */
	async createTransfer(data: {
		fromAccount: string;
		toAccount: string;
		amount: string;
		description: string;
		notes?: string;
	}) {
		await this.openAddDialog();
		await this.selectTransactionType('TRANSFER');
		await this.goToNextStep(); // Skips to step 3 for transfers
		await this.selectFromAccount(data.fromAccount);
		await this.selectToAccount(data.toAccount);
		await this.fillAmount(data.amount);
		await this.fillDescription(data.description);
		if (data.notes) await this.fillNotes(data.notes);
		await this.submitSave();
	}

	// ---------------------------------------------------------------------------
	// Transaction list interactions
	// ---------------------------------------------------------------------------

	/**
	 * Returns the row locator for a transaction identified by its description text.
	 */
	getTransactionItem(description: string): Locator {
		return this.page.locator('.space-y-4 > div', { hasText: description });
	}

	/**
	 * Click the edit (pencil) icon button for the given transaction.
	 */
	async clickEdit(description: string) {
		await this.page.waitForLoadState('networkidle');
		const item = this.getTransactionItem(description);
		await expect(item).toBeVisible({ timeout: 10_000 });
		// The edit button is the first button in the transaction item's action area
		await item.getByRole('button').first().click();
		await expect(this.dialog).toBeVisible({ timeout: 10_000 });
	}

	/**
	 * Click the delete (trash) icon button for the given transaction.
	 */
	async clickDelete(description: string) {
		await this.page.waitForLoadState('networkidle');
		const item = this.getTransactionItem(description);
		await expect(item).toBeVisible({ timeout: 10_000 });
		// The delete button has the text-destructive class
		await item.locator('button.text-destructive').click();
		await expect(this.confirmationDialog).toBeVisible({ timeout: 10_000 });
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
	 * Complete flow: click delete → confirm in dialog.
	 */
	async deleteTransaction(description: string) {
		await this.clickDelete(description);
		await this.confirmDeletion();
	}

	/**
	 * Complete flow: click edit → update fields → submit.
	 */
	async editTransaction(
		existingDescription: string,
		newData: { description?: string; amount?: string; notes?: string }
	) {
		await this.clickEdit(existingDescription);
		if (newData.description !== undefined) {
			await this.descriptionInput.clear();
			await this.fillDescription(newData.description);
		}
		if (newData.amount !== undefined) {
			await this.amountInput.clear();
			await this.fillAmount(newData.amount);
		}
		if (newData.notes !== undefined) {
			await this.notesInput.clear();
			await this.fillNotes(newData.notes);
		}
		await this.submitSave();
	}

	// ---------------------------------------------------------------------------
	// Toast assertions
	// ---------------------------------------------------------------------------

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
