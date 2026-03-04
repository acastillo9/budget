import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { TransactionsPage } from './pages/transactions.page';
import { AccountsPage } from './pages/accounts.page';
import { CategoriesPage } from './pages/categories.page';
import path from 'path';
import fs from 'fs';
import os from 'os';

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

async function createTestTransaction(
	page: Page,
	transactionsPage: TransactionsPage,
	accountName: string,
	categoryName: string,
	prefix: string
): Promise<string> {
	const description = uniqueName(prefix);
	await transactionsPage.createExpenseTransaction({
		categoryName,
		account: accountName,
		amount: '100',
		description
	});
	await expect(transactionsPage.dialog).not.toBeVisible({ timeout: 10_000 });
	await transactionsPage.expectSuccessToast(/transaction added successfully/i);
	await transactionsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
	return description;
}

/**
 * Helper to set up common prerequisites: account, category, transaction, and navigate to edit.
 */
async function setupTransactionForEdit(page: Page) {
	const accountName = await createTestAccount(page, 'AttAcc');
	const categoryName = await createTestCategory(page, 'AttCat', 'Expense');
	const transactionsPage = new TransactionsPage(page);
	await transactionsPage.goto();
	await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });

	const description = await createTestTransaction(
		page,
		transactionsPage,
		accountName,
		categoryName,
		'AttTx'
	);
	await transactionsPage.gotoAndWaitForTransaction(description);
	return { transactionsPage, accountName, categoryName, description };
}

// ---------------------------------------------------------------------------
// Attachments — Upload Zone Visibility
// ---------------------------------------------------------------------------
test.describe('Attachments — Upload Zone Visibility', () => {
	test.setTimeout(120_000);

	test('should NOT show attachment upload zone when creating a new transaction', async ({
		page
	}) => {
		const accountName = await createTestAccount(page, 'AttNewAcc');
		const categoryName = await createTestCategory(page, 'AttNewCat', 'Expense');
		const transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });

		await transactionsPage.openAddDialog();
		await transactionsPage.selectTransactionType('EXPENSE');
		await transactionsPage.goToNextStep();
		await transactionsPage.selectCategory(categoryName);
		await transactionsPage.goToNextStep();

		// On step 3 (creating new), upload zone should NOT be visible
		await expect(transactionsPage.uploadZone).not.toBeVisible();
		await expect(transactionsPage.supportedFormatsText).not.toBeVisible();
	});

	test('should show attachment upload zone when editing an existing transaction', async ({
		page
	}) => {
		const { transactionsPage, description } = await setupTransactionForEdit(page);

		await transactionsPage.clickEdit(description);

		// Upload zone should be visible in edit mode
		await expect(transactionsPage.uploadZone).toBeVisible({ timeout: 10_000 });
		await expect(transactionsPage.supportedFormatsText).toBeVisible();
	});

	test('should NOT show attachment upload zone when creating a new transfer', async ({ page }) => {
		const accountName1 = await createTestAccount(page, 'AttTrFrom');
		const accountName2 = await createTestAccount(page, 'AttTrTo');
		const transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });

		await transactionsPage.openAddDialog();
		await transactionsPage.selectTransactionType('TRANSFER');
		await transactionsPage.goToNextStep();

		// On step 3 (creating new transfer), upload zone should NOT be visible
		await expect(transactionsPage.uploadZone).not.toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Attachments — Upload Zone UI Elements
