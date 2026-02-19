import { test, expect } from '@playwright/test';
import { AccountsPage } from './pages/accounts.page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unique account name to avoid collisions between parallel tests. */
function uniqueName(prefix: string): string {
	return `${prefix} ${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Accounts — Page Load & List
// ---------------------------------------------------------------------------
test.describe('Accounts — Page Load & List', () => {
	let accountsPage: AccountsPage;

	test.beforeEach(async ({ page }) => {
		accountsPage = new AccountsPage(page);
		await accountsPage.goto();
		await page.waitForLoadState('networkidle');
	});

	test('should display the accounts page with heading and description', async () => {
		await expect(accountsPage.heading).toBeVisible();
		await expect(accountsPage.description).toBeVisible();
	});

	test('should display the Add Account button', async () => {
		await expect(accountsPage.addAccountButton).toBeVisible();
	});

	test('should open the Add Account dialog when clicking the button', async () => {
		await accountsPage.openAddDialog();
		await expect(accountsPage.nameInput).toBeVisible();
		await expect(accountsPage.balanceInput).toBeVisible();
		await expect(accountsPage.createAccountButton).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Accounts — Create
// ---------------------------------------------------------------------------
test.describe('Accounts — Create', () => {
	let accountsPage: AccountsPage;

	test.beforeEach(async ({ page }) => {
		accountsPage = new AccountsPage(page);
		await accountsPage.goto();
		await page.waitForLoadState('networkidle');
	});

	test('should create a new checking account successfully', async () => {
		const name = uniqueName('Checking');
		await accountsPage.createAccount(name, '1000', 'Checking');

		// Dialog should close and success toast should appear
		await expect(accountsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await accountsPage.expectSuccessToast(/account added successfully/i);

		// The new account should appear in the list
		await expect(accountsPage.getAccountCard(name)).toBeVisible();
	});

	test('should create a savings account with zero balance', async () => {
		const name = uniqueName('Savings');
		await accountsPage.createAccount(name, '0', 'Savings');

		await expect(accountsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await accountsPage.expectSuccessToast(/account added successfully/i);
		await expect(accountsPage.getAccountCard(name)).toBeVisible();
	});

	test('should keep Create Account button disabled when form is empty', async () => {
		await accountsPage.openAddDialog();
		await expect(accountsPage.createAccountButton).toBeDisabled();
	});

	test('should keep Create Account button disabled when only name is filled', async () => {
		await accountsPage.openAddDialog();
		await accountsPage.fillName('Test Account');
		await expect(accountsPage.createAccountButton).toBeDisabled();
	});

	test('should show validation error for empty name', async () => {
		await accountsPage.openAddDialog();
		// Fill and clear name to trigger validation
		await accountsPage.fillName('a');
		await accountsPage.fillName('');
		await accountsPage.fillBalance('100');
		// The create button should be disabled due to validation
		await expect(accountsPage.createAccountButton).toBeDisabled();
	});
});

// ---------------------------------------------------------------------------
// Accounts — Edit
// ---------------------------------------------------------------------------
test.describe('Accounts — Edit', () => {
	let accountsPage: AccountsPage;
	let accountName: string;

	test.beforeEach(async ({ page }) => {
		accountsPage = new AccountsPage(page);
		await accountsPage.goto();
		await page.waitForLoadState('networkidle');

		// Create an account to edit
		accountName = uniqueName('EditMe');
		await accountsPage.createAccount(accountName, '500', 'Checking');
		await expect(accountsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await accountsPage.expectSuccessToast(/account added successfully/i);
		// Wait for toast to disappear to avoid interference
		await accountsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
	});

	test('should open edit dialog with pre-filled data', async () => {
		await accountsPage.clickEdit(accountName);

		// The dialog should show "Edit Account" title and "Save" button
		await expect(accountsPage.dialog).toBeVisible();
		await expect(accountsPage.saveButton).toBeVisible();

		// Name should be pre-filled
		await expect(accountsPage.nameInput).toHaveValue(accountName);
		// Balance should be pre-filled
		await expect(accountsPage.balanceInput).toHaveValue('500');
	});

	test('should update an account name successfully', async () => {
		const newName = uniqueName('Updated');
		await accountsPage.editAccount(accountName, { name: newName });

		await expect(accountsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await accountsPage.expectSuccessToast(/account edited successfully/i);

		// The updated name should appear in the list
		await expect(accountsPage.getAccountCard(newName)).toBeVisible();
		// The old name should be gone
		await expect(accountsPage.getAccountCard(accountName)).not.toBeVisible();
	});

	test('should update an account balance successfully', async () => {
		await accountsPage.editAccount(accountName, { balance: '2500' });

		await expect(accountsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await accountsPage.expectSuccessToast(/account edited successfully/i);

		// The account card should still be visible with the same name
		await expect(accountsPage.getAccountCard(accountName)).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Accounts — Delete
// ---------------------------------------------------------------------------
test.describe('Accounts — Delete', () => {
	let accountsPage: AccountsPage;
	let accountName: string;

	test.beforeEach(async ({ page }) => {
		accountsPage = new AccountsPage(page);
		await accountsPage.goto();
		await page.waitForLoadState('networkidle');

		// Create an account to delete
		accountName = uniqueName('DeleteMe');
		await accountsPage.createAccount(accountName, '100', 'Cash');
		await expect(accountsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await accountsPage.expectSuccessToast(/account added successfully/i);
		await accountsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
	});

	test('should show confirmation dialog when clicking delete', async () => {
		await accountsPage.clickDelete(accountName);

		await expect(accountsPage.confirmationDialog).toBeVisible();
		await expect(accountsPage.confirmationDescription).toContainText(accountName);
	});

	test('should cancel deletion and keep the account', async () => {
		await accountsPage.clickDelete(accountName);
		await accountsPage.cancelDeletion();

		await expect(accountsPage.confirmationDialog).not.toBeVisible();
		// Account should still be in the list
		await expect(accountsPage.getAccountCard(accountName)).toBeVisible();
	});

	test('should delete an account successfully', async () => {
		await accountsPage.deleteAccount(accountName);

		await accountsPage.expectSuccessToast(/account deleted successfully/i);

		// The account should no longer appear in the list
		await expect(accountsPage.getAccountCard(accountName)).not.toBeVisible({ timeout: 10_000 });
	});
});

// ---------------------------------------------------------------------------
// Accounts — Full CRUD Workflow
// ---------------------------------------------------------------------------
test.describe('Accounts — Full CRUD Workflow', () => {
	test('should create, edit, and delete an account in sequence', async ({ page }) => {
		const accountsPage = new AccountsPage(page);
		await accountsPage.goto();
		await page.waitForLoadState('networkidle');

		// --- Create ---
		const originalName = uniqueName('Workflow');
		await accountsPage.createAccount(originalName, '750', 'Savings');
		await expect(accountsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await accountsPage.expectSuccessToast(/account added successfully/i);
		await expect(accountsPage.getAccountCard(originalName)).toBeVisible();
		await accountsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// --- Edit ---
		const updatedName = uniqueName('Workflow Edited');
		await accountsPage.editAccount(originalName, { name: updatedName, balance: '1500' });
		await expect(accountsPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await accountsPage.expectSuccessToast(/account edited successfully/i);
		await expect(accountsPage.getAccountCard(updatedName)).toBeVisible();
		await expect(accountsPage.getAccountCard(originalName)).not.toBeVisible();
		await accountsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// --- Delete ---
		await accountsPage.deleteAccount(updatedName);
		await accountsPage.expectSuccessToast(/account deleted successfully/i);
		await expect(accountsPage.getAccountCard(updatedName)).not.toBeVisible({ timeout: 10_000 });
	});
});
