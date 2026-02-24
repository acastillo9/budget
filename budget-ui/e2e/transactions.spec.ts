import { test, expect, type Page } from '@playwright/test';
import { TransactionsPage } from './pages/transactions.page';
import { AccountsPage } from './pages/accounts.page';
import { CategoriesPage } from './pages/categories.page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unique name to avoid collisions between parallel tests. */
function uniqueName(prefix: string): string {
	return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Create a test account and wait for success. Returns the account name. */
async function createTestAccount(page: Page, prefix: string): Promise<string> {
	const name = uniqueName(prefix);
	const accountsPage = new AccountsPage(page);
	await accountsPage.goto();
	await expect(accountsPage.addAccountButton).toBeVisible({ timeout: 15_000 });
	await accountsPage.createAccount(name, '10000', 'Checking');
	await expect(accountsPage.dialog).not.toBeVisible({ timeout: 10_000 });
	await accountsPage.expectSuccessToast(/account added successfully/i);
	await accountsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
	return name;
}

/** Create a test category and wait for success. Returns the category name. */
async function createTestCategory(page: Page, prefix: string, type: string): Promise<string> {
	const name = uniqueName(prefix);
	const categoriesPage = new CategoriesPage(page);
	await categoriesPage.goto();
	await expect(categoriesPage.addCategoryButton).toBeVisible({ timeout: 15_000 });
	await categoriesPage.createCategory(name, type, 'Shopping Cart');
	await expect(categoriesPage.dialog).not.toBeVisible({ timeout: 10_000 });
	await categoriesPage.expectSuccessToast(/category added successfully/i);
	await categoriesPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
	return name;
}

// ---------------------------------------------------------------------------
// Transactions — Page Load & List
// ---------------------------------------------------------------------------
test.describe('Transactions — Page Load & List', () => {
	test.setTimeout(60_000);
	test('should display the transactions page with heading and description', async ({ page }) => {
		const transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });

		await expect(transactionsPage.heading).toBeVisible();
		await expect(transactionsPage.description).toBeVisible();
	});

	test('should display the Add Transaction button when accounts exist', async ({ page }) => {
		// Ensure at least one account exists
		await createTestAccount(page, 'PageLoadAcc');

		const transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });

		await expect(transactionsPage.addTransactionButton).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Transactions — Wizard Navigation
// ---------------------------------------------------------------------------
test.describe('Transactions — Wizard Navigation', () => {
	test.setTimeout(60_000);
	let transactionsPage: TransactionsPage;
	let accountName: string;
	let categoryName: string;

	test.beforeEach(async ({ page }) => {
		// Create prerequisites
		accountName = await createTestAccount(page, 'WizNav');
		categoryName = await createTestCategory(page, 'WizNavCat', 'Expense');

		// Navigate to transactions
		transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });
	});

	test('should open the wizard dialog when clicking Add Transaction', async () => {
		await transactionsPage.openAddDialog();

		await expect(transactionsPage.dialog).toBeVisible();
		await expect(transactionsPage.incomeTypeButton).toBeVisible();
		await expect(transactionsPage.expenseTypeButton).toBeVisible();
		await expect(transactionsPage.transferTypeButton).toBeVisible();
	});

	test('should keep Next button disabled when no type is selected', async () => {
		await transactionsPage.openAddDialog();

		await expect(transactionsPage.nextButton).toBeDisabled();
	});

	test('should enable Next button when a type is selected', async () => {
		await transactionsPage.openAddDialog();
		await transactionsPage.selectTransactionType('INCOME');

		await expect(transactionsPage.nextButton).toBeEnabled();
	});

	test('should navigate to step 2 (Choose Category) for income type', async () => {
		await transactionsPage.openAddDialog();
		await transactionsPage.selectTransactionType('INCOME');
		await transactionsPage.goToNextStep();

		// Step 2 should show "Choose Income category" heading
		await expect(transactionsPage.dialog.getByText(/choose income category/i)).toBeVisible();
	});

	test('should navigate to step 2 (Choose Category) for expense type', async () => {
		await transactionsPage.openAddDialog();
		await transactionsPage.selectTransactionType('EXPENSE');
		await transactionsPage.goToNextStep();

		await expect(transactionsPage.dialog.getByText(/choose expense category/i)).toBeVisible();
	});

	test('should skip to step 3 (Transaction Details) for transfer type', async () => {
		await transactionsPage.openAddDialog();
		await transactionsPage.selectTransactionType('TRANSFER');
		await transactionsPage.goToNextStep();

		// Step 3 should show transfer form fields
		await expect(
			transactionsPage.dialog.getByRole('heading', { name: /transaction details/i })
		).toBeVisible();
		await expect(transactionsPage.fromAccountTrigger).toBeVisible();
		await expect(transactionsPage.toAccountTrigger).toBeVisible();
	});

	test('should navigate back from step 2 to step 1', async () => {
		await transactionsPage.openAddDialog();
		await transactionsPage.selectTransactionType('EXPENSE');
		await transactionsPage.goToNextStep();
		await expect(transactionsPage.dialog.getByText(/choose expense category/i)).toBeVisible();

		await transactionsPage.goToPreviousStep();

		// Back at step 1 — type buttons should be visible
		await expect(transactionsPage.incomeTypeButton).toBeVisible();
	});

	test('should navigate back from step 3 to step 1 for transfer type', async () => {
		await transactionsPage.openAddDialog();
		await transactionsPage.selectTransactionType('TRANSFER');
		await transactionsPage.goToNextStep();
		await expect(transactionsPage.fromAccountTrigger).toBeVisible();

		await transactionsPage.goToPreviousStep();

		// Back at step 1 — type buttons should be visible
		await expect(transactionsPage.incomeTypeButton).toBeVisible();
	});

	test('should keep Next button disabled on step 2 when no category is selected', async () => {
		await transactionsPage.openAddDialog();
		await transactionsPage.selectTransactionType('EXPENSE');
		await transactionsPage.goToNextStep();

		await expect(transactionsPage.nextButton).toBeDisabled();
	});

	test('should enable Next button on step 2 when a category is selected', async () => {
		await transactionsPage.openAddDialog();
		await transactionsPage.selectTransactionType('EXPENSE');
		await transactionsPage.goToNextStep();
		await transactionsPage.selectCategory(categoryName);

		await expect(transactionsPage.nextButton).toBeEnabled();
	});

	test('should filter categories when typing in the search field', async () => {
		await transactionsPage.openAddDialog();
		await transactionsPage.selectTransactionType('EXPENSE');
		await transactionsPage.goToNextStep();

		// Verify the search input is visible
		await expect(transactionsPage.categorySearchInput).toBeVisible();

		// Verify the category appears before searching
		const categoryContainer = transactionsPage.dialog.locator('.flex.flex-col.items-center', {
			hasText: categoryName
		});
		await expect(categoryContainer).toBeVisible();

		// Search with the category name — it should still be visible
		await transactionsPage.searchCategory(categoryName);
		await expect(categoryContainer).toBeVisible();

		// Search with a non-matching term — the category should disappear
		await transactionsPage.searchCategory('zzz_no_match_zzz');
		await expect(categoryContainer).not.toBeVisible();

		// Clear search — the category should reappear
		await transactionsPage.searchCategory('');
		await expect(categoryContainer).toBeVisible();
	});

	test('should select a category found via search and proceed to next step', async () => {
		await transactionsPage.openAddDialog();
		await transactionsPage.selectTransactionType('EXPENSE');
		await transactionsPage.goToNextStep();

		// Search for the category
		await transactionsPage.searchCategory(categoryName);
		await transactionsPage.selectCategory(categoryName);

		// Should be able to proceed to step 3
		await expect(transactionsPage.nextButton).toBeEnabled();
		await transactionsPage.goToNextStep();
		await expect(
			transactionsPage.dialog.getByRole('heading', { name: /transaction details/i })
		).toBeVisible();
	});

	test('should create a category from step 2 and use it to complete a transaction', async ({
		page
	}) => {
		const newCategoryName = uniqueName('WizCat');
		const description = uniqueName('WizCatTx');

		await transactionsPage.openAddDialog();
		await transactionsPage.selectTransactionType('EXPENSE');
		await transactionsPage.goToNextStep();

		// Create a new category from within the wizard
		await transactionsPage.createCategoryInWizard(newCategoryName, 'Shopping Cart');

		// The newly created category should appear in the grid and be selectable
		const newCategoryContainer = transactionsPage.dialog.locator('.flex.flex-col.items-center', {
			hasText: newCategoryName
		});
		await expect(newCategoryContainer).toBeVisible({ timeout: 10_000 });
		await transactionsPage.selectCategory(newCategoryName);
		await expect(transactionsPage.nextButton).toBeEnabled();

		// Complete the transaction using the new category
		await transactionsPage.goToNextStep();
		await transactionsPage.selectAccount(accountName);
		await transactionsPage.fillAmount('75');
		await transactionsPage.fillDescription(description);
		await transactionsPage.submitSave();

		await expect(transactionsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await transactionsPage.expectSuccessToast(/transaction added successfully/i);
		await expect(transactionsPage.getTransactionItem(description)).toBeVisible();

		// Verify account balance: $10,000 - $75 = $9,925
		const accountsPage = new AccountsPage(page);
		await accountsPage.goto();
		await expect(accountsPage.heading).toBeVisible({ timeout: 15_000 });
		await accountsPage.expectAccountBalance(accountName, /\$9,925/);
	});
});