// ---------------------------------------------------------------------------
test.describe('Attachments — Upload Zone UI Elements', () => {
	test.setTimeout(120_000);

	test('should display drag-and-drop instruction text and supported formats', async ({ page }) => {
		const { transactionsPage, description } = await setupTransactionForEdit(page);
		await transactionsPage.clickEdit(description);

		await expect(transactionsPage.uploadZone).toBeVisible({ timeout: 10_000 });
		await expect(page.getByText(/drag and drop a file here, or click to browse/i)).toBeVisible();
		await expect(page.getByText(/supported.*jpg.*png.*webp.*pdf.*5mb/i)).toBeVisible();
	});

	test('should have a hidden file input with correct accept attribute', async ({ page }) => {
		const { transactionsPage, description } = await setupTransactionForEdit(page);
		await transactionsPage.clickEdit(description);
		await expect(transactionsPage.uploadZone).toBeVisible({ timeout: 10_000 });

		const fileInput = transactionsPage.fileInput;
		await expect(fileInput).toBeAttached();
		await expect(fileInput).toHaveClass(/hidden/);

		const acceptAttr = await fileInput.getAttribute('accept');
		expect(acceptAttr).toContain('image/jpeg');
		expect(acceptAttr).toContain('image/png');
		expect(acceptAttr).toContain('image/webp');
		expect(acceptAttr).toContain('application/pdf');
	});

	test('should have the upload zone as a clickable button', async ({ page }) => {
		const { transactionsPage, description } = await setupTransactionForEdit(page);
		await transactionsPage.clickEdit(description);

		const uploadZone = transactionsPage.uploadZone;
		await expect(uploadZone).toBeVisible({ timeout: 10_000 });
		await expect(uploadZone).toBeEnabled();

		// Verify it's a button element (for accessibility)
		const tagName = await uploadZone.evaluate((el) => el.tagName.toLowerCase());
		expect(tagName).toBe('button');
	});
});

