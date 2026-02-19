import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
	readonly page: Page;

	// Page header
	readonly heading: Locator;
	readonly description: Locator;

	// Add Transaction button (only shown when accounts exist)
	readonly addTransactionButton: Locator;

	// Summary cards (4-card grid)
	readonly netWorthCard: Locator;
	readonly totalIncomeCard: Locator;
	readonly totalExpensesCard: Locator;
	readonly cashFlowCard: Locator;

	// Currency Rates card
	readonly currencyRatesCard: Locator;
	readonly refreshRatesButton: Locator;

	// Balance Breakdown card
	readonly balanceBreakdownCard: Locator;

	// Account list card
	readonly accountListCard: Locator;
	readonly accountListEmptyState: Locator;

	// Recent Transactions card
	readonly transactionListCard: Locator;
	readonly transactionListEmptyState: Locator;

	// Upcoming Bills card
	readonly upcomingBillsCard: Locator;
	readonly viewAllBillsButton: Locator;
	readonly noPendingBillsMessage: Locator;

	// Transaction wizard dialog
	readonly dialog: Locator;
	readonly incomeTypeButton: Locator;
	readonly expenseTypeButton: Locator;
	readonly transferTypeButton: Locator;
	readonly nextButton: Locator;
	readonly saveButton: Locator;

	// Toast
	readonly toast: Locator;

	constructor(page: Page) {
		this.page = page;

		// Page header
		this.heading = page.getByRole('heading', { level: 1, name: /dashboard/i });
		this.description = page.getByText(/manage your accounts and track your spending/i);

		// Add Transaction button
		this.addTransactionButton = page.getByRole('button', { name: /add transaction/i });

		// Summary cards — identified by their card title text
		this.netWorthCard = page.locator('[class*="card"]', { hasText: /net worth/i }).first();
		this.totalIncomeCard = page.locator('[class*="card"]', { hasText: /total income/i }).first();
		this.totalExpensesCard = page
			.locator('[class*="card"]', { hasText: /total expenses/i })
			.first();
		this.cashFlowCard = page.locator('[class*="card"]', { hasText: /cash flow/i }).first();

		// Currency Rates card
		this.currencyRatesCard = page
			.locator('[class*="card"]', { hasText: /exchange rates/i })
			.first();
		this.refreshRatesButton = this.currencyRatesCard.getByRole('button');

		// Balance Breakdown card
		this.balanceBreakdownCard = page
			.locator('[class*="card"]', { hasText: /balance breakdown/i })
			.first();

		// Account list card
		this.accountListCard = page.locator('[class*="card"]', { hasText: /your accounts/i }).first();
		this.accountListEmptyState = page.getByText(/no accounts yet/i);

		// Recent Transactions card
		this.transactionListCard = page
			.locator('[class*="card"]', { hasText: /recent transactions/i })
			.first();
		this.transactionListEmptyState = page.getByText(/no transactions yet/i);

		// Upcoming Bills card
		this.upcomingBillsCard = page
			.locator('[class*="card"]', { hasText: /upcoming bills/i })
			.first();
		this.viewAllBillsButton = this.upcomingBillsCard.getByRole('button', { name: /view all/i });
		this.noPendingBillsMessage = page.getByText(/all bills are paid/i);

		// Transaction wizard dialog
		this.dialog = page.getByRole('dialog');
		this.incomeTypeButton = this.dialog.getByRole('button', { name: /^income$/i });
		this.expenseTypeButton = this.dialog.getByRole('button', { name: /^expense$/i });
		this.transferTypeButton = this.dialog.getByRole('button', { name: /^transfer$/i });
		this.nextButton = this.dialog.getByRole('button', { name: /next/i });
		this.saveButton = this.dialog.getByRole('button', { name: /^save$/i });

		// Toast
		this.toast = page.locator('[data-sonner-toast]');
	}

	async goto() {
		await this.page.goto('/');
	}

	// ---------------------------------------------------------------------------
	// Assertions
	// ---------------------------------------------------------------------------

	/** Assert that all 4 summary cards are visible. */
	async expectSummaryCardsVisible() {
		await expect(this.netWorthCard).toBeVisible();
		await expect(this.totalIncomeCard).toBeVisible();
		await expect(this.totalExpensesCard).toBeVisible();
		await expect(this.cashFlowCard).toBeVisible();
	}

	/** Assert that the three main section cards are visible. */
	async expectSectionCardsVisible() {
		await expect(this.currencyRatesCard).toBeVisible();
		await expect(this.balanceBreakdownCard).toBeVisible();
		await expect(this.accountListCard).toBeVisible();
		await expect(this.transactionListCard).toBeVisible();
		await expect(this.upcomingBillsCard).toBeVisible();
	}

	// ---------------------------------------------------------------------------
	// Interactions
	// ---------------------------------------------------------------------------

	/** Open the Add Transaction wizard dialog. */
	async openAddTransactionDialog() {
		await this.page.waitForLoadState('networkidle');
		await this.addTransactionButton.click();
		await expect(this.dialog).toBeVisible({ timeout: 10_000 });
	}

	/** Click the "View All" button in the Upcoming Bills card. */
	async clickViewAllBills() {
		await this.viewAllBillsButton.click();
	}

	/** Click the pay button for a specific bill by bill name. */
	getBillRow(billName: string): Locator {
		return this.upcomingBillsCard.locator('.rounded-lg.border', { hasText: billName });
	}

	async payBill(billName: string) {
		const billRow = this.getBillRow(billName);
		await expect(billRow).toBeVisible({ timeout: 10_000 });
		await billRow.getByRole('button').last().click();
	}

	/** Get a specific account item in the account list by account name. */
	getAccountItem(accountName: string): Locator {
		return this.accountListCard.locator('.rounded-lg.border', { hasText: accountName });
	}

	/** Get a specific transaction item in the recent transactions list by description. */
	getTransactionItem(description: string): Locator {
		return this.transactionListCard.locator('.space-y-4 > div', { hasText: description });
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
