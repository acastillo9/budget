import { test, expect } from './fixtures';
import { WorkspacesPage } from './pages/workspaces.page';
import { SignInPage } from './pages/signin.page';
import { SignUpPage } from './pages/signup.page';
import { MailpitClient } from './helpers/mailpit';

// ---------------------------------------------------------------------------
// Workspaces — Page Load & Members List
// ---------------------------------------------------------------------------
test.describe('Workspaces — Page Load & Members List', () => {
	let workspacesPage: WorkspacesPage;

	test.beforeEach(async ({ page }) => {
		workspacesPage = new WorkspacesPage(page);
		await workspacesPage.goto();
		await page.waitForLoadState('networkidle');
	});

	test('should display the workspace page with heading and description', async () => {
		await expect(workspacesPage.heading).toBeVisible();
		await expect(workspacesPage.description).toBeVisible();
	});

	test('should display the members card with at least the owner', async () => {
		await expect(workspacesPage.membersTitle).toBeVisible();
		// The authenticated user (owner) should appear in the members list
		await expect(workspacesPage.getMemberRow('E2E Test User')).toBeVisible();
	});

	test('should show the owner badge for the current user', async () => {
		const memberRow = workspacesPage.getMemberRow('E2E Test User');
		await expect(memberRow.getByText(/owner/i)).toBeVisible();
	});

	test('should display the Invite Member button for the owner', async () => {
		await expect(workspacesPage.inviteMemberButton).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Workspaces — Invite Member Dialog
// ---------------------------------------------------------------------------
test.describe('Workspaces — Invite Member Dialog', () => {
	let workspacesPage: WorkspacesPage;

	test.beforeEach(async ({ page }) => {
		workspacesPage = new WorkspacesPage(page);
		await workspacesPage.goto();
		await page.waitForLoadState('networkidle');
	});

	test('should open the invite member dialog', async () => {
		await workspacesPage.openInviteDialog();
		await expect(workspacesPage.emailInput).toBeVisible();
		await expect(workspacesPage.sendInvitationButton).toBeVisible();
	});

	test('should keep Send Invitation button disabled when email is empty', async () => {
		await workspacesPage.openInviteDialog();
		await expect(workspacesPage.sendInvitationButton).toBeDisabled();
	});

	test('should send an invitation successfully', async () => {
		const inviteEmail = `invite-test-${Date.now()}@example.com`;
		await workspacesPage.inviteMember(inviteEmail, 'Contributor');

		await expect(workspacesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await workspacesPage.expectSuccessToast(/invitation sent successfully/i);
	});

	test('should show the invitation in pending invitations after sending', async () => {
		const inviteEmail = `invite-pending-${Date.now()}@example.com`;
		await workspacesPage.inviteMember(inviteEmail, 'Viewer');

		await expect(workspacesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await workspacesPage.expectSuccessToast(/invitation sent successfully/i);
		await workspacesPage.waitForToastHidden();

		// The pending invitations card should appear with the invited email
		await expect(workspacesPage.pendingInvitationsCard).toBeVisible();
		await expect(workspacesPage.getInvitationRow(inviteEmail)).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Workspaces — Revoke Invitation
// ---------------------------------------------------------------------------
test.describe('Workspaces — Revoke Invitation', () => {
	let workspacesPage: WorkspacesPage;
	let inviteEmail: string;

	test.beforeEach(async ({ page }) => {
		workspacesPage = new WorkspacesPage(page);
		await workspacesPage.goto();
		await page.waitForLoadState('networkidle');

		// Create an invitation to revoke
		inviteEmail = `invite-revoke-${Date.now()}@example.com`;
		await workspacesPage.inviteMember(inviteEmail, 'Contributor');
		await expect(workspacesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await workspacesPage.expectSuccessToast(/invitation sent successfully/i);
		await workspacesPage.waitForToastHidden();
	});

	test('should show confirmation dialog when clicking revoke', async () => {
		await workspacesPage.clickRevokeInvitation(inviteEmail);
		await expect(workspacesPage.confirmationDialog).toBeVisible();
		await expect(workspacesPage.confirmationDescription).toContainText(inviteEmail);
	});

	test('should cancel revocation and keep the invitation', async () => {
		await workspacesPage.clickRevokeInvitation(inviteEmail);
		await workspacesPage.cancelAction();

		await expect(workspacesPage.confirmationDialog).not.toBeVisible();
		await expect(workspacesPage.getInvitationRow(inviteEmail)).toBeVisible();
	});

	test('should revoke an invitation successfully', async () => {
		await workspacesPage.revokeInvitation(inviteEmail);

		await workspacesPage.expectSuccessToast(/invitation revoked successfully/i);
		// The invitation should no longer appear
		await expect(workspacesPage.getInvitationRow(inviteEmail)).not.toBeVisible({
			timeout: 10_000
		});
	});
});

// ---------------------------------------------------------------------------
// Workspaces — Workspace Switcher
// ---------------------------------------------------------------------------
test.describe('Workspaces — Workspace Switcher', () => {
	let workspacesPage: WorkspacesPage;

	test.beforeEach(async ({ page }) => {
		workspacesPage = new WorkspacesPage(page);
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('should display the workspace switcher in the sidebar', async () => {
		await expect(workspacesPage.workspaceSwitcherButton).toBeVisible();
	});

	test('should open the workspace switcher dropdown', async () => {
		await workspacesPage.openWorkspaceSwitcher();
		await expect(workspacesPage.workspaceSwitcherDropdown).toBeVisible();
	});

	test('should show workspace settings option in the dropdown', async () => {
		await workspacesPage.openWorkspaceSwitcher();
		await expect(
			workspacesPage.workspaceSwitcherDropdown.getByRole('menuitem', {
				name: /workspace settings/i
			})
		).toBeVisible();
	});

	test('should navigate to workspace settings from the switcher', async ({ page }) => {
		await workspacesPage.goToWorkspaceSettings();
		await page.waitForURL('/workspaces');
		await expect(workspacesPage.heading).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Workspaces — Accept Invitation Flow
// ---------------------------------------------------------------------------
test.describe('Workspaces — Accept Invitation Flow', () => {
	test('should allow a second user to accept an invitation and appear as a member', async ({
		page,
		browser,
		secondUserState,
		secondUserEmail
	}) => {
		const workspacesPage = new WorkspacesPage(page);
		const mailpit = new MailpitClient(process.env.MAILPIT_API_URL);

		// Step 1: As the owner, invite the second user
		await workspacesPage.goto();
		await page.waitForLoadState('networkidle');

		// Count existing emails for the second user before sending the invite
		const knownCount = await mailpit.countEmailsFor(secondUserEmail);

		await workspacesPage.inviteMember(secondUserEmail, 'Contributor');
		await expect(workspacesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await workspacesPage.expectSuccessToast(/invitation sent successfully/i);

		// Step 2: Retrieve the invitation token from the email
		const invitationToken = await mailpit.getInvitationToken(secondUserEmail, knownCount);

		// Step 3: As the second user, accept the invitation
		const secondContext = await browser.newContext({
			baseURL: 'http://localhost:4173',
			storageState: secondUserState
		});
		const secondPage = await secondContext.newPage();
		await secondPage.goto(`/accept-invite/${invitationToken}`);

		// Accepting redirects to dashboard with a success flash message
		await secondPage.waitForURL('/', { timeout: 15_000 });
		await expect(secondPage.locator('[data-sonner-toast]')).toBeVisible({ timeout: 10_000 });
		await secondContext.close();

		// Step 4: As the owner, verify the second user appears in the members list
		await workspacesPage.goto();
		await page.waitForLoadState('networkidle');

		// The member may not appear immediately; reload once if needed
		if (!(await workspacesPage.isMemberVisible('E2E Second User'))) {
			await page.reload();
			await page.waitForLoadState('networkidle');
		}

		await expect(workspacesPage.getMemberRow('E2E Second User')).toBeVisible({ timeout: 10_000 });
	});
});

// ---------------------------------------------------------------------------
// Workspaces — Post-Auth Redirect for Invitation Flow
// ---------------------------------------------------------------------------
test.describe('Workspaces — Post-Auth Redirect for Invitation Flow', () => {
	test('should redirect to accept-invite page after signing in via invite link', async ({
		page,
		browser,
		secondUserRef
	}) => {
		const workspacesPage = new WorkspacesPage(page);
		const mailpit = new MailpitClient(process.env.MAILPIT_API_URL);

		// Step 1: As the owner, invite the second user
		await workspacesPage.goto();
		await page.waitForLoadState('networkidle');

		const inviteEmail = secondUserRef.email;
		const knownCount = await mailpit.countEmailsFor(inviteEmail);

		await workspacesPage.inviteMember(inviteEmail, 'Contributor');
		await expect(workspacesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await workspacesPage.expectSuccessToast(/invitation sent successfully/i);

		// Step 2: Retrieve the invitation token from the email
		const invitationToken = await mailpit.getInvitationToken(inviteEmail, knownCount);

		// Step 3: Open the accept-invite page in a fresh (logged-out) context
		const freshContext = await browser.newContext({
			baseURL: 'http://localhost:4173',
			storageState: { cookies: [], origins: [] }
		});
		const freshPage = await freshContext.newPage();
		await freshPage.goto(`/accept-invite/${invitationToken}`);
		await freshPage.waitForLoadState('networkidle');

		// The page should show the "Sign In" button
		await expect(freshPage.getByRole('link', { name: /sign in/i })).toBeVisible();

		// Step 4: Click "Sign In" to go to the signin page
		await freshPage.getByRole('link', { name: /sign in/i }).click();
		await freshPage.waitForURL('/signin');

		// Step 5: Sign in as the second user
		const signInPage = new SignInPage(freshPage);
		await signInPage.signIn(secondUserRef.email, secondUserRef.password);

		// Step 6: Should be redirected to the accept-invite page and auto-accept
		// The accept-invite load function auto-accepts when logged in and redirects to /
		await freshPage.waitForURL('/', { timeout: 15_000 });

		// Verify the success toast from accepting the invitation
		await expect(freshPage.locator('[data-sonner-toast]')).toBeVisible({ timeout: 10_000 });

		await freshContext.close();
	});

	test('should redirect to accept-invite page after signing up via invite link', async ({
		page,
		browser
	}) => {
		const workspacesPage = new WorkspacesPage(page);
		const mailpit = new MailpitClient(process.env.MAILPIT_API_URL);

		// Step 1: As the owner, invite a brand-new email
		await workspacesPage.goto();
		await page.waitForLoadState('networkidle');

		const newUserEmail = `e2e-invite-redirect-${Date.now()}@example.com`;
		const knownCountInvite = await mailpit.countEmailsFor(newUserEmail);

		await workspacesPage.inviteMember(newUserEmail, 'Contributor');
		await expect(workspacesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await workspacesPage.expectSuccessToast(/invitation sent successfully/i);

		// Step 2: Retrieve the invitation token
		const invitationToken = await mailpit.getInvitationToken(newUserEmail, knownCountInvite);

		// Step 3: Open accept-invite page in a fresh context (no auth)
		const freshContext = await browser.newContext({
			baseURL: 'http://localhost:4173',
			storageState: { cookies: [], origins: [] }
		});
		const freshPage = await freshContext.newPage();
		await freshPage.goto(`/accept-invite/${invitationToken}`);
		await freshPage.waitForLoadState('networkidle');

		// Click "Sign In" which navigates to /signin
		await freshPage.getByRole('link', { name: /sign in/i }).click();
		await freshPage.waitForURL('/signin');

		// Step 4: Navigate to signup page and register
		await freshPage.goto('/signup');
		const signUpPage = new SignUpPage(freshPage);

		// Step 4a: Fill basic info and submit
		await signUpPage.fillBasicInfo('E2E Invite Redirect User', newUserEmail);
		await signUpPage.submitBasicInfo();
		await expect(signUpPage.activationDescription).toBeVisible({ timeout: 15_000 });

		// Step 4b: Get activation code and submit
		const activationCode = await mailpit.getActivationCode(newUserEmail);
		await signUpPage.fillActivationCode(activationCode);
		await signUpPage.submitActivation();
		await expect(signUpPage.passwordDescription).toBeVisible({ timeout: 15_000 });

		// Step 4c: Set password — after this the redirectTo cookie kicks in
		await signUpPage.fillPassword('TestPassword1!');
		await signUpPage.submitPassword();

		// Step 5: Should redirect to accept-invite which auto-accepts and lands on /
		await freshPage.waitForURL('/', { timeout: 15_000 });
		await expect(freshPage.locator('[data-sonner-toast]')).toBeVisible({ timeout: 10_000 });

		await freshContext.close();
	});

	test('should redirect to / when signing in without an invite', async ({
		browser,
		secondUserRef
	}) => {
		// Sign in without visiting an accept-invite page first
		const freshContext = await browser.newContext({
			baseURL: 'http://localhost:4173',
			storageState: { cookies: [], origins: [] }
		});
		const freshPage = await freshContext.newPage();
		await freshPage.goto('/signin');

		const signInPage = new SignInPage(freshPage);
		await signInPage.signIn(secondUserRef.email, secondUserRef.password);

		// Should redirect to the dashboard
		await freshPage.waitForURL('/', { timeout: 15_000 });

		await freshContext.close();
	});
});

// ---------------------------------------------------------------------------
// Workspaces — Member Management (with second user)
// ---------------------------------------------------------------------------
test.describe('Workspaces — Member Management', () => {
	let workspacesPage: WorkspacesPage;
	let memberEmail: string;

	test.beforeEach(async ({ page, browser, secondUserState, secondUserEmail }) => {
		workspacesPage = new WorkspacesPage(page);
		memberEmail = secondUserEmail;

		await workspacesPage.goto();
		await page.waitForLoadState('networkidle');

		// Skip the invite+accept flow if the second user is already a member
		// (e.g. from the "Accept Invitation Flow" test that ran earlier in this worker)
		if (await workspacesPage.isMemberVisible('E2E Second User')) {
			return;
		}

		const mailpit = new MailpitClient(process.env.MAILPIT_API_URL);
		const knownCount = await mailpit.countEmailsFor(memberEmail);

		await workspacesPage.inviteMember(memberEmail, 'Contributor');
		await expect(workspacesPage.dialog).not.toBeVisible({ timeout: 10_000 });
		await workspacesPage.expectSuccessToast(/invitation sent successfully/i);
		await workspacesPage.waitForToastHidden();

		const invitationToken = await mailpit.getInvitationToken(memberEmail, knownCount);

		const secondContext = await browser.newContext({
			baseURL: 'http://localhost:4173',
			storageState: secondUserState
		});
		const secondPage = await secondContext.newPage();
		await secondPage.goto(`/accept-invite/${invitationToken}`);
		await secondPage.waitForURL('/', { timeout: 15_000 });
		await secondContext.close();

		// Reload the workspace page to see the new member
		await workspacesPage.goto();
		await page.waitForLoadState('networkidle');
	});

	test('should change a member role', async () => {
		await workspacesPage.changeMemberRole('E2E Second User', 'Viewer');

		await workspacesPage.expectSuccessToast(/member role updated successfully/i);
	});

	test('should show confirmation dialog when removing a member', async () => {
		await workspacesPage.clickRemoveMember('E2E Second User');

		await expect(workspacesPage.confirmationDialog).toBeVisible();
		await expect(workspacesPage.confirmationDescription).toContainText('E2E Second User');
	});

	test('should remove a member successfully', async () => {
		await workspacesPage.removeMember('E2E Second User');

		await workspacesPage.expectSuccessToast(/member removed successfully/i);
		await expect(workspacesPage.getMemberRow('E2E Second User')).not.toBeVisible({
			timeout: 10_000
		});
	});
});
