import { type Page, type Locator, expect } from '@playwright/test';

export type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export class BudgetsPage {
	readonly page: Page;

	// Page header
	readonly heading: Locator;
	readonly description: Locator;

	// Add budget dialog trigger
	readonly addBudgetButton: Locator;

	// Dialog elements
	readonly dialog: Locator;

	// Wizard navigation
	readonly nextButton: Locator;
	readonly backButton: Locator;
	readonly saveButton: Locator;

	// Step 2: Budget form fields
	readonly nameInput: Locator;
	readonly amountInput: Locator;
	readonly periodTrigger: Locator;
	readonly startDateTrigger: Locator;
	readonly endDateTrigger: Locator;

	// Confirmation dialog
	readonly confirmationDialog: Locator;
	readonly confirmationDescription: Locator;
	readonly confirmDeleteButton: Locator;
	readonly cancelDeleteButton: Locator;

	// Toast
	readonly toast: Locator;

	// Inline create category (within step 1 of budget wizard)
	readonly createCategoryTrigger: Locator;
	readonly createCategoryDialog: Locator;
	readonly inlineCategoryNameInput: Locator;
	readonly inlineCreateCategoryButton: Locator;

	// Month navigation
	readonly prevMonthButton: Locator;
	readonly nextMonthButton: Locator;
	readonly monthLabel: Locator;
	readonly goToCurrentMonthLink: Locator;

	// Empty state
	readonly emptyState: Locator;

	constructor(page: Page) {
		this.page = page;

		// Page header
		this.heading = page.getByRole('heading', { level: 1, name: /budgets/i });
		this.description = page.getByText(/view and manage your spending budgets/i);

		// Add budget dialog trigger
		this.addBudgetButton = page.getByRole('button', { name: /add budget/i });

		// Dialog
		this.dialog = page.getByRole('dialog');

		// Wizard navigation
		this.nextButton = this.dialog.getByRole('button', { name: /next/i });
		this.backButton = this.dialog.getByRole('button', { name: /back/i });
		this.saveButton = this.dialog.getByRole('button', { name: /^save$/i });

		// Step 2: Budget form fields
		this.nameInput = this.dialog.getByLabel(/name \(optional\)/i);
		this.amountInput = this.dialog.getByLabel(/^amount$/i);
		this.periodTrigger = this.dialog.getByLabel(/^period$/i);
		this.startDateTrigger = this.dialog.getByLabel(/start date/i);
		this.endDateTrigger = this.dialog.getByLabel(/end date/i);

		// Confirmation dialog (AlertDialog)
		this.confirmationDialog = page.getByRole('alertdialog');
		this.confirmationDescription = this.confirmationDialog.locator(
			'[data-alert-dialog-description]'
		);
		this.confirmDeleteButton = this.confirmationDialog.getByRole('button', { name: /delete/i });
		this.cancelDeleteButton = this.confirmationDialog.getByRole('button', { name: /cancel/i });

		// Inline create category (the dashed-border "Create New" plus button in step 1)
		this.createCategoryTrigger = this.dialog
			.locator('.flex.flex-col.items-center', { hasText: /create new/i })
			.getByRole('button');
		// The nested category creation dialog is identified by its title
		this.createCategoryDialog = page.getByRole('dialog', { name: /create new category/i });
		this.inlineCategoryNameInput = this.createCategoryDialog.getByLabel(/category name/i);
		this.inlineCreateCategoryButton = this.createCategoryDialog.getByRole('button', {
			name: /create category/i
		});

		// Month navigation
		this.prevMonthButton = page.getByRole('button', { name: /previous month/i });
		this.nextMonthButton = page.getByRole('button', { name: /next month/i });
		this.monthLabel = page.locator('span.text-2xl.font-bold.capitalize');
		this.goToCurrentMonthLink = page.getByRole('button', { name: /go to current month/i });

		// Toast
		this.toast = page.locator('[data-sonner-toast]');

		// Empty state
		this.emptyState = page.getByText(/no budgets yet/i);
	}

	async goto(month?: string) {
		const url = month ? `/budgets?month=${month}` : '/budgets';
		await this.page.goto(url);
	}

	// ---------------------------------------------------------------------------
	// Dialog interactions
	// ---------------------------------------------------------------------------

	async openAddDialog() {
		await this.page.waitForLoadState('networkidle');
		await this.addBudgetButton.click();
		await expect(this.dialog).toBeVisible({ timeout: 10_000 });
	}

	// ---------------------------------------------------------------------------
	// Step 1: Category multi-select
	// ---------------------------------------------------------------------------

	async selectCategory(categoryName: string) {
		const categoryContainer = this.dialog.locator('.flex.flex-col.items-center', {
			hasText: categoryName
		});
		await categoryContainer.getByRole('button').click();
	}

	// ---------------------------------------------------------------------------
	// Step 1: Inline category creation
	// ---------------------------------------------------------------------------

	async openCreateCategoryDialog() {
		await this.createCategoryTrigger.scrollIntoViewIfNeeded();
		await this.createCategoryTrigger.click();
		await expect(this.createCategoryDialog).toBeVisible({ timeout: 10_000 });
	}

	async fillInlineCategoryName(name: string) {
		await this.inlineCategoryNameInput.fill(name);
	}

	async selectInlineCategoryIcon(iconTitle: string) {
		await this.createCategoryDialog.getByTitle(iconTitle).click();
	}

	async submitInlineCreateCategory() {
		await expect(this.inlineCreateCategoryButton).toBeEnabled({ timeout: 10_000 });
		await this.inlineCreateCategoryButton.click();
		await expect(this.createCategoryDialog).not.toBeVisible({ timeout: 10_000 });
	}

	/**
	 * Complete flow: open create-category dialog → fill name → select icon → submit.
	 */
	async createCategoryInline(name: string, iconTitle = 'Shopping Cart') {
		await this.openCreateCategoryDialog();
		await this.fillInlineCategoryName(name);
		await this.selectInlineCategoryIcon(iconTitle);
		await this.submitInlineCreateCategory();
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

	async selectPeriod(period: BudgetPeriod) {
		await this.periodTrigger.click();
		const periodLabels: Record<BudgetPeriod, string> = {
			WEEKLY: 'Weekly',
			MONTHLY: 'Monthly',
			YEARLY: 'Yearly'
		};
		await this.page.getByRole('option', { name: periodLabels[period], exact: true }).click();
	}

	async selectStartDate() {
		// Click today in the calendar
		await this.startDateTrigger.click();
		// bits-ui sets data-today as a boolean attribute (no value)
		const today = this.page.locator('[data-today]').first();
		await today.waitFor({ state: 'visible', timeout: 10_000 });
		await today.click();
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
	async createBudget(data: {
		categoryName: string;
		name?: string;
		amount: string;
		period: BudgetPeriod;
	}) {
		await this.openAddDialog();
		await this.selectCategory(data.categoryName);
		await this.goToNextStep();
		if (data.name) {
			await this.fillName(data.name);
		}
		await this.fillAmount(data.amount);
		await this.selectPeriod(data.period);
		await this.selectStartDate();
		await this.submitSave();
	}

	// ---------------------------------------------------------------------------
	// Budget list interactions
	// ---------------------------------------------------------------------------

	/**
	 * Returns the card locator for a budget identified by its name text.
	 */
	getBudgetItem(budgetName: string): Locator {
		return this.page.locator('.rounded-lg.border.p-4', { hasText: budgetName });
	}

	/**
	 * Click the edit (pencil) icon button for the given budget.
	 */
	async clickEdit(budgetName: string) {
		await this.page.waitForLoadState('networkidle');
		const item = this.getBudgetItem(budgetName);
		await expect(item).toBeVisible({ timeout: 10_000 });
		const deleteBtn = item.locator('button.text-destructive');
		await deleteBtn.locator('xpath=preceding-sibling::button[1]').click();
		await expect(this.dialog).toBeVisible({ timeout: 10_000 });
	}

	/**
	 * Click the delete (trash) icon button for the given budget.
	 */
	async clickDelete(budgetName: string) {
		await this.page.waitForLoadState('networkidle');
		const item = this.getBudgetItem(budgetName);
		await expect(item).toBeVisible({ timeout: 10_000 });
		await item.locator('button.text-destructive').click();
		await expect(this.confirmationDialog).toBeVisible({ timeout: 10_000 });
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

	/**
	 * Complete flow: click delete -> confirm deletion.
	 */
	async deleteBudget(budgetName: string) {
		await this.clickDelete(budgetName);
		await this.confirmDeletion();
	}

	// ---------------------------------------------------------------------------
	// Edit interactions
	// ---------------------------------------------------------------------------

	/**
	 * Complete flow: click edit -> update fields -> submit.
	 */
	async editBudget(
		existingName: string,
		newData: {
			name?: string;
			amount?: string;
			period?: BudgetPeriod;
		}
	) {
		await this.clickEdit(existingName);

		if (newData.name !== undefined) {
			await this.nameInput.clear();
			await this.fillName(newData.name);
		}
		if (newData.amount !== undefined) {
			await this.amountInput.clear();
			await this.fillAmount(newData.amount);
		}
		if (newData.period) {
			await this.selectPeriod(newData.period);
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
