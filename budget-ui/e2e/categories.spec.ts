import { test, expect } from '@playwright/test';
import { CategoriesPage } from './pages/categories.page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unique category name to avoid collisions between parallel tests. */
function uniqueName(prefix: string): string {
	return `${prefix} ${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Categories — Page Load & List
// ---------------------------------------------------------------------------
test.describe('Categories — Page Load & List', () => {
	let categoriesPage: CategoriesPage;

	test.beforeEach(async ({ page }) => {
		categoriesPage = new CategoriesPage(page);
		await categoriesPage.goto();
		await page.waitForLoadState('networkidle');
	});

	test('should display the categories page with heading and description', async () => {
		await expect(categoriesPage.heading).toBeVisible();
		await expect(categoriesPage.description).toBeVisible();
	});

	test('should display the Add Category button', async () => {
		await expect(categoriesPage.addCategoryButton).toBeVisible();
	});

	test('should open the Add Category dialog when clicking the button', async () => {
		await categoriesPage.openAddDialog();
		await expect(categoriesPage.nameInput).toBeVisible();
		await expect(categoriesPage.categoryTypeTrigger).toBeVisible();
		await expect(categoriesPage.createCategoryButton).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Categories — Create
// ---------------------------------------------------------------------------
test.describe('Categories — Create', () => {
	let categoriesPage: CategoriesPage;

	test.beforeEach(async ({ page }) => {
		categoriesPage = new CategoriesPage(page);
		await categoriesPage.goto();
		await page.waitForLoadState('networkidle');
	});

	test('should create a new expense category successfully', async () => {
		const name = uniqueName('Groceries');
		await categoriesPage.createCategory(name, 'Expense', 'Shopping Cart');

		// Dialog should close and success toast should appear
		await expect(categoriesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await categoriesPage.expectSuccessToast(/category added successfully/i);

		// The new category should appear in the list
		await expect(categoriesPage.getCategoryCard(name)).toBeVisible();
	});

	test('should create a new income category successfully', async () => {
		const name = uniqueName('Salary');
		await categoriesPage.createCategory(name, 'Income', 'Briefcase');

		await expect(categoriesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await categoriesPage.expectSuccessToast(/category added successfully/i);
		await expect(categoriesPage.getCategoryCard(name)).toBeVisible();
	});

	test('should keep Create Category button disabled when form is empty', async () => {
		await categoriesPage.openAddDialog();
		await expect(categoriesPage.createCategoryButton).toBeDisabled();
	});

	test('should keep Create Category button disabled when only name is filled', async () => {
		await categoriesPage.openAddDialog();
		await categoriesPage.fillName('Test Category');
		await expect(categoriesPage.createCategoryButton).toBeDisabled();
	});

	test('should keep Create Category button disabled when name and type are filled but no icon', async () => {
		await categoriesPage.openAddDialog();
		await categoriesPage.fillName('Test Category');
		await categoriesPage.selectCategoryType('Expense');
		await expect(categoriesPage.createCategoryButton).toBeDisabled();
	});
});

// ---------------------------------------------------------------------------
// Categories — Edit
// ---------------------------------------------------------------------------
test.describe('Categories — Edit', () => {
	let categoriesPage: CategoriesPage;
	let categoryName: string;

	test.beforeEach(async ({ page }) => {
		categoriesPage = new CategoriesPage(page);
		await categoriesPage.goto();
		await page.waitForLoadState('networkidle');

		// Create a category to edit
		categoryName = uniqueName('EditMe');
		await categoriesPage.createCategory(categoryName, 'Expense', 'Shopping Cart');
		await expect(categoriesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await categoriesPage.expectSuccessToast(/category added successfully/i);
		// Wait for toast to disappear to avoid interference
		await categoriesPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
	});

	test('should open edit dialog with pre-filled data', async () => {
		await categoriesPage.clickEdit(categoryName);

		// The dialog should show "Edit Category" title and "Save" button
		await expect(categoriesPage.dialog).toBeVisible();
		await expect(categoriesPage.saveButton).toBeVisible();

		// Name should be pre-filled
		await expect(categoriesPage.nameInput).toHaveValue(categoryName);

		// Category type trigger should show the selected type
		await expect(categoriesPage.categoryTypeTrigger).toHaveText(/expense/i);
	});

	test('should update a category name successfully', async () => {
		const newName = uniqueName('Updated');
		await categoriesPage.editCategory(categoryName, { name: newName });

		await expect(categoriesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await categoriesPage.expectSuccessToast(/category edited successfully/i);

		// The updated name should appear in the list
		await expect(categoriesPage.getCategoryCard(newName)).toBeVisible();
		// The old name should be gone
		await expect(categoriesPage.getCategoryCard(categoryName)).not.toBeVisible();
	});

	test('should update a category type successfully', async () => {
		await categoriesPage.editCategory(categoryName, {
			name: categoryName,
			categoryType: 'Income'
		});

		await expect(categoriesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await categoriesPage.expectSuccessToast(/category edited successfully/i);

		// The category card should still be visible with the same name
		await expect(categoriesPage.getCategoryCard(categoryName)).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Categories — Delete
// ---------------------------------------------------------------------------
test.describe('Categories — Delete', () => {
	let categoriesPage: CategoriesPage;
	let categoryName: string;

	test.beforeEach(async ({ page }) => {
		categoriesPage = new CategoriesPage(page);
		await categoriesPage.goto();
		await page.waitForLoadState('networkidle');

		// Create a category to delete
		categoryName = uniqueName('DeleteMe');
		await categoriesPage.createCategory(categoryName, 'Expense', 'Coffee');
		await expect(categoriesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await categoriesPage.expectSuccessToast(/category added successfully/i);
		await categoriesPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
	});

	test('should show confirmation dialog when clicking delete', async () => {
		await categoriesPage.clickDelete(categoryName);

		await expect(categoriesPage.confirmationDialog).toBeVisible();
		await expect(categoriesPage.confirmationDescription).toContainText(categoryName);
	});

	test('should cancel deletion and keep the category', async () => {
		await categoriesPage.clickDelete(categoryName);
		await categoriesPage.cancelDeletion();

		await expect(categoriesPage.confirmationDialog).not.toBeVisible();
		// Category should still be in the list
		await expect(categoriesPage.getCategoryCard(categoryName)).toBeVisible();
	});

	test('should delete a category successfully', async () => {
		await categoriesPage.deleteCategory(categoryName);

		await categoriesPage.expectSuccessToast(/category deleted successfully/i);

		// The category should no longer appear in the list
		await expect(categoriesPage.getCategoryCard(categoryName)).not.toBeVisible({
			timeout: 10_000
		});
	});
});

// ---------------------------------------------------------------------------
// Categories — Full CRUD Workflow
// ---------------------------------------------------------------------------
test.describe('Categories — Full CRUD Workflow', () => {
	test('should create, edit, and delete a category in sequence', async ({ page }) => {
		const categoriesPage = new CategoriesPage(page);
		await categoriesPage.goto();
		await page.waitForLoadState('networkidle');

		// --- Create ---
		const originalName = uniqueName('Workflow');
		await categoriesPage.createCategory(originalName, 'Expense', 'Pizza');
		await expect(categoriesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await categoriesPage.expectSuccessToast(/category added successfully/i);
		await expect(categoriesPage.getCategoryCard(originalName)).toBeVisible();
		await categoriesPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// --- Edit ---
		const updatedName = uniqueName('Workflow Edited');
		await categoriesPage.editCategory(originalName, {
			name: updatedName,
			categoryType: 'Income',
			iconTitle: 'Briefcase'
		});
		await expect(categoriesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await categoriesPage.expectSuccessToast(/category edited successfully/i);
		await expect(categoriesPage.getCategoryCard(updatedName)).toBeVisible();
		await expect(categoriesPage.getCategoryCard(originalName)).not.toBeVisible();
		await categoriesPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// --- Delete ---
		await categoriesPage.deleteCategory(updatedName);
		await categoriesPage.expectSuccessToast(/category deleted successfully/i);
		await expect(categoriesPage.getCategoryCard(updatedName)).not.toBeVisible({
			timeout: 10_000
		});
	});
});
