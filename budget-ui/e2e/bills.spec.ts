import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { BillsPage, type BillFrequency } from './pages/bills.page';
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

/** Create a test expense category and wait for success. Returns the category name. */
async function createTestCategory(page: Page, prefix: string): Promise<string> {
	const name = uniqueName(prefix);
	const categoriesPage = new CategoriesPage(page);
	await categoriesPage.goto();
	await expect(categoriesPage.addCategoryButton).toBeVisible({ timeout: 15_000 });
	await categoriesPage.createCategory(name, 'Expense', 'Shopping Cart');
	await expect(categoriesPage.dialog).not.toBeVisible({ timeout: 10_000 });
	await categoriesPage.expectSuccessToast(/category added successfully/i);
	await categoriesPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
	return name;
}

// ---------------------------------------------------------------------------
// Bills — Page Load & List
// ---------------------------------------------------------------------------
test.describe('Bills — Page Load & List', () => {
	test.setTimeout(60_000);

	test('should display the bills page with heading and description', async ({ page }) => {
		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });
		await expect(billsPage.description).toBeVisible();
	});

	test('should display the Add Bill button', async ({ page }) => {
		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });
		await expect(billsPage.addBillButton).toBeVisible();
	});

	test('should display month navigation controls', async ({ page }) => {
		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		await expect(billsPage.prevMonthButton).toBeVisible();
		await expect(billsPage.nextMonthButton).toBeVisible();
		await expect(billsPage.monthLabel).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Bills — Wizard Navigation
// ---------------------------------------------------------------------------
test.describe('Bills — Wizard Navigation', () => {
	test.setTimeout(60_000);
	let billsPage: BillsPage;
	let categoryName: string;

	test.beforeEach(async ({ page }) => {
		categoryName = await createTestCategory(page, 'WizNavCat');

		billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });
	});

	test('should open the wizard dialog when clicking Add Bill', async () => {
		await billsPage.openAddDialog();
		await expect(billsPage.dialog).toBeVisible();
		// Step 1 should show category selection
		await expect(billsPage.dialog.getByText(/choose expense category/i)).toBeVisible();
	});

	test('should keep Next button disabled when no category is selected', async () => {
		await billsPage.openAddDialog();
		await expect(billsPage.nextButton).toBeDisabled();
	});

	test('should enable Next button when a category is selected', async () => {
		await billsPage.openAddDialog();
		await billsPage.selectCategory(categoryName);
		await expect(billsPage.nextButton).toBeEnabled();
	});

	test('should navigate to step 2 (Bill Details) after selecting category', async () => {
		await billsPage.openAddDialog();
		await billsPage.selectCategory(categoryName);
		await billsPage.goToNextStep();

		await expect(billsPage.dialog.getByRole('heading', { name: /bill details/i })).toBeVisible();
		await expect(billsPage.nameInput).toBeVisible();
		await expect(billsPage.amountInput).toBeVisible();
	});

	test('should navigate back from step 2 to step 1', async () => {
		await billsPage.openAddDialog();
		await billsPage.selectCategory(categoryName);
		await billsPage.goToNextStep();
		await expect(billsPage.nameInput).toBeVisible();

		await billsPage.goToPreviousStep();

		await expect(billsPage.dialog.getByText(/choose expense category/i)).toBeVisible();
	});

	test('should keep Save button disabled when form is incomplete', async () => {
		await billsPage.openAddDialog();
		await billsPage.selectCategory(categoryName);
		await billsPage.goToNextStep();

		// On step 2 without filling required fields — Save should be disabled
		await expect(billsPage.saveButton).toBeDisabled();
	});
});

