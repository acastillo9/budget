import { type Page, type Locator, expect } from '@playwright/test';

export class CategoriesPage {
	readonly page: Page;

	// Page header
	readonly heading: Locator;
	readonly description: Locator;

	// Add category dialog trigger
	readonly addCategoryButton: Locator;

	// Dialog elements
	readonly dialog: Locator;
	readonly nameInput: Locator;
	readonly categoryTypeTrigger: Locator;
	readonly parentCategoryTrigger: Locator;
	readonly createCategoryButton: Locator;
	readonly saveButton: Locator;

	// Confirmation dialog
	readonly confirmationDialog: Locator;
	readonly confirmationTitle: Locator;
	readonly confirmationDescription: Locator;
	readonly confirmDeleteButton: Locator;
	readonly cancelDeleteButton: Locator;

	// Toast
	readonly toast: Locator;

	constructor(page: Page) {
		this.page = page;

		// Page header
		this.heading = page.getByRole('heading', { level: 1, name: /categories/i });
		this.description = page.getByText(/view and manage your categories/i);

		// Add category dialog trigger
		this.addCategoryButton = page.getByRole('button', { name: /add category/i });

		// Dialog elements (inside the dialog overlay)
		this.dialog = page.getByRole('dialog');
		this.nameInput = page.getByLabel(/category name/i);
		this.categoryTypeTrigger = this.dialog.locator('[data-slot="select-trigger"]').first();
		this.parentCategoryTrigger = this.dialog.locator('[data-slot="select-trigger"]').first();
		this.createCategoryButton = page.getByRole('button', { name: /create category/i });
		this.saveButton = page.getByRole('button', { name: /^save$/i });

		// Confirmation dialog (AlertDialog)
		this.confirmationDialog = page.getByRole('alertdialog');
		this.confirmationTitle = this.confirmationDialog.locator('[data-alert-dialog-title]');
		this.confirmationDescription = this.confirmationDialog.locator(
			'[data-alert-dialog-description]'
		);
		this.confirmDeleteButton = this.confirmationDialog.getByRole('button', { name: /delete/i });
		this.cancelDeleteButton = this.confirmationDialog.getByRole('button', { name: /cancel/i });

		// Toast
		this.toast = page.locator('[data-sonner-toast]');
	}

	async goto() {
		await this.page.goto('/categories');
	}

	// ---------------------------------------------------------------------------
	// Category form interactions
	// ---------------------------------------------------------------------------

	async openAddDialog() {
		await this.page.waitForLoadState('networkidle');
		await this.addCategoryButton.click();
		await expect(this.dialog).toBeVisible({ timeout: 10_000 });
	}

	async fillName(name: string) {
		await this.nameInput.fill(name);
	}

	async selectCategoryType(typeName: string) {
		// Category type is the last select trigger when parent selector is visible,
		// or the first when it's not
		const triggers = this.dialog.locator('[data-slot="select-trigger"]');
		const count = await triggers.count();
		const typeTrigger = count > 1 ? triggers.nth(1) : triggers.first();
		await typeTrigger.click();
		await this.page.getByRole('option', { name: typeName, exact: true }).click();
	}

	async selectParentCategory(parentName: string) {
		// Parent category is always the first select trigger
		const triggers = this.dialog.locator('[data-slot="select-trigger"]');
		await triggers.first().click();
		await this.page.getByRole('option', { name: parentName, exact: true }).click();
	}

	async selectIcon(iconTitle: string) {
		await this.dialog.getByTitle(iconTitle).click();
	}

	async submitCreate() {
		await this.createCategoryButton.click();
	}

	async submitSave() {
		await this.saveButton.click();
	}

	/**
	 * Complete flow: open dialog → fill form → submit for creation.
	 */
	async createCategory(name: string, categoryType: string, iconTitle: string) {
		await this.openAddDialog();
		await this.fillName(name);
		await this.selectCategoryType(categoryType);
		await this.selectIcon(iconTitle);
		await this.submitCreate();
	}

	/**
	 * Complete flow: open dialog → select parent → fill form → submit for subcategory creation.
	 */
	async createSubcategory(name: string, parentName: string, iconTitle: string) {
		await this.openAddDialog();
		await this.fillName(name);
		await this.selectParentCategory(parentName);
		await this.selectIcon(iconTitle);
		await this.submitCreate();
	}

	// ---------------------------------------------------------------------------
	// Category list interactions
	// ---------------------------------------------------------------------------

	/**
	 * Returns the card locator for a category identified by its name.
	 */
	getCategoryCard(name: string): Locator {
		return this.page.locator('.rounded-lg.border, .rounded-md.border', { hasText: name });
	}

	/**
	 * Click the "Add Subcategory" button (+) on a parent card.
	 */
	async clickAddSubcategory(parentName: string) {
		const card = this.page.locator('.rounded-lg.border', { hasText: parentName });
		await card.getByTitle(/add subcategory/i).click();
		await expect(this.dialog).toBeVisible({ timeout: 10_000 });
	}

	/**
	 * Expand a parent category's collapsible section.
	 */
	async expandParentCategory(parentName: string) {
		// The Collapsible.Root wraps the .rounded-lg.border div, so find the trigger inside the card
		const card = this.page.locator('.rounded-lg.border', { hasText: parentName });
		const trigger = card.locator('[data-slot="collapsible-trigger"]');
		await trigger.click();
	}

	/**
	 * Get a subcategory card nested under a parent.
	 */
	getSubcategoryCard(parentName: string, childName: string): Locator {
		const parentCard = this.page.locator('.rounded-lg.border', { hasText: parentName });
		return parentCard.locator('.rounded-md.border', { hasText: childName });
	}

	/**
	 * Click the edit (pencil) icon button for the given category.
	 */
	async clickEdit(categoryName: string) {
		const card = this.getCategoryCard(categoryName);
		await card.getByTitle('Edit').first().click();
		await expect(this.dialog).toBeVisible();
	}

	/**
	 * Click the delete (trash) icon button for the given category.
	 */
	async clickDelete(categoryName: string) {
		const card = this.getCategoryCard(categoryName);
		await card.getByTitle('Delete').first().click();
		await expect(this.confirmationDialog).toBeVisible();
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
	 * Complete flow: click edit → update fields → submit.
	 */
	async editCategory(
		existingName: string,
		newData: { name?: string; categoryType?: string; iconTitle?: string }
	) {
		await this.clickEdit(existingName);
		if (newData.name !== undefined) {
			await this.nameInput.clear();
			await this.fillName(newData.name);
		}
		if (newData.categoryType) {
			await this.selectCategoryType(newData.categoryType);
		}
		if (newData.iconTitle) {
			await this.selectIcon(newData.iconTitle);
		}
		await this.submitSave();
	}

	/**
	 * Complete flow: click delete → confirm in dialog.
	 */
	async deleteCategory(categoryName: string) {
		await this.clickDelete(categoryName);
		await this.confirmDeletion();
	}

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