// ---------------------------------------------------------------------------
// Transactions — Create Income
// ---------------------------------------------------------------------------
test.describe('Transactions — Create Income', () => {
	test.setTimeout(60_000);
	let transactionsPage: TransactionsPage;
	let accountName: string;
	let categoryName: string;

	test.beforeEach(async ({ page }) => {
		accountName = await createTestAccount(page, 'IncAcc');
		categoryName = await createTestCategory(page, 'IncCat', 'Income');

		transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });
	});

	test('should create an income transaction successfully and increase account balance', async ({
		page
	}) => {
		const description = uniqueName('Salary');
		await transactionsPage.createIncomeTransaction({
			categoryName,
			account: accountName,
			amount: '5000',
			description
		});

		await expect(transactionsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await transactionsPage.expectSuccessToast(/transaction added successfully/i);
		await expect(transactionsPage.getTransactionItem(description)).toBeVisible();

		// Verify account balance increased: $10,000 + $5,000 = $15,000
		const accountsPage = new AccountsPage(page);
		await accountsPage.goto();
		await expect(accountsPage.heading).toBeVisible({ timeout: 15_000 });
		await accountsPage.expectAccountBalance(accountName, /\$15,000/);
	});

	test('should create an income transaction with notes', async () => {
		const description = uniqueName('Freelance');
		await transactionsPage.createIncomeTransaction({
			categoryName,
			account: accountName,
			amount: '1500',
			description,
			notes: 'Project milestone payment'
		});

		await expect(transactionsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await transactionsPage.expectSuccessToast(/transaction added successfully/i);
		await expect(transactionsPage.getTransactionItem(description)).toBeVisible();
	});

	test('should keep Save button disabled when form is incomplete', async () => {
		await transactionsPage.openAddDialog();
		await transactionsPage.selectTransactionType('INCOME');
		await transactionsPage.goToNextStep();
		await transactionsPage.selectCategory(categoryName);
		await transactionsPage.goToNextStep();

		// On step 3 without filling required fields — Save should be disabled
		await expect(transactionsPage.saveButton).toBeDisabled();
	});
});

