import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Notification sample data factories for mocking API responses.
 */
export function createMockNotification(overrides: Record<string, unknown> = {}) {
	const id = overrides.id ?? `mock-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
	return {
		id,
		type: 'BILL_DUE_SOON',
		title: 'Bill Due Soon',
		message: 'Your electricity bill is due in 3 days',
		isRead: false,
		data: {},
		actionUrl: '/bills',
		createdAt: new Date().toISOString(),
		...overrides
	};
}

export function createMockPaginatedNotifications(
	notifications: Record<string, unknown>[] = [],
	total?: number,
	nextPage: number | null = null
) {
	return {
		data: notifications,
		total: total ?? notifications.length,
		limit: 20,
		offset: 0,
		nextPage
	};
}

export function createMockPreferences(overrides: Record<string, unknown> = {}) {
	const types = [
		'BILL_OVERDUE',
		'BILL_DUE_SOON',
		'BUDGET_THRESHOLD',
		'BUDGET_EXCEEDED',
		'LOW_BALANCE',
		'LARGE_TRANSACTION',
		'RECURRING_BILL_ENDING',
		'WORKSPACE_INVITATION',
		'MONTHLY_SUMMARY'
	];
	const channels: Record<string, { inApp: boolean; email: boolean }> = {};
	for (const t of types) {
		channels[t] = { inApp: true, email: t !== 'MONTHLY_SUMMARY' };
	}
	return {
		id: 'mock-pref-1',
		channels,
		budgetThresholdPercent: 80,
		largeTransactionAmount: 500,
		lowBalanceAmount: 100,
		billDueSoonDays: 3,
		quietHoursEnabled: false,
		quietHoursStart: '22:00',
		quietHoursEnd: '08:00',
		quietHoursTimezone: 'UTC',
		...overrides
	};
}

/**
 * Setup mock API routes for the notification system.
 * Call this BEFORE navigating to any page.
 */
export async function mockNotificationApi(
	page: Page,
	options: {
		notifications?: Record<string, unknown>[];
		unreadCount?: number;
		preferences?: Record<string, unknown>;
		nextPage?: number | null;
	} = {}
) {
	const notifications = options.notifications ?? [];
	const unreadCount = options.unreadCount ?? notifications.filter((n) => !n.isRead).length;
	const preferences = options.preferences ?? createMockPreferences();
	const nextPage = options.nextPage ?? null;

	// Track state for mutations
	const state = {
		notifications: [...notifications],
		unreadCount,
		preferences: { ...preferences }
	};

	// GET /api/notifications/unread-count
	await page.route('**/api/notifications/unread-count', async (route, request) => {
		if (request.method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ count: state.unreadCount })
			});
		} else {
			await route.fallback();
		}
	});

	// GET /api/notifications (must be registered before more specific routes in some cases,
	// but Playwright matches by specificity, so we use URL matching carefully)
	await page.route('**/api/notifications?*', async (route, request) => {
		if (request.method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(
					createMockPaginatedNotifications(state.notifications, state.notifications.length, nextPage)
				)
			});
		} else {
			await route.fallback();
		}
	});

	// Also handle GET /api/notifications without query params
	await page.route(/\/api\/notifications$/, async (route, request) => {
		if (request.method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(
					createMockPaginatedNotifications(state.notifications, state.notifications.length, nextPage)
				)
			});
		} else {
			await route.fallback();
		}
	});

	// PATCH /api/notifications/read-all
	await page.route('**/api/notifications/read-all', async (route, request) => {
		if (request.method() === 'PATCH') {
			state.notifications = state.notifications.map((n) => ({
				...n,
				isRead: true,
				readAt: new Date().toISOString()
			}));
			state.unreadCount = 0;
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ modifiedCount: state.notifications.length })
			});
		} else {
			await route.fallback();
		}
	});

	// GET/PUT /api/notifications/preferences
	await page.route('**/api/notifications/preferences', async (route, request) => {
		if (request.method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(state.preferences)
			});
		} else if (request.method() === 'PUT') {
			const body = JSON.parse(request.postData() || '{}');
			state.preferences = { ...state.preferences, ...body };
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(state.preferences)
			});
		} else {
			await route.fallback();
		}
	});

	// PATCH /api/notifications/:id/read
	await page.route('**/api/notifications/*/read', async (route, request) => {
		if (request.method() === 'PATCH') {
			const url = new URL(request.url());
			const segments = url.pathname.split('/');
			const id = segments[3]; // ['', 'api', 'notifications', '{id}', 'read']
			const notification = state.notifications.find((n) => n.id === id);
			if (notification) {
				notification.isRead = true;
				notification.readAt = new Date().toISOString();
				if (state.unreadCount > 0) state.unreadCount--;
			}
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(notification || { id, isRead: true })
			});
		} else {
			await route.fallback();
		}
	});

	// DELETE /api/notifications/:id
	await page.route(/\/api\/notifications\/[^/]+$/, async (route, request) => {
		if (request.method() === 'DELETE') {
			const url = new URL(request.url());
			const segments = url.pathname.split('/');
			const id = segments[3];
			const notification = state.notifications.find((n) => n.id === id);
			if (notification && !notification.isRead && state.unreadCount > 0) {
				state.unreadCount--;
			}
			state.notifications = state.notifications.filter((n) => n.id !== id);
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(notification || { id })
			});
		} else {
			await route.fallback();
		}
	});

	return state;
}

/**
 * Page Object for Notification components that live in the app layout.
 * Since notifications are not a separate page, this POM operates on any
 * authenticated (app) page (typically the dashboard at "/").
 */
export class NotificationsPage {
	readonly page: Page;

	// Notification Bell
	readonly bellButton: Locator;
	readonly bellBadge: Locator;

	// Notification Panel (Sheet)
	readonly panel: Locator;
	readonly panelTitle: Locator;
	readonly markAllReadButton: Locator;
	readonly settingsButton: Locator;
	readonly emptyState: Locator;
	readonly loadMoreButton: Locator;
	readonly loadingSpinner: Locator;

	// Preferences Dialog
	readonly preferencesDialog: Locator;
	readonly preferencesTitle: Locator;
	readonly preferencesDescription: Locator;
	readonly savePreferencesButton: Locator;
	readonly cancelPreferencesButton: Locator;

	// Threshold inputs
	readonly budgetThresholdInput: Locator;
	readonly largeTransactionInput: Locator;
	readonly lowBalanceInput: Locator;
	readonly billDueSoonInput: Locator;

	// Quiet hours
	readonly quietHoursSwitch: Locator;
	readonly quietHoursStartInput: Locator;
	readonly quietHoursEndInput: Locator;
	readonly quietHoursTimezoneInput: Locator;

	// Toast
	readonly toast: Locator;

	constructor(page: Page) {
		this.page = page;

		// Bell button — identified by aria-label "Notifications"
		this.bellButton = page.getByRole('button', { name: /notifications/i }).first();
		this.bellBadge = this.bellButton.locator('span.bg-destructive');

		// Panel — the Sheet renders as a dialog-like element
		// The Sheet content is the right-side panel
		this.panel = page.locator('[data-slot="sheet-content"]');
		this.panelTitle = this.panel.locator('[data-slot="sheet-title"]');
		this.markAllReadButton = page.getByRole('button', { name: /mark all as read/i });
		this.settingsButton = page.getByRole('button', { name: /notification preferences/i });
		this.emptyState = this.panel.getByText(/no notifications yet/i);
		this.loadMoreButton = this.panel.getByRole('button', { name: /load more/i });
		this.loadingSpinner = this.panel.locator('.animate-spin');

		// Preferences dialog
		this.preferencesDialog = page.getByRole('dialog', { name: /notification preferences/i });
		this.preferencesTitle = this.preferencesDialog.locator('[data-slot="dialog-title"]');
		this.preferencesDescription = this.preferencesDialog.getByText(
			/customize how and when you receive notifications/i
		);
		this.savePreferencesButton = this.preferencesDialog.getByRole('button', {
			name: /save preferences/i
		});
		this.cancelPreferencesButton = this.preferencesDialog.getByRole('button', {
			name: /cancel/i
		});

		// Threshold inputs
		this.budgetThresholdInput = page.getByLabel(/budget alert threshold/i);
		this.largeTransactionInput = page.getByLabel(/large transaction amount/i);
		this.lowBalanceInput = page.getByLabel(/low balance amount/i);
		this.billDueSoonInput = page.getByLabel(/days before due date/i);

		// Quiet hours
		this.quietHoursSwitch = this.preferencesDialog
			.getByText(/enable quiet hours/i)
			.locator('xpath=..')
			.getByRole('switch');
		this.quietHoursStartInput = page.getByLabel(/start time/i);
		this.quietHoursEndInput = page.getByLabel(/end time/i);
		this.quietHoursTimezoneInput = page.getByLabel(/timezone/i);

		// Toast
		this.toast = page.locator('[data-sonner-toast]');
	}

	async goto() {
		await this.page.goto('/');
	}

	// ---------------------------------------------------------------------------
	// Bell interactions
	// ---------------------------------------------------------------------------

	async openPanel() {
		await this.bellButton.click();
		await expect(this.panel).toBeVisible({ timeout: 10_000 });
	}

	async closePanel() {
		// Click outside or the close button
		const closeButton = this.panel.getByRole('button', { name: /close/i });
		await closeButton.click();
		await expect(this.panel).not.toBeVisible({ timeout: 10_000 });
	}

	// ---------------------------------------------------------------------------
	// Panel interactions
	// ---------------------------------------------------------------------------

	async clickMarkAllAsRead() {
		await this.markAllReadButton.click();
	}

	async clickSettings() {
		await this.settingsButton.click();
		await expect(this.preferencesDialog).toBeVisible({ timeout: 10_000 });
	}

	async clickLoadMore() {
		await this.loadMoreButton.click();
	}

	getNotificationItem(title: string): Locator {
		return this.panel.locator('div.cursor-pointer', { hasText: title });
	}

	getNotificationDeleteButton(title: string): Locator {
		return this.getNotificationItem(title).getByRole('button');
	}

	async clickNotification(title: string) {
		await this.getNotificationItem(title).click();
	}

	async deleteNotification(title: string) {
		// Hover to make the delete button visible, then click it
		const item = this.getNotificationItem(title);
		await item.hover();
		await this.getNotificationDeleteButton(title).click();
	}

	// ---------------------------------------------------------------------------
	// Preferences dialog interactions
	// ---------------------------------------------------------------------------

	async openPreferencesFromPanel() {
		await this.clickSettings();
	}

	async savePreferences() {
		await this.savePreferencesButton.click();
	}

	async cancelPreferences() {
		await this.cancelPreferencesButton.click();
	}

	async fillThreshold(field: 'budget' | 'largeTransaction' | 'lowBalance' | 'billDueSoon', value: string) {
		const input =
			field === 'budget'
				? this.budgetThresholdInput
				: field === 'largeTransaction'
					? this.largeTransactionInput
					: field === 'lowBalance'
						? this.lowBalanceInput
						: this.billDueSoonInput;
		await input.fill(value);
	}

	async toggleQuietHours() {
		await this.quietHoursSwitch.click();
	}

	// ---------------------------------------------------------------------------
	// Toast assertions
	// ---------------------------------------------------------------------------

	async expectSuccessToast(textPattern?: RegExp) {
		const loc = textPattern
			? this.page.locator('[data-sonner-toast]', { hasText: textPattern })
			: this.toast;
		await expect(loc).toBeVisible({ timeout: 10_000 });
	}

	async expectErrorToast(textPattern?: RegExp) {
		const loc = textPattern
			? this.page.locator('[data-sonner-toast]', { hasText: textPattern })
			: this.toast;
		await expect(loc).toBeVisible({ timeout: 10_000 });
	}
}