// ---------------------------------------------------------------------------
// Bills — Create (One-Time)
// ---------------------------------------------------------------------------
test.describe('Bills — Create One-Time Bill', () => {
	test.setTimeout(60_000);
	let billsPage: BillsPage;
	let accountName: string;
	let categoryName: string;

	test.beforeEach(async ({ page }) => {
		accountName = await createTestAccount(page, 'BillAcc');
		categoryName = await createTestCategory(page, 'BillCat');

		billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });
	});

	test('should create a one-time bill successfully', async () => {
		const billName = uniqueName('Rent');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '1500',
			frequency: 'ONCE',
			account: accountName
		});

		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await expect(billsPage.getBillItem(billName)).toBeVisible();
	});

	test('should display the bill with correct details after creation', async () => {
		const billName = uniqueName('Internet');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '75',
			frequency: 'ONCE',
			account: accountName
		});

		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);

		const billItem = billsPage.getBillItem(billName);
		await expect(billItem).toBeVisible();
		// Verify account name and category name are displayed
		await expect(billItem).toContainText(accountName);
		await expect(billItem).toContainText(categoryName);
		// Verify frequency label
		await expect(billItem).toContainText(/once/i);
	});
});

// ---------------------------------------------------------------------------
// Bills — Create with Different Frequencies
// ---------------------------------------------------------------------------
test.describe('Bills — Create with Different Frequencies', () => {
	test.setTimeout(90_000);
	let billsPage: BillsPage;
	let accountName: string;
	let categoryName: string;

	test.beforeEach(async ({ page }) => {
		accountName = await createTestAccount(page, 'FreqAcc');
		categoryName = await createTestCategory(page, 'FreqCat');

		billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });
	});

	const frequencies: { freq: BillFrequency; label: RegExp }[] = [
		{ freq: 'DAILY', label: /daily/i },
		{ freq: 'WEEKLY', label: /weekly/i },
		{ freq: 'BIWEEKLY', label: /biweekly/i },
		{ freq: 'MONTHLY', label: /monthly/i },
		{ freq: 'YEARLY', label: /yearly/i }
	];

	for (const { freq, label } of frequencies) {
		test(`should create a ${freq.toLowerCase()} bill and show correct frequency label`, async () => {
			const billName = uniqueName(`${freq}Bill`);
			await billsPage.createBill({
				categoryName,
				name: billName,
				amount: '100',
				frequency: freq,
				account: accountName
			});

			await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
			await billsPage.expectSuccessToast(/bill added successfully/i);

			// Recurring bills may have multiple instances in current month (e.g. daily, weekly)
			const billItem = billsPage.getBillItem(billName).first();
			await expect(billItem).toBeVisible();
			await expect(billItem).toContainText(label);
		});
	}
});