// ---------------------------------------------------------------------------
// Transactions — Create Expense
// ---------------------------------------------------------------------------
test.describe('Transactions — Create Expense', () => {
	test.setTimeout(60_000);
	let transactionsPage: TransactionsPage;
	let accountName: string;
	let categoryName: string;

	test.beforeEach(async ({ page }) => {
		accountName = await createTestAccount(page, 'ExpAcc');
		categoryName = await createTestCategory(page, 'ExpCat', 'Expense');

		transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });
	});

	test('should create an expense transaction successfully and decrease account balance', async ({
		page
	}) => {
		const description = uniqueName('Groceries');
		await transactionsPage.createExpenseTransaction({
			categoryName,
			account: accountName,
			amount: '150',
			description
		});

		await expect(transactionsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await transactionsPage.expectSuccessToast(/transaction added successfully/i);
		await transactionsPage.gotoAndWaitForTransaction(description);

		// Verify account balance decreased: $10,000 - $150 = $9,850
		const accountsPage = new AccountsPage(page);
		await accountsPage.goto();
		await expect(accountsPage.heading).toBeVisible({ timeout: 15_000 });
		await accountsPage.expectAccountBalance(accountName, /\$9,850/);
	});
});

// ---------------------------------------------------------------------------
// Transactions — Create Transfer
// ---------------------------------------------------------------------------
test.describe('Transactions — Create Transfer', () => {
	test.setTimeout(60_000);
	let transactionsPage: TransactionsPage;
	let fromAccountName: string;
	let toAccountName: string;

	test.beforeEach(async ({ page }) => {
		fromAccountName = await createTestAccount(page, 'TransFrom');
		toAccountName = await createTestAccount(page, 'TransTo');

		transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });
	});

	test('should create a transfer successfully and update both account balances', async ({
		page
	}) => {
		const description = uniqueName('Transfer');
		await transactionsPage.createTransfer({
			fromAccount: fromAccountName,
			toAccount: toAccountName,
			amount: '500',
			description
		});

		await expect(transactionsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await transactionsPage.expectSuccessToast(/transaction added successfully/i);

		// Verify balances: from $10,000 - $500 = $9,500 and to $10,000 + $500 = $10,500
		const accountsPage = new AccountsPage(page);
		await accountsPage.goto();
		await expect(accountsPage.heading).toBeVisible({ timeout: 15_000 });
		await accountsPage.expectAccountBalance(fromAccountName, /\$9,500/);
		await accountsPage.expectAccountBalance(toAccountName, /\$10,500/);
	});
});