// ---------------------------------------------------------------------------
// Attachments — Client-side Validation
// ---------------------------------------------------------------------------
test.describe('Attachments — Client-side Validation', () => {
	test.setTimeout(120_000);

	test('should show error message for unsupported file type', async ({ page }) => {
		const { transactionsPage, description } = await setupTransactionForEdit(page);
		await transactionsPage.clickEdit(description);
		await expect(transactionsPage.uploadZone).toBeVisible({ timeout: 10_000 });

		// Create an unsupported file (.txt)
		const tmpDir = path.join(os.tmpdir(), '.tmp-test-val');
		if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

		try {
			const filePath = path.join(tmpDir, 'unsupported.txt');
			fs.writeFileSync(filePath, 'This is a plain text file');

			await transactionsPage.fileInput.setInputFiles(filePath);

			// Should show the unsupported type error below the upload zone
			await expect(page.getByText(/unsupported file type/i)).toBeVisible({ timeout: 10_000 });
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	test('should show error message for file that is too large', async ({ page }) => {
		const { transactionsPage, description } = await setupTransactionForEdit(page);
		await transactionsPage.clickEdit(description);
		await expect(transactionsPage.uploadZone).toBeVisible({ timeout: 10_000 });

		// Create a file larger than 5MB
		const tmpDir = path.join(os.tmpdir(), '.tmp-test-large');
		if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

		try {
			const filePath = path.join(tmpDir, 'large-file.jpg');
			// Create a 6MB buffer (exceeds 5MB limit)
			const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 0xff);
			// Prepend a JPEG header so the MIME type check passes
			const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
			const content = Buffer.concat([jpegHeader, largeBuffer]);
			fs.writeFileSync(filePath, content);

			await transactionsPage.fileInput.setInputFiles(filePath);

			// Should show the file too large error
			await expect(page.getByText(/file is too large/i)).toBeVisible({ timeout: 10_000 });
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});
});

// ---------------------------------------------------------------------------
// Attachments — File Upload (requires backend API)
// ---------------------------------------------------------------------------
test.describe('Attachments — File Upload & API Integration', () => {
	test.setTimeout(120_000);

	test('should upload a JPEG file and show success toast', async ({ page }) => {
		const { transactionsPage, description } = await setupTransactionForEdit(page);
		await transactionsPage.clickEdit(description);
		await expect(transactionsPage.uploadZone).toBeVisible({ timeout: 10_000 });

		const tmpDir = path.join(os.tmpdir(), '.tmp-test-upload');
		if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

		try {
			// Minimal valid JPEG
			const jpegHeader = Buffer.from([
				0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
				0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9
			]);
			const filePath = path.join(tmpDir, 'receipt.jpg');
			fs.writeFileSync(filePath, jpegHeader);

			await transactionsPage.uploadFile(filePath);

			await transactionsPage.expectSuccessToast(/attachment uploaded successfully/i);
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	test('should show uploaded attachment in the list with filename and size', async ({ page }) => {
		const { transactionsPage, description } = await setupTransactionForEdit(page);
		await transactionsPage.clickEdit(description);
		await expect(transactionsPage.uploadZone).toBeVisible({ timeout: 10_000 });

		const tmpDir = path.join(os.tmpdir(), '.tmp-test-list');
		if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

		try {
			const jpegHeader = Buffer.from([
				0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
				0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9
			]);
			const filePath = path.join(tmpDir, 'my-receipt.jpg');
			fs.writeFileSync(filePath, jpegHeader);

			await transactionsPage.uploadFile(filePath);
			await transactionsPage.expectSuccessToast(/attachment uploaded successfully/i);

			// Attachment list should show the "Attachments" heading
			await expect(transactionsPage.attachmentsTitle).toBeVisible({ timeout: 10_000 });

			// The filename should appear in the list
			await expect(transactionsPage.getAttachmentItem('my-receipt.jpg')).toBeVisible({
				timeout: 10_000
			});
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	test('should delete an uploaded attachment and show success toast', async ({ page }) => {
		const { transactionsPage, description } = await setupTransactionForEdit(page);
		await transactionsPage.clickEdit(description);
		await expect(transactionsPage.uploadZone).toBeVisible({ timeout: 10_000 });

		const tmpDir = path.join(os.tmpdir(), '.tmp-test-del');
		if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

		try {
			const jpegHeader = Buffer.from([
				0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
				0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9
			]);
			const filePath = path.join(tmpDir, 'to-delete.jpg');
			fs.writeFileSync(filePath, jpegHeader);

			// Upload first
			await transactionsPage.uploadFile(filePath);
			await transactionsPage.expectSuccessToast(/attachment uploaded successfully/i);
			await transactionsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

			// Delete the attachment
			await transactionsPage.deleteAttachment('to-delete.jpg');

			await transactionsPage.expectSuccessToast(/attachment deleted successfully/i);

			// Should be removed from the list
			await expect(transactionsPage.getAttachmentItem('to-delete.jpg')).not.toBeVisible({
				timeout: 10_000
			});
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	test('should show confirmation dialog with filename when deleting an attachment', async ({
		page
	}) => {
		const { transactionsPage, description } = await setupTransactionForEdit(page);
		await transactionsPage.clickEdit(description);
		await expect(transactionsPage.uploadZone).toBeVisible({ timeout: 10_000 });

		const tmpDir = path.join(os.tmpdir(), '.tmp-test-confirm');
		if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

		try {
			const jpegHeader = Buffer.from([
				0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
				0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9
			]);
			const filePath = path.join(tmpDir, 'confirm-del.jpg');
			fs.writeFileSync(filePath, jpegHeader);

			// Upload
			await transactionsPage.uploadFile(filePath);
			await transactionsPage.expectSuccessToast(/attachment uploaded successfully/i);
			await transactionsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

			// Click delete button
			await transactionsPage.clickDeleteAttachment('confirm-del.jpg');

			// Confirmation dialog should be visible
			const alertDialog = page.getByRole('alertdialog');
			await expect(alertDialog).toBeVisible({ timeout: 10_000 });

			// Title should mention "Delete Attachment"
			await expect(alertDialog.locator('[data-alert-dialog-title]')).toContainText(
				/delete attachment/i
			);

			// Description should contain the filename
			await expect(alertDialog.locator('[data-alert-dialog-description]')).toContainText(
				'confirm-del.jpg'
			);
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});
});

// ---------------------------------------------------------------------------
// Attachments — Transaction Item Badge
// ---------------------------------------------------------------------------
test.describe('Attachments — Transaction Item Badge', () => {
	test.setTimeout(120_000);

	test('should not display paperclip badge when transaction has no attachments', async ({
		page
	}) => {
		const accountName = await createTestAccount(page, 'NoBadgeAcc');
		const categoryName = await createTestCategory(page, 'NoBadgeCat', 'Expense');
		const transactionsPage = new TransactionsPage(page);
		await transactionsPage.goto();
		await expect(transactionsPage.heading).toBeVisible({ timeout: 15_000 });

		const description = await createTestTransaction(
			page,
			transactionsPage,
			accountName,
			categoryName,
			'NoBadgeTx'
		);
		await transactionsPage.gotoAndWaitForTransaction(description);

		const item = transactionsPage.getTransactionItem(description);
		await expect(item).toBeVisible({ timeout: 10_000 });

		// The Paperclip badge should not be present (attachmentCount is 0 or undefined)
		const paperclipBadge = item.locator('div:has(svg.h-3.w-3)', {
			hasText: /^\d+$/
		});
		await expect(paperclipBadge).not.toBeVisible();
	});
});