// ---------------------------------------------------------------------------
// Bills — Edit (Single Instance)
// ---------------------------------------------------------------------------
test.describe('Bills — Edit Single Instance', () => {
	test.setTimeout(90_000);
	let billsPage: BillsPage;
	let billName: string;
	let accountName: string;
	let categoryName: string;

	test.beforeEach(async ({ page }) => {
		accountName = await createTestAccount(page, 'EditAcc');
		categoryName = await createTestCategory(page, 'EditCat');

		billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a monthly bill to edit
		billName = uniqueName('EditMe');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '200',
			frequency: 'MONTHLY',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
	});

	test('should open edit dialog with pre-filled data', async () => {
		await billsPage.clickEdit(billName);

		await expect(billsPage.dialog).toBeVisible();
		await expect(billsPage.saveButton).toBeVisible();
		await expect(billsPage.nameInput).toHaveValue(billName);
	});

	test('should show edit scope card with apply-to-future switch', async () => {
		await billsPage.clickEdit(billName);

		// Edit scope card should be visible
		await expect(billsPage.dialog.getByText(/edit scope/i)).toBeVisible();
		await expect(billsPage.applyToFutureSwitch).toBeVisible();
	});

	test('should have frequency disabled when editing single instance', async () => {
		await billsPage.clickEdit(billName);

		// Frequency select should be disabled when not applying to future
		await expect(billsPage.frequencyTrigger).toBeDisabled();
	});

	test('should enable frequency when toggling apply to future', async () => {
		await billsPage.clickEdit(billName);
		await billsPage.toggleApplyToFuture();

		// Frequency select should now be enabled
		await expect(billsPage.frequencyTrigger).toBeEnabled();
	});

	test('should update bill name for single instance', async () => {
		const newName = uniqueName('Updated');
		await billsPage.editBill(billName, { name: newName });

		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill edited successfully/i);
		await expect(billsPage.getBillItem(newName)).toBeVisible();
		await expect(billsPage.getBillItem(billName)).not.toBeVisible();
	});

	test('should update bill amount for single instance', async () => {
		await billsPage.editBill(billName, { amount: '350' });

		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill edited successfully/i);
		await expect(billsPage.getBillItem(billName)).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Bills — Edit (Apply to Future / Series)
// ---------------------------------------------------------------------------
test.describe('Bills — Edit Series (Apply to Future)', () => {
	test.setTimeout(90_000);
	let billsPage: BillsPage;
	let billName: string;
	let accountName: string;
	let categoryName: string;

	test.beforeEach(async ({ page }) => {
		accountName = await createTestAccount(page, 'SerEditAcc');
		categoryName = await createTestCategory(page, 'SerEditCat');

		billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a monthly bill
		billName = uniqueName('SeriesEdit');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '150',
			frequency: 'MONTHLY',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
	});

	test('should edit name for all future bills in series', async () => {
		const newName = uniqueName('SeriesUpdated');
		await billsPage.editBill(billName, {
			name: newName,
			applyToFuture: true
		});

		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill edited successfully/i);
		await expect(billsPage.getBillItem(newName)).toBeVisible();
	});

	test('should edit frequency for all future bills in series', async () => {
		await billsPage.editBill(billName, {
			frequency: 'WEEKLY',
			applyToFuture: true
		});

		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill edited successfully/i);

		// After changing to weekly, multiple instances may appear in the same month
		const billItem = billsPage.getBillItem(billName).first();
		await expect(billItem).toBeVisible();
		await expect(billItem).toContainText(/weekly/i);
	});

	test('should show alert when apply to future is toggled', async () => {
		await billsPage.clickEdit(billName);
		await billsPage.toggleApplyToFuture();

		// Alert about applying to all future bills should appear
		await expect(
			billsPage.dialog.getByText(/changes will apply to all future unpaid bills/i)
		).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Bills — Delete
// ---------------------------------------------------------------------------
test.describe('Bills — Delete', () => {
	test.setTimeout(90_000);
	let billsPage: BillsPage;
	let billName: string;

	test.beforeEach(async ({ page }) => {
		const accountName = await createTestAccount(page, 'DelAcc');
		const categoryName = await createTestCategory(page, 'DelCat');

		billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a monthly bill to delete
		billName = uniqueName('DeleteMe');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '50',
			frequency: 'MONTHLY',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
	});

	test('should show confirmation dialog when clicking delete', async () => {
		await billsPage.clickDelete(billName);

		await expect(billsPage.confirmationDialog).toBeVisible();
		await expect(billsPage.confirmationDescription).toContainText(billName);
	});

	test('should show delete scope switch in confirmation dialog', async () => {
		await billsPage.clickDelete(billName);

		await expect(billsPage.confirmationDialog.getByText(/delete scope/i)).toBeVisible();
		await expect(billsPage.deleteSeriesSwitch).toBeVisible();
	});

	test('should cancel deletion and keep the bill', async () => {
		await billsPage.clickDelete(billName);
		await billsPage.cancelDeletion();

		await expect(billsPage.confirmationDialog).not.toBeVisible();
		await expect(billsPage.getBillItem(billName)).toBeVisible();
	});

	test('should delete a single bill instance successfully', async () => {
		await billsPage.deleteBill(billName, false);

		await billsPage.expectSuccessToast(/bill deleted successfully/i);
		await expect(billsPage.getBillItem(billName)).not.toBeVisible({ timeout: 10_000 });
	});

	test('should delete bill series when toggling series switch', async () => {
		await billsPage.deleteBill(billName, true);

		await billsPage.expectSuccessToast(/bill deleted successfully/i);
		await expect(billsPage.getBillItem(billName)).not.toBeVisible({ timeout: 10_000 });
	});
});

// ---------------------------------------------------------------------------
// Bills — Pay / Unpay
// ---------------------------------------------------------------------------
test.describe('Bills — Pay & Unpay', () => {
	test.setTimeout(90_000);
	let billsPage: BillsPage;
	let billName: string;

	test.beforeEach(async ({ page }) => {
		const accountName = await createTestAccount(page, 'PayAcc');
		const categoryName = await createTestCategory(page, 'PayCat');

		billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a one-time bill
		billName = uniqueName('PayMe');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '250',
			frequency: 'ONCE',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
	});

	test('should pay a bill and show success toast', async () => {
		await billsPage.clickPayNow(billName);

		await billsPage.expectSuccessToast(/bill marked as paid successfully/i);
		// After paying, the bill should show Unpay button
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
		const billItem = billsPage.getBillItem(billName);
		await expect(billItem.getByRole('button', { name: /unpay/i })).toBeVisible({
			timeout: 10_000
		});
	});

	test('should unpay a paid bill and show success toast', async () => {
		// First pay the bill
		await billsPage.clickPayNow(billName);
		await billsPage.expectSuccessToast(/bill marked as paid successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// Then unpay it
		await billsPage.clickUnpay(billName);
		await billsPage.expectSuccessToast(/bill marked as unpaid successfully/i);

		// After unpaying, the bill should show Pay Now button again
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
		const billItem = billsPage.getBillItem(billName);
		await expect(billItem.getByRole('button', { name: /pay now/i })).toBeVisible({
			timeout: 10_000
		});
	});
});

// ---------------------------------------------------------------------------
// Bills — Month Navigation
// ---------------------------------------------------------------------------
test.describe('Bills — Month Navigation', () => {
	test.setTimeout(60_000);

	test('should navigate to previous month', async ({ page }) => {
		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		const initialMonth = await billsPage.monthLabel.textContent();
		await billsPage.goToPreviousMonth();

		const newMonth = await billsPage.monthLabel.textContent();
		expect(newMonth).not.toBe(initialMonth);
	});

	test('should navigate to next month', async ({ page }) => {
		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		const initialMonth = await billsPage.monthLabel.textContent();
		await billsPage.goToNextMonth();

		const newMonth = await billsPage.monthLabel.textContent();
		expect(newMonth).not.toBe(initialMonth);
	});

	test('should show Go to current month link when not on current month', async ({ page }) => {
		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// On current month, link should not be visible
		await expect(billsPage.goToCurrentMonthLink).not.toBeVisible();

		// Navigate away
		await billsPage.goToPreviousMonth();

		// Link should now be visible
		await expect(billsPage.goToCurrentMonthLink).toBeVisible();
	});

	test('should navigate back to current month when clicking Go to current month', async ({
		page
	}) => {
		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		const currentMonthLabel = await billsPage.monthLabel.textContent();

		await billsPage.goToPreviousMonth();
		await expect(billsPage.monthLabel).not.toHaveText(currentMonthLabel!);

		await billsPage.goToCurrentMonth();
		await expect(billsPage.monthLabel).toHaveText(currentMonthLabel!);
	});
});

// ---------------------------------------------------------------------------
// Bills — Recurring Bill Instances Across Months
// ---------------------------------------------------------------------------
test.describe('Bills — Recurring Bill Instances', () => {
	test.setTimeout(120_000);

	test('should show a monthly bill in the next month', async ({ page }) => {
		const accountName = await createTestAccount(page, 'RecurAcc');
		const categoryName = await createTestCategory(page, 'RecurCat');

		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a monthly bill
		const billName = uniqueName('MonthlyRecur');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '100',
			frequency: 'MONTHLY',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// Verify bill is visible in current month
		await expect(billsPage.getBillItem(billName)).toBeVisible();

		// Navigate to next month — bill should also appear in the upcoming section
		await billsPage.goToNextMonth();
		await expect(billsPage.getUpcomingBillItem(billName)).toBeVisible({ timeout: 15_000 });

		// Navigate to the month after that — bill should still appear in the upcoming section
		await billsPage.goToNextMonth();
		await expect(billsPage.getUpcomingBillItem(billName)).toBeVisible({ timeout: 15_000 });
	});

	test('should show a yearly bill only in the same month of the following year', async ({
		page
	}) => {
		const accountName = await createTestAccount(page, 'YearAcc');
		const categoryName = await createTestCategory(page, 'YearCat');

		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a yearly bill
		const billName = uniqueName('YearlyRecur');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '500',
			frequency: 'YEARLY',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// Verify bill is visible in current month
		await expect(billsPage.getBillItem(billName)).toBeVisible();

		// Navigate to next month — yearly bill should NOT appear in the upcoming section
		// (it may still appear as overdue from the current month)
		await billsPage.goToNextMonth();
		await expect(billsPage.getUpcomingBillItem(billName)).not.toBeVisible({ timeout: 5_000 });
	});

	test('should show a weekly bill multiple times when navigating to next month', async ({
		page
	}) => {
		const accountName = await createTestAccount(page, 'WeekAcc');
		const categoryName = await createTestCategory(page, 'WeekCat');

		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a weekly bill
		const billName = uniqueName('WeeklyRecur');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '25',
			frequency: 'WEEKLY',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// Navigate to next month — weekly bill should appear multiple times (4-5 instances)
		await billsPage.goToNextMonth();
		const items = page.locator('.rounded-lg.border.p-4', { hasText: billName });
		// A month should have at least 4 weekly instances
		await expect(items.first()).toBeVisible({ timeout: 15_000 });
		const count = await items.count();
		expect(count).toBeGreaterThanOrEqual(4);
	});

	test('editing a monthly bill series should reflect changes in next month', async ({ page }) => {
		const accountName = await createTestAccount(page, 'EditRecAcc');
		const categoryName = await createTestCategory(page, 'EditRecCat');

		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a monthly bill
		const billName = uniqueName('EditRecur');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '120',
			frequency: 'MONTHLY',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// Edit the series with a new name
		const newName = uniqueName('EditedRecur');
		await billsPage.editBill(billName, {
			name: newName,
			applyToFuture: true
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill edited successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// Navigate to next month — bill should show with the new name in the upcoming section
		await billsPage.goToNextMonth();
		await expect(billsPage.getUpcomingBillItem(newName)).toBeVisible({ timeout: 15_000 });
		await expect(billsPage.getUpcomingBillItem(billName)).not.toBeVisible();
	});

	test('deleting a monthly bill series should remove it from next month', async ({ page }) => {
		const accountName = await createTestAccount(page, 'DelRecAcc');
		const categoryName = await createTestCategory(page, 'DelRecCat');

		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a monthly bill
		const billName = uniqueName('DelRecur');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '80',
			frequency: 'MONTHLY',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// Delete the entire series
		await billsPage.deleteBill(billName, true);
		await billsPage.expectSuccessToast(/bill deleted successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// Verify not visible in current month
		await expect(billsPage.getBillItem(billName)).not.toBeVisible({ timeout: 10_000 });

		// Navigate to next month — bill should not appear there either
		await billsPage.goToNextMonth();
		await billsPage.page.waitForLoadState('networkidle');
		await expect(billsPage.getBillItem(billName)).not.toBeVisible({ timeout: 5_000 });
	});
});

// ---------------------------------------------------------------------------
// Bills — Full CRUD Workflow
// ---------------------------------------------------------------------------
test.describe('Bills — Full CRUD Workflow', () => {
	test.setTimeout(120_000);

	test('should create, pay, unpay, and delete a bill', async ({ page }) => {
		const accountName = await createTestAccount(page, 'CrudAcc');
		const categoryName = await createTestCategory(page, 'CrudCat');

		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// --- Create ---
		const billName = uniqueName('CRUD Workflow');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '300',
			frequency: 'MONTHLY',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await expect(billsPage.getBillItem(billName)).toBeVisible();
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// --- Pay ---
		await billsPage.clickPayNow(billName);
		await billsPage.expectSuccessToast(/bill marked as paid successfully/i);

		// Verify bill shows Unpay button (is in paid state)
		const billItem = billsPage.getBillItem(billName).first();
		await expect(billItem.getByRole('button', { name: /unpay/i })).toBeVisible({
			timeout: 10_000
		});

		// Dismiss lingering toast before next action
		await billsPage.heading.click();
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 15_000 });

		// --- Unpay ---
		await billsPage.clickUnpay(billName);
		await billsPage.expectSuccessToast(/bill marked as unpaid successfully/i);

		// Verify bill shows Pay Now button again
		await expect(billItem.getByRole('button', { name: /pay now/i })).toBeVisible({
			timeout: 10_000
		});

		// Dismiss lingering toast before next action
		await billsPage.heading.click();
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 15_000 });

		// --- Delete (single instance) ---
		await billsPage.deleteBill(billName, false);
		await billsPage.expectSuccessToast(/bill deleted successfully/i);
		await expect(billsPage.getBillItem(billName)).not.toBeVisible({ timeout: 10_000 });
	});

	test('should create, pay, edit, unpay, and delete a bill (full workflow with edit)', async ({
		page
	}) => {
		const accountName = await createTestAccount(page, 'CrudFullAcc');
		const categoryName = await createTestCategory(page, 'CrudFullCat');

		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// --- Create ---
		const billName = uniqueName('CRUD Full');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '300',
			frequency: 'MONTHLY',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await expect(billsPage.getBillItem(billName)).toBeVisible();
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// --- Pay ---
		await billsPage.clickPayNow(billName);
		await billsPage.expectSuccessToast(/bill marked as paid successfully/i);
		await billsPage.heading.click();
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 15_000 });

		// --- Edit (single instance) ---
		const updatedName = uniqueName('CRUD Edited');
		await billsPage.editBill(billName, { name: updatedName });
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill edited successfully/i);
		await expect(billsPage.getBillItem(updatedName)).toBeVisible();
		await billsPage.heading.click();
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 15_000 });

		// --- Unpay ---
		await billsPage.clickUnpay(updatedName);
		await billsPage.expectSuccessToast(/bill marked as unpaid successfully/i);
		await billsPage.heading.click();
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 15_000 });

		// --- Delete ---
		await billsPage.deleteBill(updatedName, false);
		await billsPage.expectSuccessToast(/bill deleted successfully/i);
		await expect(billsPage.getBillItem(updatedName)).not.toBeVisible({ timeout: 10_000 });
	});
});

