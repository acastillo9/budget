import { type Page, type Locator, expect } from '@playwright/test';

export class WorkspacesPage {
	readonly page: Page;

	// Page header
	readonly heading: Locator;
	readonly description: Locator;

	// Invite member dialog trigger
	readonly inviteMemberButton: Locator;

	// Invite member dialog
	readonly dialog: Locator;
	readonly emailInput: Locator;
	readonly roleTrigger: Locator;
	readonly sendInvitationButton: Locator;

	// Members card
	readonly membersCard: Locator;
	readonly membersTitle: Locator;

	// Pending invitations card
	readonly pendingInvitationsCard: Locator;

	// Confirmation dialog (AlertDialog)
	readonly confirmationDialog: Locator;
	readonly confirmationDescription: Locator;
	readonly confirmButton: Locator;
	readonly cancelButton: Locator;

	// Toast
	readonly toast: Locator;

	// Workspace switcher (sidebar)
	readonly workspaceSwitcherButton: Locator;
	readonly workspaceSwitcherDropdown: Locator;

	constructor(page: Page) {
		this.page = page;

		// Page header
		this.heading = page.getByRole('heading', { level: 1, name: /workspace/i });
		this.description = page.getByText(/manage workspace members and invitations/i);

		// Invite member button
		this.inviteMemberButton = page.getByRole('button', { name: /invite member/i });

		// Dialog elements
		this.dialog = page.getByRole('dialog');
		this.emailInput = page.getByLabel(/email/i);
		this.roleTrigger = this.dialog.locator('[data-slot="select-trigger"]');
		this.sendInvitationButton = page.getByRole('button', { name: /send invitation/i });

		// Members card — first card on the page
		this.membersCard = page
			.locator('[data-slot="card"]')
			.filter({ hasText: /members/i })
			.first();
		this.membersTitle = this.membersCard.locator('[data-slot="card-title"]');

		// Pending invitations card
		this.pendingInvitationsCard = page
			.locator('[data-slot="card"]')
			.filter({ hasText: /pending invitations/i });

		// Confirmation dialog (AlertDialog)
		this.confirmationDialog = page.getByRole('alertdialog');
		this.confirmationDescription = this.confirmationDialog.locator(
			'[data-alert-dialog-description]'
		);
		this.confirmButton = this.confirmationDialog.getByRole('button', { name: /confirm/i });
		this.cancelButton = this.confirmationDialog.getByRole('button', { name: /cancel/i });

		// Toast
		this.toast = page.locator('[data-sonner-toast]');

		// Workspace switcher in sidebar
		this.workspaceSwitcherButton = page
			.locator('[data-sidebar="menu-button"]')
			.filter({ hasText: /workspace/i })
			.first();
		this.workspaceSwitcherDropdown = page.getByRole('menu');
	}

	async goto() {
		await this.page.goto('/workspaces');
	}

	// ---------------------------------------------------------------------------
	// Invite member dialog interactions
	// ---------------------------------------------------------------------------

	async openInviteDialog() {
		await this.inviteMemberButton.click();
		await expect(this.dialog).toBeVisible({ timeout: 10_000 });
	}

	async fillEmail(email: string) {
		await this.emailInput.fill(email);
	}

	async selectRole(role: string) {
		await this.roleTrigger.click();
		await this.page.getByRole('option', { name: role, exact: true }).click();
	}

	async submitInvite() {
		await this.sendInvitationButton.click();
	}

	/**
	 * Complete flow: open dialog → fill email → select role → submit invitation.
	 */
	async inviteMember(email: string, role: string = 'Contributor') {
		await this.openInviteDialog();
		await this.fillEmail(email);
		await this.selectRole(role);
		await this.submitInvite();
	}

	// ---------------------------------------------------------------------------
	// Members list interactions
	// ---------------------------------------------------------------------------

	/**
	 * Returns a locator for a member row containing the given email or name.
	 */
	getMemberRow(nameOrEmail: string): Locator {
		return this.membersCard.locator('.flex.items-center.justify-between', {
			hasText: nameOrEmail
		});
	}

	/**
	 * Returns a locator for a pending invitation row containing the given email.
	 */
	getInvitationRow(email: string): Locator {
		return this.pendingInvitationsCard.locator('.flex.items-center.justify-between', {
			hasText: email
		});
	}

	/**
	 * Click the remove (trash) icon button for the given member.
	 */
	async clickRemoveMember(nameOrEmail: string) {
		const row = this.getMemberRow(nameOrEmail);
		// The row has a select trigger (role dropdown) and a trash icon button.
		// Target the last button which is the remove/trash button.
		await row.getByRole('button').last().click();
		await expect(this.confirmationDialog).toBeVisible();
	}

	/**
	 * Confirm the action in the confirmation dialog.
	 */
	async confirmAction() {
		await this.confirmButton.click();
	}

	/**
	 * Cancel the action in the confirmation dialog.
	 */
	async cancelAction() {
		await this.cancelButton.click();
	}

	/**
	 * Complete flow: click remove member → confirm.
	 */
	async removeMember(nameOrEmail: string) {
		await this.clickRemoveMember(nameOrEmail);
		await this.confirmAction();
	}

	/**
	 * Click the revoke (X) icon button for a pending invitation.
	 */
	async clickRevokeInvitation(email: string) {
		const row = this.getInvitationRow(email);
		await row.getByRole('button').click();
		await expect(this.confirmationDialog).toBeVisible();
	}

	/**
	 * Complete flow: click revoke → confirm.
	 */
	async revokeInvitation(email: string) {
		await this.clickRevokeInvitation(email);
		await this.confirmAction();
	}

	/**
	 * Change a member's role using the select dropdown.
	 */
	async changeMemberRole(nameOrEmail: string, newRole: string) {
		const row = this.getMemberRow(nameOrEmail);
		const selectTrigger = row.locator('[data-slot="select-trigger"]');
		await selectTrigger.click();
		await this.page.getByRole('option', { name: newRole, exact: true }).click();
	}

	// ---------------------------------------------------------------------------
	// Workspace switcher interactions
	// ---------------------------------------------------------------------------

	async openWorkspaceSwitcher() {
		await this.workspaceSwitcherButton.click();
		await expect(this.workspaceSwitcherDropdown).toBeVisible({ timeout: 5_000 });
	}

	getWorkspaceMenuItem(name: string): Locator {
		return this.workspaceSwitcherDropdown.getByRole('menuitem', { name });
	}

	async switchWorkspace(name: string) {
		await this.openWorkspaceSwitcher();
		await this.getWorkspaceMenuItem(name).click();
	}

	async goToWorkspaceSettings() {
		await this.openWorkspaceSwitcher();
		await this.workspaceSwitcherDropdown
			.getByRole('menuitem', { name: /workspace settings/i })
			.click();
	}

	/**
	 * Check if a member is already visible in the members list.
	 */
	async isMemberVisible(nameOrEmail: string): Promise<boolean> {
		return this.getMemberRow(nameOrEmail).isVisible();
	}

	// ---------------------------------------------------------------------------
	// Toast helpers
	// ---------------------------------------------------------------------------

	async expectSuccessToast(textPattern?: RegExp) {
		const toastLocator = textPattern
			? this.page.locator('[data-sonner-toast]', { hasText: textPattern })
			: this.toast;
		await expect(toastLocator).toBeVisible({ timeout: 10_000 });
	}

	async waitForToastHidden() {
		await this.toast.waitFor({ state: 'hidden', timeout: 10_000 });
	}
}
