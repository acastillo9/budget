import { type Page, type Locator, expect } from '@playwright/test';

export type BillFrequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY';

export class BillsPage {
	readonly page: Page;

	// Page header
	readonly heading: Locator;
	readonly description: Locator;

	// Add bill dialog trigger
	readonly addBillButton: Locator;

	// Dialog elements
	readonly dialog: Locator;

	// Wizard navigation
	readonly nextButton: Locator;
	readonly backButton: Locator;
	readonly saveButton: Locator;

	// Step 2: Bill form fields
	readonly nameInput: Locator;
	readonly amountInput: Locator;
	readonly dueDateTrigger: Locator;
	readonly endDateTrigger: Locator;
	readonly frequencyTrigger: Locator;
	readonly accountTrigger: Locator;
	readonly applyToFutureSwitch: Locator;

	// Month navigation
	readonly prevMonthButton: Locator;
	readonly nextMonthButton: Locator;
	readonly monthLabel: Locator;
	readonly goToCurrentMonthLink: Locator;

	// Confirmation dialog
	readonly confirmationDialog: Locator;
	readonly confirmationDescription: Locator;
	readonly confirmDeleteButton: Locator;
	readonly cancelDeleteButton: Locator;
	readonly deleteSeriesSwitch: Locator;

	// Toast
	readonly toast: Locator;

	// Empty state
	readonly emptyState: Locator;

	constructor(page: Page) {
		this.page = page;

		// Page header
		this.heading = page.getByRole('heading', { level: 1, name: /bills/i });
		this.description = page.getByText(/view and manage your bills/i);

		// Add bill dialog trigger
		this.addBillButton = page.getByRole('button', { name: /add bill/i });

		// Dialog
		this.dialog = page.getByRole('dialog');

		// Wizard navigation buttons
		this.nextButton = this.dialog.getByRole('button', { name: /next/i });
		this.backButton = this.dialog.getByRole('button', { name: /back/i });
		this.saveButton = this.dialog.getByRole('button', { name: /^save$/i });

		// Step 2: Bill form fields (inside dialog)
		this.nameInput = this.dialog.getByLabel(/^name$/i);
		this.amountInput = this.dialog.getByLabel(/^amount$/i);
		this.dueDateTrigger = this.dialog.getByLabel(/^due date$/i);
		this.endDateTrigger = this.dialog.getByLabel(/end date/i);
		this.frequencyTrigger = this.dialog.getByLabel(/^frequency$/i);
		this.accountTrigger = this.dialog.getByLabel(/^account$/i);
		this.applyToFutureSwitch = this.dialog.locator('button[role="switch"]');

		// Month navigation
		this.prevMonthButton = page.getByRole('button', { name: /previous month/i });
		this.nextMonthButton = page.getByRole('button', { name: /next month/i });
		this.monthLabel = page.locator('span.text-2xl.font-bold.capitalize');
		this.goToCurrentMonthLink = page.getByRole('button', { name: /go to current month/i });

		// Confirmation dialog (AlertDialog)
		this.confirmationDialog = page.getByRole('alertdialog');
		this.confirmationDescription = this.confirmationDialog.locator(
			'[data-alert-dialog-description]'
		);
		this.confirmDeleteButton = this.confirmationDialog.getByRole('button', { name: /delete/i });
		this.cancelDeleteButton = this.confirmationDialog.getByRole('button', { name: /cancel/i });
		this.deleteSeriesSwitch = this.confirmationDialog.locator('button[role="switch"]');

		// Toast
		this.toast = page.locator('[data-sonner-toast]');

		// Empty state
		this.emptyState = page.getByText(/no bills yet/i);
	}

	async goto(month?: string) {
		const url = month ? `/bills?month=${month}` : '/bills';
		await this.page.goto(url);
	}

	// ---------------------------------------------------------------------------
	// Dialog interactions
	// ---------------------------------------------------------------------------

	async openAddDialog() {
		await this.page.waitForLoadState('networkidle');
		await this.addBillButton.click();
		await expect(this.dialog).toBeVisible({ timeout: 10_000 });
	}

	// ---------------------------------------------------------------------------
	// Step 1: Category selection
	// ---------------------------------------------------------------------------