// ---------------------------------------------------------------------------
// Bills — Transaction Impact (Pay / Unpay / Delete)
// ---------------------------------------------------------------------------
test.describe('Bills — Transaction Impact', () => {
	test.setTimeout(120_000);

	test('paying a bill should create a transaction on the transactions page', async ({ page }) => {
		const accountName = await createTestAccount(page, 'PayTxAcc');
		const categoryName = await createTestCategory(page, 'PayTxCat');

		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a one-time bill
		const billName = uniqueName('PayTx');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '450',
			frequency: 'ONCE',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// Pay the bill
		await billsPage.clickPayNow(billName);
		await billsPage.expectSuccessToast(/bill marked as paid successfully/i);

		// Navigate to transactions page and verify the transaction was created
		const txPage = new TransactionsPage(page);
		await txPage.goto();
		await expect(txPage.heading).toBeVisible({ timeout: 15_000 });

		const txItem = txPage.getTransactionItem(billName);
		await expect(txItem).toBeVisible({ timeout: 10_000 });
		await expect(txItem).toContainText(accountName);
		await expect(txItem).toContainText(categoryName);
	});

	test('unpaying a bill should remove the transaction from the transactions page', async ({
		page
	}) => {
		const accountName = await createTestAccount(page, 'UnpayTxAcc');
		const categoryName = await createTestCategory(page, 'UnpayTxCat');

		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create and pay a bill
		const billName = uniqueName('UnpayTx');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '320',
			frequency: 'ONCE',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		await billsPage.clickPayNow(billName);
		await billsPage.expectSuccessToast(/bill marked as paid successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// Verify transaction exists
		const txPage = new TransactionsPage(page);
		await txPage.goto();
		await expect(txPage.heading).toBeVisible({ timeout: 15_000 });
		await expect(txPage.getTransactionItem(billName)).toBeVisible({ timeout: 10_000 });

		// Go back to bills and unpay
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });
		await billsPage.clickUnpay(billName);
		await billsPage.expectSuccessToast(/bill marked as unpaid successfully/i);

		// Navigate to transactions page — the transaction should be gone
		await txPage.goto();
		await expect(txPage.heading).toBeVisible({ timeout: 15_000 });
		await expect(txPage.getTransactionItem(billName)).not.toBeVisible({ timeout: 10_000 });
	});

	test('deleting a paid bill should remove the associated transaction', async ({ page }) => {
		const accountName = await createTestAccount(page, 'DelTxAcc');
		const categoryName = await createTestCategory(page, 'DelTxCat');

		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create and pay a bill
		const billName = uniqueName('DelTx');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '180',
			frequency: 'ONCE',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		await billsPage.clickPayNow(billName);
		await billsPage.expectSuccessToast(/bill marked as paid successfully/i);

		// Verify transaction exists — navigating away dismisses the toast
		const txPage = new TransactionsPage(page);
		await txPage.goto();
		await expect(txPage.heading).toBeVisible({ timeout: 15_000 });
		await expect(txPage.getTransactionItem(billName)).toBeVisible({ timeout: 10_000 });

		// Go back to bills and delete (single instance)
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });
		await billsPage.deleteBill(billName, false);
		await billsPage.expectSuccessToast(/bill deleted successfully/i);

		// Navigate to transactions page — the transaction should be gone
		await txPage.goto();
		await expect(txPage.heading).toBeVisible({ timeout: 15_000 });
		await expect(txPage.getTransactionItem(billName)).not.toBeVisible({ timeout: 10_000 });
	});

	test('deleting a paid recurring bill instance should remove its transaction', async ({
		page
	}) => {
		const accountName = await createTestAccount(page, 'DelRecTxAcc');
		const categoryName = await createTestCategory(page, 'DelRecTxCat');

		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a monthly bill
		const billName = uniqueName('DelRecTx');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '95',
			frequency: 'MONTHLY',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// Pay the current month's instance
		await billsPage.clickPayNow(billName);
		await billsPage.expectSuccessToast(/bill marked as paid successfully/i);

		// Verify transaction exists — navigating away dismisses the toast
		const txPage = new TransactionsPage(page);
		await txPage.goto();
		await expect(txPage.heading).toBeVisible({ timeout: 15_000 });
		await expect(txPage.getTransactionItem(billName)).toBeVisible({ timeout: 10_000 });

		// Go back to bills and delete the single paid instance
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });
		await billsPage.deleteBill(billName, false);
		await billsPage.expectSuccessToast(/bill deleted successfully/i);

		// Navigate to transactions page — the transaction should be gone
		await txPage.goto();
		await expect(txPage.heading).toBeVisible({ timeout: 15_000 });
		await expect(txPage.getTransactionItem(billName)).not.toBeVisible({ timeout: 10_000 });
	});

	test('paying a recurring bill should create a transaction visible on the transactions page', async ({
		page
	}) => {
		const accountName = await createTestAccount(page, 'PayRecTxAcc');
		const categoryName = await createTestCategory(page, 'PayRecTxCat');

		const billsPage = new BillsPage(page);
		await billsPage.goto();
		await expect(billsPage.heading).toBeVisible({ timeout: 15_000 });

		// Create a monthly bill
		const billName = uniqueName('PayRecTx');
		await billsPage.createBill({
			categoryName,
			name: billName,
			amount: '95',
			frequency: 'MONTHLY',
			account: accountName
		});
		await expect(billsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await billsPage.expectSuccessToast(/bill added successfully/i);
		await billsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// Pay the current month's instance
		await billsPage.clickPayNow(billName);
		await billsPage.expectSuccessToast(/bill marked as paid successfully/i);

		// Navigate to transactions page — the transaction should exist
		const txPage = new TransactionsPage(page);
		await txPage.goto();
		await expect(txPage.heading).toBeVisible({ timeout: 15_000 });

		const txItem = txPage.getTransactionItem(billName);
		await expect(txItem).toBeVisible({ timeout: 10_000 });
		await expect(txItem).toContainText(accountName);
		await expect(txItem).toContainText(categoryName);
	});
});