// ---------------------------------------------------------------------------
// Transactions — Edit
// ---------------------------------------------------------------------------
test.describe('Transactions — Edit', () => {
	test.setTimeout(90_000);
	let transactionsPage: TransactionsPage;
	let transactionDescription: string;
	let accountName: string;

	test.beforeEach(async ({ page }) => {
		accountName = await createTestAccount(page, 'EditAcc');
		const categoryName = await createTestCategory(page, 'EditCat', 'Expense');

		transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a transaction to edit
		transactionDescription = uniqueName('EditMe');
		await transactionsPage.createExpenseTransaction({
			categoryName,
			account: accountName,
			amount: '100',
			description: transactionDescription
		});
		await expect(transactionsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await transactionsPage.expectSuccessToast(/transaction added successfully/i);
		await transactionsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
		await transactionsPage.gotoAndWaitForTransaction(transactionDescription);
	});

	test('should open edit dialog with pre-filled data', async () => {
		await transactionsPage.clickEdit(transactionDescription);

		await expect(transactionsPage.dialog).toBeVisible();
		await expect(transactionsPage.saveButton).toBeVisible();
		await expect(transactionsPage.descriptionInput).toHaveValue(transactionDescription);
	});

	test('should update a transaction description and amount, reflecting balance change', async ({
		page
	}) => {
		const newDescription = uniqueName('Updated');
		// Original expense was $100, update to $300
		await transactionsPage.editTransaction(transactionDescription, {
			description: newDescription,
			amount: '300'
		});

		await expect(transactionsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await transactionsPage.expectSuccessToast(/transaction edited successfully/i);
		await expect(transactionsPage.getTransactionItem(newDescription)).toBeVisible();
		await expect(transactionsPage.getTransactionItem(transactionDescription)).not.toBeVisible();

		// Verify account balance reflects updated expense: $10,000 - $300 = $9,700
		const accountsPage = new AccountsPage(page);
		await accountsPage.goto();
		await expect(accountsPage.heading).toBeVisible({ timeout: 15_000 });
		await accountsPage.expectAccountBalance(accountName, /\$9,700/);
	});
});

// ---------------------------------------------------------------------------
// Transactions — Delete
// ---------------------------------------------------------------------------
test.describe('Transactions — Delete', () => {
	test.setTimeout(90_000);
	let transactionsPage: TransactionsPage;
	let transactionDescription: string;
	let accountName: string;

	test.beforeEach(async ({ page }) => {
		accountName = await createTestAccount(page, 'DelAcc');
		const categoryName = await createTestCategory(page, 'DelCat', 'Expense');

		transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a transaction to delete
		transactionDescription = uniqueName('DeleteMe');
		await transactionsPage.createExpenseTransaction({
			categoryName,
			account: accountName,
			amount: '50',
			description: transactionDescription
		});
		await expect(transactionsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await transactionsPage.expectSuccessToast(/transaction added successfully/i);
		await transactionsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
		await transactionsPage.gotoAndWaitForTransaction(transactionDescription);
	});

	test('should show confirmation dialog when clicking delete', async () => {
		await transactionsPage.clickDelete(transactionDescription);

		await expect(transactionsPage.confirmationDialog).toBeVisible();
		await expect(transactionsPage.confirmationDescription).toContainText(transactionDescription);
	});

	test('should cancel deletion and keep the transaction', async () => {
		await transactionsPage.clickDelete(transactionDescription);
		await transactionsPage.cancelDeletion();

		await expect(transactionsPage.confirmationDialog).not.toBeVisible();
		await expect(transactionsPage.getTransactionItem(transactionDescription)).toBeVisible();
	});

	test('should delete a transaction successfully and restore account balance', async ({ page }) => {
		await transactionsPage.deleteTransaction(transactionDescription);

		await transactionsPage.expectSuccessToast(/transaction deleted successfully/i);
		await expect(transactionsPage.getTransactionItem(transactionDescription)).not.toBeVisible({
			timeout: 10_000
		});

		// Verify account balance restored: $10,000 - $50 (created) + $50 (deleted) = $10,000
		const accountsPage = new AccountsPage(page);
		await accountsPage.goto();
		await expect(accountsPage.heading).toBeVisible({ timeout: 15_000 });
		await accountsPage.expectAccountBalance(accountName, /\$10,000/);
	});
});

// ---------------------------------------------------------------------------
// Transactions — Full CRUD Workflow
// ---------------------------------------------------------------------------
test.describe('Transactions — Full CRUD Workflow', () => {
	test.setTimeout(180_000);
	test('should create, edit, and delete a transaction with correct balance at each step', async ({
		page
	}) => {
		const accountName = await createTestAccount(page, 'CrudAcc');
		const categoryName = await createTestCategory(page, 'CrudCat', 'Expense');
		const accountsPage = new AccountsPage(page);

		const transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });

		// --- Create expense of $200 ---
		const originalDescription = uniqueName('CRUD Workflow');
		await transactionsPage.createExpenseTransaction({
			categoryName,
			account: accountName,
			amount: '200',
			description: originalDescription
		});
		await expect(transactionsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await transactionsPage.expectSuccessToast(/transaction added successfully/i);
		await transactionsPage.gotoAndWaitForTransaction(originalDescription);

		// Verify balance after create: $10,000 - $200 = $9,800
		await accountsPage.goto();
		await expect(accountsPage.heading).toBeVisible({ timeout: 15_000 });
		await accountsPage.expectAccountBalance(accountName, /\$9,800/);

		// Go back to transactions for edit
		await transactionsPage.gotoAndWaitForTransaction(originalDescription);

		// --- Edit: change amount to $500 ---
		const updatedDescription = uniqueName('CRUD Edited');
		await transactionsPage.editTransaction(originalDescription, {
			description: updatedDescription,
			amount: '500'
		});
		await expect(transactionsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await transactionsPage.expectSuccessToast(/transaction edited successfully/i);
		await expect(transactionsPage.getTransactionItem(updatedDescription)).toBeVisible();
		await expect(transactionsPage.getTransactionItem(originalDescription)).not.toBeVisible();

		// Verify balance after edit: $10,000 - $500 = $9,500
		await accountsPage.goto();
		await expect(accountsPage.heading).toBeVisible({ timeout: 15_000 });
		await accountsPage.expectAccountBalance(accountName, /\$9,500/);

		// Go back to transactions for delete
		await transactionsPage.gotoAndWaitForTransaction(updatedDescription);

		// --- Delete ---
		await transactionsPage.deleteTransaction(updatedDescription);
		await transactionsPage.expectSuccessToast(/transaction deleted successfully/i);
		await expect(transactionsPage.getTransactionItem(updatedDescription)).not.toBeVisible({
			timeout: 10_000
		});

		// Verify balance after delete: back to $10,000
		await accountsPage.goto();
		await expect(accountsPage.heading).toBeVisible({ timeout: 15_000 });
		await accountsPage.expectAccountBalance(accountName, /\$10,000/);
	});
});

// ---------------------------------------------------------------------------
// Transactions — Filters
// ---------------------------------------------------------------------------
test.describe('Transactions — Filters', () => {
	test.setTimeout(120_000);

	test('should display the filter bar with date pickers and category select', async ({ page }) => {
		const transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });

		// Filter bar elements should be visible
		await expect(transactionsPage.getFilterDateFromTrigger()).toBeVisible();
		await expect(transactionsPage.getFilterDateToTrigger()).toBeVisible();
		await expect(transactionsPage.getFilterCategoryTrigger()).toBeVisible();

		// Clear filters button should NOT be visible when no filters are active
		await expect(transactionsPage.clearFiltersButton).not.toBeVisible();
	});

	test('should filter by category and update URL', async ({ page }) => {
		const accountName = await createTestAccount(page, 'FilterCatAcc');
		const categoryName = await createTestCategory(page, 'FilterCat', 'Expense');

		const transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a transaction with the known category
		const description = uniqueName('FilterCatTx');
		await transactionsPage.createExpenseTransaction({
			categoryName,
			account: accountName,
			amount: '100',
			description
		});
		await expect(transactionsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await transactionsPage.expectSuccessToast(/transaction added successfully/i);
		await transactionsPage.gotoAndWaitForTransaction(description);

		// Select the category filter
		await transactionsPage.selectFilterCategory(categoryName);

		// Wait for navigation — URL should contain categoryId
		await page.waitForURL(/categoryId=/);
		await expect(transactionsPage.getTransactionItem(description)).toBeVisible({
			timeout: 10_000
		});

		// Clear filters button should now be visible
		await expect(transactionsPage.clearFiltersButton).toBeVisible();
	});

	test('should clear all filters when clicking Clear Filters', async ({ page }) => {
		const accountName = await createTestAccount(page, 'ClearFilterAcc');
		const categoryName = await createTestCategory(page, 'ClearFilterCat', 'Expense');

		const transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a transaction
		const description = uniqueName('ClearFilterTx');
		await transactionsPage.createExpenseTransaction({
			categoryName,
			account: accountName,
			amount: '50',
			description
		});
		await expect(transactionsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await transactionsPage.expectSuccessToast(/transaction added successfully/i);
		await transactionsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// Apply a category filter
		await transactionsPage.selectFilterCategory(categoryName);
		await page.waitForURL(/categoryId=/);
		await expect(transactionsPage.clearFiltersButton).toBeVisible();

		// Click Clear Filters
		await transactionsPage.clearFiltersButton.click();

		// URL should no longer contain filter params
		await page.waitForURL((url) => !url.search.includes('categoryId'));
		await expect(transactionsPage.clearFiltersButton).not.toBeVisible();
	});

	test('should preserve filters across pagination', async ({ page }) => {
		const accountName = await createTestAccount(page, 'PagFilterAcc');
		const categoryName = await createTestCategory(page, 'PagFilterCat', 'Expense');

		const transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create enough transactions to paginate (11 = more than default limit of 10)
		for (let i = 0; i < 11; i++) {
			const desc = uniqueName(`PagFilter${i}`);
			await transactionsPage.createExpenseTransaction({
				categoryName,
				account: accountName,
				amount: '10',
				description: desc
			});
			await expect(transactionsPage.dialog).not.toBeVisible({ timeout: 10_000 });
			await transactionsPage.expectSuccessToast(/transaction added successfully/i);
			await transactionsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
		}

		// Apply category filter
		await transactionsPage.selectFilterCategory(categoryName);
		await page.waitForURL(/categoryId=/);

		// Click next page if pagination is present
		const nextButton = page.getByRole('button', { name: /next/i });
		if (await nextButton.isVisible()) {
			await nextButton.click();
			// URL should still contain categoryId after pagination
			await expect(page).toHaveURL(/categoryId=/);
			await expect(page).toHaveURL(/offset=/);
		}
	});

	test('should rehydrate filters from URL on page refresh', async ({ page }) => {
		const transactionsPage = new TransactionsPage(page);

		// Navigate directly with filter params
		await transactionsPage.gotoWithFilters({ dateFrom: '2025-01-01', dateTo: '2025-12-31' });
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });

		// The date triggers should show the selected dates (not "Pick a date")
		const dateFromTrigger = transactionsPage.getFilterDateFromTrigger();
		await expect(dateFromTrigger).not.toContainText(/pick a date/i);

		const dateToTrigger = transactionsPage.getFilterDateToTrigger();
		await expect(dateToTrigger).not.toContainText(/pick a date/i);

		// Clear filters button should be visible since filters are active
		await expect(transactionsPage.clearFiltersButton).toBeVisible();
	});
});
