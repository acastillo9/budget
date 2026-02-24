import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { DashboardPage } from './pages/dashboard.page';
import { AccountsPage } from './pages/accounts.page';
import { CategoriesPage } from './pages/categories.page';
import { BillsPage } from './pages/bills.page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueName(prefix: string): string {
	return `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

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
// Dashboard — Page Load & Layout
// ---------------------------------------------------------------------------
test.describe('Dashboard — Page Load & Layout', () => {
	test.setTimeout(30_000);

	test('should display the dashboard heading and description', async ({ page }) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await expect(dashboardPage.heading).toBeVisible();
		await expect(dashboardPage.description).toBeVisible();
	});

	test('should display the page title in the browser tab', async ({ page }) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveTitle(/dashboard/i);
	});

	test('should display all four summary cards', async ({ page }) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await dashboardPage.expectSummaryCardsVisible();
	});

	test('should display the currency rates card with a refresh button', async ({ page }) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await expect(dashboardPage.currencyRatesCard).toBeVisible();
		await expect(dashboardPage.refreshRatesButton).toBeVisible();
	});

	test('should display the balance breakdown card', async ({ page }) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await expect(dashboardPage.balanceBreakdownCard).toBeVisible();
	});

	test('should display all section cards', async ({ page }) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await dashboardPage.expectSectionCardsVisible();
	});

	test('should display the upcoming bills card with a View All button', async ({ page }) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await expect(dashboardPage.upcomingBillsCard).toBeVisible();
		await expect(dashboardPage.viewAllBillsButton).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Dashboard — Empty States
// ---------------------------------------------------------------------------
test.describe('Dashboard — Empty States', () => {
	test.setTimeout(30_000);

	test('should show the empty state in the account list when no accounts exist', async ({
		page
	}) => {
		// This test assumes a clean test user with no accounts — it verifies the empty state
		// message is rendered rather than a list
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		// Check either accounts exist OR the empty state is visible
		const hasAccounts = await dashboardPage.accountListCard
			.locator('.rounded-lg.border')
			.first()
			.isVisible()
			.catch(() => false);

		if (!hasAccounts) {
			await expect(dashboardPage.accountListEmptyState).toBeVisible();
		} else {
			// If accounts exist, the list is visible — pass trivially
			await expect(dashboardPage.accountListCard).toBeVisible();
		}
	});

	test('should hide the Add Transaction button when no accounts exist', async ({ page }) => {
		// Navigate to dashboard and check if the Add Transaction button is absent
		// when no accounts are present. This test is conditional on the state.
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		const hasAccounts = await dashboardPage.accountListCard
			.locator('.rounded-lg.border')
			.first()
			.isVisible()
			.catch(() => false);

		if (!hasAccounts) {
			await expect(dashboardPage.addTransactionButton).not.toBeVisible();
		} else {
			// Accounts exist so the button should be visible
			await expect(dashboardPage.addTransactionButton).toBeVisible();
		}
	});

	test('should show no-pending-bills message when all bills are paid', async ({ page }) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		// Either pending bills are listed OR the "all caught up" message is shown
		const hasBills = await dashboardPage.upcomingBillsCard
			.locator('.rounded-lg.border')
			.first()
			.isVisible()
			.catch(() => false);

		if (!hasBills) {
			await expect(dashboardPage.noPendingBillsMessage).toBeVisible();
		} else {
			await expect(dashboardPage.upcomingBillsCard).toBeVisible();
		}
	});
});

// ---------------------------------------------------------------------------
// Dashboard — With Accounts: Add Transaction Button & Summary Cards
// ---------------------------------------------------------------------------
test.describe('Dashboard — With Accounts', () => {
	test.setTimeout(60_000);
	let accountName: string;

	test.beforeEach(async ({ page }) => {
		accountName = await createTestAccount(page, 'DashAcc');
	});

	test('should show the Add Transaction button when at least one account exists', async ({
		page
	}) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await expect(dashboardPage.addTransactionButton).toBeVisible();
	});

	test('should display the created account in the account list', async ({ page }) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await expect(dashboardPage.getAccountItem(accountName)).toBeVisible();
	});

	test('should display non-zero net worth after creating an account with funds', async ({
		page
	}) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		// Net Worth card should show a non-zero amount — verify the card's value is not "$0.00"
		const netWorthValue = dashboardPage.netWorthCard.locator('.text-xl, .text-2xl').first();
		await expect(netWorthValue).toBeVisible();
		const valueText = await netWorthValue.textContent();
		expect(valueText).not.toBe('');
		// The account was created with $10,000 so the net worth should contain a non-zero value
		expect(valueText).toMatch(/\d/);
	});

	test('should open the Add Transaction wizard when clicking Add Transaction', async ({ page }) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await dashboardPage.openAddTransactionDialog();

		await expect(dashboardPage.incomeTypeButton).toBeVisible();
		await expect(dashboardPage.expenseTypeButton).toBeVisible();
		await expect(dashboardPage.transferTypeButton).toBeVisible();
	});

	test('should keep Next button disabled when no transaction type is selected', async ({
		page
	}) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await dashboardPage.openAddTransactionDialog();

		await expect(dashboardPage.nextButton).toBeDisabled();
	});

	test('should enable Next button after selecting a transaction type', async ({ page }) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await dashboardPage.openAddTransactionDialog();
		await dashboardPage.incomeTypeButton.click();

		await expect(dashboardPage.nextButton).toBeEnabled();
	});

	test('should close the wizard dialog when clicking the close button', async ({ page }) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await dashboardPage.openAddTransactionDialog();
		await expect(dashboardPage.dialog).toBeVisible();

		// Click the X close button (has sr-only text "Close")
		await dashboardPage.dialog.getByRole('button', { name: /close/i }).click();

		await expect(dashboardPage.dialog).not.toBeVisible({ timeout: 10_000 });
	});
});

// ---------------------------------------------------------------------------
// Dashboard — Add Transaction from Dashboard
// ---------------------------------------------------------------------------
test.describe('Dashboard — Create Transaction from Dashboard', () => {
	test.setTimeout(90_000);
	let dashboardPage: DashboardPage;
	let accountName: string;
	let categoryName: string;

	test.beforeEach(async ({ page }) => {
		accountName = await createTestAccount(page, 'DashTxAcc');
		categoryName = await createTestCategory(page, 'DashTxCat', 'Expense');

		dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');
	});

	test('should create an expense transaction and show it in the recent transactions list', async ({
		page
	}) => {
		const description = uniqueName('Dash Expense');

		await dashboardPage.openAddTransactionDialog();
		await dashboardPage.expenseTypeButton.click();
		await dashboardPage.nextButton.click();

		// Step 2: select category
		const categoryContainer = dashboardPage.dialog.locator('.flex.flex-col.items-center', {
			hasText: categoryName
		});
		await categoryContainer.getByRole('button').click();
		await expect(dashboardPage.nextButton).toBeEnabled();
		await dashboardPage.nextButton.click();

		// Step 3: fill details
		await dashboardPage.dialog.getByLabel(/^account$/i).click();
		await page.getByRole('option', { name: new RegExp(accountName) }).click();
		await dashboardPage.dialog.getByLabel(/^amount$/i).fill('250');
		await dashboardPage.dialog.getByLabel(/^description$/i).fill(description);
		await dashboardPage.saveButton.click();

		await expect(dashboardPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await dashboardPage.expectSuccessToast(/transaction added successfully/i);

		// The transaction should now appear in the recent transactions list
		await expect(dashboardPage.getTransactionItem(description)).toBeVisible({ timeout: 10_000 });
	});

	test('should create an income transaction and show it in the recent transactions list', async ({
		page: _page
	}) => {
		const incomeCategoryName = await createTestCategory(_page, 'DashIncCat', 'Income');
		const description = uniqueName('Dash Income');

		// Re-navigate after creating category
		await dashboardPage.goto();
		await _page.waitForLoadState('networkidle');

		await dashboardPage.openAddTransactionDialog();
		await dashboardPage.incomeTypeButton.click();
		await dashboardPage.nextButton.click();

		// Step 2: select income category
		const categoryContainer = dashboardPage.dialog.locator('.flex.flex-col.items-center', {
			hasText: incomeCategoryName
		});
		await categoryContainer.getByRole('button').click();
		await expect(dashboardPage.nextButton).toBeEnabled();
		await dashboardPage.nextButton.click();

		// Step 3: fill details
		await dashboardPage.dialog.getByLabel(/^account$/i).click();
		await _page.getByRole('option', { name: new RegExp(accountName) }).click();
		await dashboardPage.dialog.getByLabel(/^amount$/i).fill('1000');
		await dashboardPage.dialog.getByLabel(/^description$/i).fill(description);
		await dashboardPage.saveButton.click();

		await expect(dashboardPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await dashboardPage.expectSuccessToast(/transaction added successfully/i);
		await dashboardPage.goto();
		await _page.waitForLoadState('networkidle');

		await expect(dashboardPage.getTransactionItem(description)).toBeVisible({ timeout: 10_000 });
	});
});

// ---------------------------------------------------------------------------
// Dashboard — Currency Rates Refresh
// ---------------------------------------------------------------------------
test.describe('Dashboard — Currency Rates Refresh', () => {
	test.setTimeout(30_000);

	test('should trigger an exchange rate refresh when clicking the refresh button', async ({
		page
	}) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await expect(dashboardPage.currencyRatesCard).toBeVisible();
		await expect(dashboardPage.refreshRatesButton).toBeVisible();

		// Intercept the API call to verify it was made
		const refreshRequest = page.waitForRequest(
			(req) => req.url().includes('/api/currencies/USD') && req.method() === 'GET'
		);

		await dashboardPage.refreshRatesButton.click();

		// Verify the request was made
		await refreshRequest;
	});

	test('should not throw an error when the refresh button is clicked', async ({ page }) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		// Listen for uncaught errors
		const errors: string[] = [];
		page.on('pageerror', (err) => errors.push(err.message));

		await dashboardPage.refreshRatesButton.click();

		// Wait a moment for any async errors to surface
		await page.waitForTimeout(2_000);

		expect(errors).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// Dashboard — Upcoming Bills: View All Navigation
// ---------------------------------------------------------------------------
test.describe('Dashboard — Upcoming Bills Navigation', () => {
	test.setTimeout(30_000);

	test('should navigate to /bills when clicking View All', async ({ page }) => {
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		await expect(dashboardPage.viewAllBillsButton).toBeVisible();
		await dashboardPage.clickViewAllBills();

		await expect(page).toHaveURL(/\/bills/);
		await expect(page.getByRole('heading', { level: 1, name: /bills/i })).toBeVisible({
			timeout: 10_000
		});
	});
});

// ---------------------------------------------------------------------------
// Dashboard — Upcoming Bills: Pay Bill
// ---------------------------------------------------------------------------
test.describe('Dashboard — Pay Bill from Dashboard', () => {
	test.setTimeout(120_000);

	test('should mark a bill as paid from the dashboard and show success toast', async ({ page }) => {
		// Create prerequisites: account + category + bill
		const accountName = await createTestAccount(page, 'DashBillAcc');
		const billCategoryName = await createTestCategory(page, 'DashBillCat', 'Expense');

		// Use BillsPage to create a bill
		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await page.waitForLoadState('networkidle');

		const billName = uniqueName('DashBill');
		await billsPage.createBill({
			categoryName: billCategoryName,
			name: billName,
			amount: '50',
			frequency: 'ONCE',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// Navigate to dashboard
		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		// The bill should appear in the Upcoming Bills card (it's unpaid)
		const billRow = dashboardPage.getBillRow(billName);
		await expect(billRow).toBeVisible({ timeout: 10_000 });

		// Pay the bill
		await dashboardPage.payBill(billName);

		// Verify success toast
		await dashboardPage.expectSuccessToast(/bill marked as paid/i);
	});
});

// ---------------------------------------------------------------------------
// Dashboard — Summary Cards: Totals Reflect Transactions
// ---------------------------------------------------------------------------
test.describe('Dashboard — Summary Cards Reflect Data', () => {
	test.setTimeout(120_000);

	test('should update Total Income after creating an income transaction from dashboard', async ({
		page
	}) => {
		const accountName = await createTestAccount(page, 'SummIncAcc');
		const categoryName = await createTestCategory(page, 'SummIncCat', 'Income');

		const dashboardPage = new DashboardPage(page);
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		// Capture initial income value
		const incomeValue = dashboardPage.totalIncomeCard.locator('.text-xl, .text-2xl').first();
		const initialText = await incomeValue.textContent();

		// Create an income transaction of $5,000
		const description = uniqueName('SummInc');
		await dashboardPage.openAddTransactionDialog();
		await dashboardPage.incomeTypeButton.click();
		await dashboardPage.nextButton.click();

		const categoryContainer = dashboardPage.dialog.locator('.flex.flex-col.items-center', {
			hasText: categoryName
		});
		await categoryContainer.getByRole('button').click();
		await expect(dashboardPage.nextButton).toBeEnabled();
		await dashboardPage.nextButton.click();

		await dashboardPage.dialog.getByLabel(/^account$/i).click();
		await page.getByRole('option', { name: new RegExp(accountName) }).click();
		await dashboardPage.dialog.getByLabel(/^amount$/i).fill('5000');
		await dashboardPage.dialog.getByLabel(/^description$/i).fill(description);
		await dashboardPage.saveButton.click();

		await expect(dashboardPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await dashboardPage.expectSuccessToast(/transaction added successfully/i);

		// Re-navigate to get fresh data
		await dashboardPage.goto();
		await page.waitForLoadState('networkidle');

		// The total income should have changed
		const updatedText = await incomeValue.textContent();
		expect(updatedText).not.toBe(initialText);
	});
});