	async selectCategory(categoryName: string) {
		const categoryContainer = this.dialog.locator('.flex.flex-col.items-center', {
			hasText: categoryName
		});
		await categoryContainer.getByRole('button').click();
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
	// Step 2: Form interactions
	// ---------------------------------------------------------------------------

	async fillName(name: string) {
		await this.nameInput.fill(name);
	}

	async fillAmount(amount: string) {
		await this.amountInput.fill(amount);
	}

	async selectFrequency(frequency: BillFrequency) {
		await this.frequencyTrigger.click();
		const frequencyLabels: Record<BillFrequency, string> = {
			ONCE: 'Once',
			DAILY: 'Daily',
			WEEKLY: 'Weekly',
			BIWEEKLY: 'Biweekly',
			MONTHLY: 'Monthly',
			YEARLY: 'Yearly'
		};
		await this.page.getByRole('option', { name: frequencyLabels[frequency], exact: true }).click();
	}

	async selectAccount(accountName: string) {
		await this.accountTrigger.click();
		await this.page.getByRole('option', { name: new RegExp(accountName) }).click();
	}

	async toggleApplyToFuture() {
		await this.applyToFutureSwitch.click();
	}

	async submitSave() {
		await expect(this.saveButton).toBeEnabled({ timeout: 10_000 });
		await this.saveButton.click();
	}

	// ---------------------------------------------------------------------------
	// High-level creation methods
	// ---------------------------------------------------------------------------

	/**
	 * Complete flow: open dialog -> select category -> fill form -> save.
	 */
	async createBill(data: {
		categoryName: string;
		name: string;
		amount: string;
		frequency: BillFrequency;
		account: string;
	}) {
		await this.openAddDialog();
		await this.selectCategory(data.categoryName);
		await this.goToNextStep();
		await this.fillName(data.name);
		await this.fillAmount(data.amount);
		await this.selectFrequency(data.frequency);
		await this.selectAccount(data.account);
		await this.submitSave();
	}

	// ---------------------------------------------------------------------------
	// Bill list interactions
	// ---------------------------------------------------------------------------

	/**
	 * Returns the row locator for a bill identified by its name text.
	 */
	getBillItem(billName: string): Locator {
		return this.page.locator('.rounded-lg.border.p-4', { hasText: billName });
	}

	/**
	 * Click the edit (pencil) icon button for the given bill.
	 * The bill item actions area has: [Pay Now/Unpay] [Edit (ghost)] [Delete (ghost text-destructive)]
	 */
	async clickEdit(billName: string) {
		await this.page.waitForLoadState('networkidle');
		const item = this.getBillItem(billName).first();
		await expect(item).toBeVisible({ timeout: 10_000 });
		// Delete button has text-destructive class; edit button is the ghost icon button before it
		const deleteBtn = item.locator('button.text-destructive');
		// The edit button is the previous sibling of the delete button
		await deleteBtn.locator('xpath=preceding-sibling::button[1]').click();
		await expect(this.dialog).toBeVisible({ timeout: 10_000 });
	}

	/**
	 * Click the delete (trash) icon button for the given bill.
	 */
	async clickDelete(billName: string) {
		await this.page.waitForLoadState('networkidle');
		const item = this.getBillItem(billName).first();
		await expect(item).toBeVisible({ timeout: 10_000 });
		await item.locator('button.text-destructive').click();
		await expect(this.confirmationDialog).toBeVisible({ timeout: 10_000 });
	}

	/**
	 * Click the Pay Now button for the given bill.
	 */
	async clickPayNow(billName: string) {
		await this.page.waitForLoadState('networkidle');
		const item = this.getBillItem(billName).first();
		await expect(item).toBeVisible({ timeout: 10_000 });
		await item.getByRole('button', { name: /pay now/i }).click();
	}

	/**
	 * Click the Unpay button for the given bill.
	 */
	async clickUnpay(billName: string) {
		await this.page.waitForLoadState('networkidle');
		const item = this.getBillItem(billName).first();
		await expect(item).toBeVisible({ timeout: 10_000 });
		await item.getByRole('button', { name: /unpay/i }).click();
	}

	// ---------------------------------------------------------------------------
	// Delete interactions
	// ---------------------------------------------------------------------------

	async confirmDeletion() {
		await this.confirmDeleteButton.click();
	}

	async cancelDeletion() {
		await this.cancelDeleteButton.click();
	}

	async toggleDeleteSeries() {
		await this.deleteSeriesSwitch.click();
	}

	/**
	 * Complete flow: click delete -> confirm deletion (single instance by default).
	 */
	async deleteBill(billName: string, series = false) {
		await this.clickDelete(billName);
		if (series) {
			await this.toggleDeleteSeries();
		}
		await this.confirmDeletion();
	}

	// ---------------------------------------------------------------------------
	// Edit interactions
	// ---------------------------------------------------------------------------

	/**
	 * Complete flow: click edit -> update fields -> submit.
	 */
	async editBill(
		existingName: string,
		newData: {
			name?: string;
			amount?: string;
			frequency?: BillFrequency;
			applyToFuture?: boolean;
		}
	) {
		await this.clickEdit(existingName);

		// Toggle apply to future first if needed (enables frequency/endDate fields)
		if (newData.applyToFuture) {
			await this.toggleApplyToFuture();
		}

		if (newData.name !== undefined) {
			await this.nameInput.clear();
			await this.fillName(newData.name);
		}
		if (newData.amount !== undefined) {
			await this.amountInput.clear();
			await this.fillAmount(newData.amount);
		}
		if (newData.frequency) {
			await this.selectFrequency(newData.frequency);
		}
		await this.submitSave();
	}

	// ---------------------------------------------------------------------------
	// Month navigation
	// ---------------------------------------------------------------------------

	async goToPreviousMonth() {
		await this.page.waitForLoadState('networkidle');
		const currentLabel = await this.monthLabel.textContent();
		await this.prevMonthButton.click();
		await expect(this.monthLabel).not.toHaveText(currentLabel!, { timeout: 10_000 });
		await this.page.waitForLoadState('networkidle');
	}

	async goToNextMonth() {
		await this.page.waitForLoadState('networkidle');
		const currentLabel = await this.monthLabel.textContent();
		await this.nextMonthButton.click();
		await expect(this.monthLabel).not.toHaveText(currentLabel!, { timeout: 10_000 });
		await this.page.waitForLoadState('networkidle');
	}

	async goToCurrentMonth() {
		await this.page.waitForLoadState('networkidle');
		await this.goToCurrentMonthLink.click();
		await expect(this.goToCurrentMonthLink).not.toBeVisible({ timeout: 10_000 });
		await this.page.waitForLoadState('networkidle');
	}

	// ---------------------------------------------------------------------------
	// Toast assertions
	// ---------------------------------------------------------------------------

	async expectSuccessToast(textPattern?: RegExp) {
		const toastLocator = textPattern
			? this.page.locator('[data-sonner-toast]', { hasText: textPattern })
			: this.toast;
		await expect(toastLocator).toBeVisible({ timeout: 10_000 });
	}
}
