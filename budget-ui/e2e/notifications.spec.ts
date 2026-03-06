import { test, expect } from './fixtures';
import {
	NotificationsPage,
	mockNotificationApi,
	createMockNotification,
	createMockPreferences
} from './pages/notifications.page';

// ---------------------------------------------------------------------------
// Notifications — Bell Icon & Badge
// ---------------------------------------------------------------------------
test.describe('Notifications — Bell Icon & Badge', () => {
	test.setTimeout(30_000);

	test('should display the notification bell icon in the header', async ({ page }) => {
		await mockNotificationApi(page, { unreadCount: 0 });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await expect(notificationsPage.bellButton).toBeVisible();
	});

	test('should show badge with unread count when there are unread notifications', async ({
		page
	}) => {
		await mockNotificationApi(page, { unreadCount: 5 });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await expect(notificationsPage.bellBadge).toBeVisible({ timeout: 10_000 });
		await expect(notificationsPage.bellBadge).toHaveText('5');
	});

	test('should show 99+ when unread count exceeds 99', async ({ page }) => {
		await mockNotificationApi(page, { unreadCount: 150 });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await expect(notificationsPage.bellBadge).toBeVisible({ timeout: 10_000 });
		await expect(notificationsPage.bellBadge).toHaveText('99+');
	});

	test('should not show badge when unread count is zero', async ({ page }) => {
		await mockNotificationApi(page, { unreadCount: 0 });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		// Wait for the polling to fire and update the badge
		await page.waitForLoadState('networkidle');
		await expect(notificationsPage.bellBadge).not.toBeVisible({ timeout: 10_000 });
	});
});

// ---------------------------------------------------------------------------
// Notifications — Panel Open & Empty State
// ---------------------------------------------------------------------------
test.describe('Notifications — Panel Open & Empty State', () => {
	test.setTimeout(30_000);

	test('should open the notification panel when clicking the bell', async ({ page }) => {
		await mockNotificationApi(page, { notifications: [] });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await expect(notificationsPage.panelTitle).toHaveText(/notifications/i);
	});

	test('should display empty state when there are no notifications', async ({ page }) => {
		await mockNotificationApi(page, { notifications: [] });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await expect(notificationsPage.emptyState).toBeVisible({ timeout: 10_000 });
	});

	test('should show mark-all-read and settings buttons in the panel header', async ({
		page
	}) => {
		await mockNotificationApi(page, { notifications: [] });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await expect(notificationsPage.markAllReadButton).toBeVisible();
		await expect(notificationsPage.settingsButton).toBeVisible();
	});

	test('should close the panel when clicking the close button', async ({ page }) => {
		await mockNotificationApi(page, { notifications: [] });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await expect(notificationsPage.panel).toBeVisible();

		await notificationsPage.closePanel();
	});
});

// ---------------------------------------------------------------------------
// Notifications — Panel with Notifications List
// ---------------------------------------------------------------------------
test.describe('Notifications — Panel with Notifications', () => {
	test.setTimeout(30_000);

	const mockNotifications = [
		createMockNotification({
			id: 'notif-1',
			type: 'BILL_DUE_SOON',
			title: 'Bill Due Soon',
			message: 'Electricity bill is due in 3 days',
			isRead: false,
			actionUrl: '/bills'
		}),
		createMockNotification({
			id: 'notif-2',
			type: 'BUDGET_EXCEEDED',
			title: 'Budget Exceeded',
			message: 'Your dining budget has been exceeded',
			isRead: false
		}),
		createMockNotification({
			id: 'notif-3',
			type: 'LARGE_TRANSACTION',
			title: 'Large Transaction',
			message: 'A transaction of $1,200 was recorded',
			isRead: true
		})
	];

	test('should display notification items in the panel', async ({ page }) => {
		await mockNotificationApi(page, { notifications: mockNotifications });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();

		await expect(notificationsPage.getNotificationItem('Bill Due Soon')).toBeVisible({
			timeout: 10_000
		});
		await expect(notificationsPage.getNotificationItem('Budget Exceeded')).toBeVisible({
			timeout: 10_000
		});
		await expect(notificationsPage.getNotificationItem('Large Transaction')).toBeVisible({
			timeout: 10_000
		});
	});

	test('should display notification title and message text', async ({ page }) => {
		await mockNotificationApi(page, { notifications: mockNotifications });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();

		const item = notificationsPage.getNotificationItem('Bill Due Soon');
		await expect(item).toBeVisible({ timeout: 10_000 });
		await expect(item.getByText(/electricity bill is due/i)).toBeVisible();
	});

	test('should show unread indicator for unread notifications', async ({ page }) => {
		await mockNotificationApi(page, { notifications: mockNotifications });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();

		// Unread notifications (notif-1, notif-2) have a bg-accent/50 style
		const unreadItem = notificationsPage.getNotificationItem('Bill Due Soon');
		await expect(unreadItem).toBeVisible({ timeout: 10_000 });
		// Unread items have a dot indicator (span with bg-primary class)
		await expect(unreadItem.locator('span.bg-primary.rounded-full')).toBeVisible();

		// Read notification (notif-3) should have opacity-70
		const readItem = notificationsPage.getNotificationItem('Large Transaction');
		await expect(readItem).toBeVisible({ timeout: 10_000 });
		await expect(readItem.locator('span.bg-primary.rounded-full')).not.toBeVisible();
	});

	test('should display relative timestamp for notifications', async ({ page }) => {
		await mockNotificationApi(page, { notifications: mockNotifications });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();

		const item = notificationsPage.getNotificationItem('Bill Due Soon');
		await expect(item).toBeVisible({ timeout: 10_000 });
		// dayjs fromNow() should produce something like "a few seconds ago"
		await expect(item.getByText(/seconds? ago|just now|a few seconds/i)).toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Notifications — Mark as Read
// ---------------------------------------------------------------------------
test.describe('Notifications — Mark as Read', () => {
	test.setTimeout(30_000);

	test('should mark a single notification as read when clicked', async ({ page }) => {
		const notifications = [
			createMockNotification({
				id: 'notif-read-1',
				title: 'Bill Due Soon',
				message: 'Electricity bill is due in 3 days',
				isRead: false,
				actionUrl: '/bills'
			})
		];
		await mockNotificationApi(page, { notifications, unreadCount: 1 });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		// Verify badge shows 1
		await expect(notificationsPage.bellBadge).toBeVisible({ timeout: 10_000 });
		await expect(notificationsPage.bellBadge).toHaveText('1');

		// Open panel and click the notification
		await notificationsPage.openPanel();
		await notificationsPage.clickNotification('Bill Due Soon');

		// The notification has actionUrl, so the panel should close and navigate
		await expect(page).toHaveURL(/\/bills/, { timeout: 10_000 });
	});

	test('should mark all notifications as read and show success toast', async ({ page }) => {
		const notifications = [
			createMockNotification({
				id: 'notif-all-1',
				title: 'Bill Due Soon',
				isRead: false
			}),
			createMockNotification({
				id: 'notif-all-2',
				title: 'Budget Exceeded',
				isRead: false
			})
		];
		await mockNotificationApi(page, { notifications, unreadCount: 2 });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await notificationsPage.clickMarkAllAsRead();

		await notificationsPage.expectSuccessToast(/all notifications marked as read/i);
	});
});

// ---------------------------------------------------------------------------
// Notifications — Delete
// ---------------------------------------------------------------------------
test.describe('Notifications — Delete', () => {
	test.setTimeout(30_000);

	test('should delete a notification and show success toast', async ({ page }) => {
		const notifications = [
			createMockNotification({
				id: 'notif-del-1',
				title: 'Old Notification',
				message: 'This should be deleted',
				isRead: true
			}),
			createMockNotification({
				id: 'notif-del-2',
				title: 'Keep This One',
				message: 'This should remain',
				isRead: false
			})
		];
		await mockNotificationApi(page, { notifications, unreadCount: 1 });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await expect(notificationsPage.getNotificationItem('Old Notification')).toBeVisible({
			timeout: 10_000
		});

		await notificationsPage.deleteNotification('Old Notification');

		await notificationsPage.expectSuccessToast(/notification deleted/i);
	});
});

// ---------------------------------------------------------------------------
// Notifications — Load More
// ---------------------------------------------------------------------------
test.describe('Notifications — Load More', () => {
	test.setTimeout(30_000);

	test('should show Load More button when there are more notifications', async ({ page }) => {
		const notifications = Array.from({ length: 20 }, (_, i) =>
			createMockNotification({
				id: `notif-page-${i}`,
				title: `Notification ${i + 1}`,
				message: `Message for notification ${i + 1}`,
				isRead: i % 2 === 0
			})
		);
		await mockNotificationApi(page, { notifications, nextPage: 20 });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();

		await expect(notificationsPage.loadMoreButton).toBeVisible({ timeout: 10_000 });
	});

	test('should not show Load More button when all notifications are loaded', async ({
		page
	}) => {
		const notifications = [
			createMockNotification({
				id: 'notif-nomore-1',
				title: 'Only Notification'
			})
		];
		await mockNotificationApi(page, { notifications, nextPage: null });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();

		await expect(notificationsPage.getNotificationItem('Only Notification')).toBeVisible({
			timeout: 10_000
		});
		await expect(notificationsPage.loadMoreButton).not.toBeVisible();
	});
});

// ---------------------------------------------------------------------------
// Notifications — Preferences Dialog Open & Layout
// ---------------------------------------------------------------------------
test.describe('Notifications — Preferences Dialog', () => {
	test.setTimeout(30_000);

	test('should open preferences dialog from the panel settings button', async ({ page }) => {
		await mockNotificationApi(page, { notifications: [] });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await notificationsPage.clickSettings();

		await expect(notificationsPage.preferencesDialog).toBeVisible({ timeout: 10_000 });
		await expect(notificationsPage.preferencesTitle).toHaveText(/notification preferences/i);
		await expect(notificationsPage.preferencesDescription).toBeVisible();
	});

	test('should display channel toggles for all notification types', async ({ page }) => {
		await mockNotificationApi(page, { notifications: [] });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await notificationsPage.clickSettings();

		// Verify all 9 notification type labels are visible
		const typeLabels = [
			'Bill Overdue',
			'Bill Due Soon',
			'Budget Threshold Reached',
			'Budget Exceeded',
			'Low Account Balance',
			'Large Transaction',
			'Recurring Bill Ending',
			'Workspace Invitation',
			'Monthly Summary'
		];

		for (const label of typeLabels) {
			await expect(
				notificationsPage.preferencesDialog.getByText(label, { exact: true })
			).toBeVisible({ timeout: 10_000 });
		}
	});

	test('should display In-App and Email column headers', async ({ page }) => {
		await mockNotificationApi(page, { notifications: [] });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await notificationsPage.clickSettings();

		await expect(notificationsPage.preferencesDialog.getByText('In-App')).toBeVisible({
			timeout: 10_000
		});
		await expect(
			notificationsPage.preferencesDialog.getByText('Email', { exact: true })
		).toBeVisible({
			timeout: 10_000
		});
	});

	test('should display threshold input fields with default values', async ({ page }) => {
		await mockNotificationApi(page, { notifications: [] });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await notificationsPage.clickSettings();

		await expect(notificationsPage.budgetThresholdInput).toBeVisible({ timeout: 10_000 });
		await expect(notificationsPage.budgetThresholdInput).toHaveValue('80');
		// Default selected currency is COP (first in list)
		await expect(notificationsPage.getLargeTransactionInput('COP')).toHaveValue('2000000');
		await expect(notificationsPage.getLowBalanceInput('COP')).toHaveValue('500000');
		await expect(notificationsPage.billDueSoonInput).toHaveValue('3');

		// Switch to USD and verify its values
		await notificationsPage.selectCurrency('USD');
		await expect(notificationsPage.getLargeTransactionInput('USD')).toHaveValue('500');
		await expect(notificationsPage.getLowBalanceInput('USD')).toHaveValue('100');
	});

	test('should display Quiet Hours section with toggle', async ({ page }) => {
		await mockNotificationApi(page, { notifications: [] });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await notificationsPage.clickSettings();

		await expect(
			notificationsPage.preferencesDialog.getByText(/quiet hours/i).first()
		).toBeVisible({ timeout: 10_000 });
		await expect(notificationsPage.quietHoursSwitch).toBeVisible();
	});

	test('should show time inputs when quiet hours is enabled', async ({ page }) => {
		const prefs = createMockPreferences({ quietHoursEnabled: true });
		await mockNotificationApi(page, { notifications: [], preferences: prefs });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await notificationsPage.clickSettings();

		await expect(notificationsPage.quietHoursStartInput).toBeVisible({ timeout: 10_000 });
		await expect(notificationsPage.quietHoursEndInput).toBeVisible({ timeout: 10_000 });
		await expect(notificationsPage.quietHoursTimezoneInput).toBeVisible({ timeout: 10_000 });
	});

	test('should hide time inputs when quiet hours is disabled', async ({ page }) => {
		const prefs = createMockPreferences({ quietHoursEnabled: false });
		await mockNotificationApi(page, { notifications: [], preferences: prefs });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await notificationsPage.clickSettings();

		await expect(notificationsPage.quietHoursSwitch).toBeVisible({ timeout: 10_000 });
		await expect(notificationsPage.quietHoursStartInput).not.toBeVisible();
		await expect(notificationsPage.quietHoursEndInput).not.toBeVisible();
	});

	test('should close the preferences dialog when clicking Cancel', async ({ page }) => {
		await mockNotificationApi(page, { notifications: [] });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await notificationsPage.clickSettings();
		await expect(notificationsPage.preferencesDialog).toBeVisible({ timeout: 10_000 });

		await notificationsPage.cancelPreferences();
		await expect(notificationsPage.preferencesDialog).not.toBeVisible({ timeout: 10_000 });
	});
});

// ---------------------------------------------------------------------------
// Notifications — Preferences Save
// ---------------------------------------------------------------------------
test.describe('Notifications — Preferences Save', () => {
	test.setTimeout(30_000);

	test('should save preferences and show success toast', async ({ page }) => {
		await mockNotificationApi(page, { notifications: [] });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await notificationsPage.clickSettings();

		// Update a threshold value
		await notificationsPage.fillThreshold('budget', '90');

		// Save
		await notificationsPage.savePreferences();

		await notificationsPage.expectSuccessToast(/notification preferences saved/i);
		await expect(notificationsPage.preferencesDialog).not.toBeVisible({ timeout: 10_000 });
	});

	test('should update threshold values and save them', async ({ page }) => {
		const state = await mockNotificationApi(page, { notifications: [] });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await notificationsPage.clickSettings();

		// Update all thresholds — select USD first for currency-specific fields
		await notificationsPage.fillThreshold('budget', '75');
		await notificationsPage.selectCurrency('USD');
		await notificationsPage.fillThreshold('largeTransaction', '1000', 'USD');
		await notificationsPage.fillThreshold('lowBalance', '200', 'USD');
		await notificationsPage.fillThreshold('billDueSoon', '7');

		// Intercept the PUT request to verify the payload
		const putRequest = page.waitForRequest(
			(req) =>
				req.url().includes('/api/notifications/preferences') && req.method() === 'PUT'
		);

		await notificationsPage.savePreferences();

		const req = await putRequest;
		const body = JSON.parse(req.postData() || '{}');
		expect(body.budgetThresholdPercent).toBe(75);
		expect(body.largeTransactionAmounts.USD).toBe(1000);
		expect(body.lowBalanceAmounts.USD).toBe(200);
		expect(body.billDueSoonDays).toBe(7);

		await notificationsPage.expectSuccessToast(/notification preferences saved/i);
	});
});

// ---------------------------------------------------------------------------
// Notifications — Quiet Hours Toggle
// ---------------------------------------------------------------------------
test.describe('Notifications — Quiet Hours Toggle', () => {
	test.setTimeout(30_000);

	test('should reveal time inputs when enabling quiet hours', async ({ page }) => {
		const prefs = createMockPreferences({ quietHoursEnabled: false });
		await mockNotificationApi(page, { notifications: [], preferences: prefs });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await notificationsPage.clickSettings();

		// Quiet hours disabled, time inputs should not be visible
		await expect(notificationsPage.quietHoursStartInput).not.toBeVisible();

		// Toggle quiet hours on
		await notificationsPage.toggleQuietHours();

		// Time inputs should now appear
		await expect(notificationsPage.quietHoursStartInput).toBeVisible({ timeout: 10_000 });
		await expect(notificationsPage.quietHoursEndInput).toBeVisible({ timeout: 10_000 });
		await expect(notificationsPage.quietHoursTimezoneInput).toBeVisible({ timeout: 10_000 });
	});
});

// ---------------------------------------------------------------------------
// Notifications — Notification Click Navigation
// ---------------------------------------------------------------------------
test.describe('Notifications — Click Navigation', () => {
	test.setTimeout(30_000);

	test('should navigate to actionUrl when clicking a notification with actionUrl', async ({
		page
	}) => {
		const notifications = [
			createMockNotification({
				id: 'nav-notif-1',
				title: 'Bill Due Soon',
				message: 'Navigate to bills',
				isRead: false,
				actionUrl: '/bills'
			})
		];
		await mockNotificationApi(page, { notifications, unreadCount: 1 });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await notificationsPage.clickNotification('Bill Due Soon');

		await expect(page).toHaveURL(/\/bills/, { timeout: 10_000 });
	});

	test('should not navigate when clicking a notification without actionUrl', async ({
		page
	}) => {
		const notifications = [
			createMockNotification({
				id: 'nav-notif-2',
				title: 'Simple Alert',
				message: 'No navigation',
				isRead: false,
				actionUrl: undefined
			})
		];
		await mockNotificationApi(page, { notifications, unreadCount: 1 });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();
		await notificationsPage.clickNotification('Simple Alert');

		// Should stay on the current page (dashboard)
		await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/, { timeout: 5_000 });
	});
});

// ---------------------------------------------------------------------------
// Notifications — Type-Specific Icons
// ---------------------------------------------------------------------------
test.describe('Notifications — Type-Specific Icons', () => {
	test.setTimeout(30_000);

	test('should display different notification types with their content', async ({ page }) => {
		const notifications = [
			createMockNotification({
				id: 'icon-1',
				type: 'BILL_OVERDUE',
				title: 'Overdue Bill',
				message: 'Rent is overdue'
			}),
			createMockNotification({
				id: 'icon-2',
				type: 'LOW_BALANCE',
				title: 'Low Balance Alert',
				message: 'Checking account below $100'
			}),
			createMockNotification({
				id: 'icon-3',
				type: 'WORKSPACE_INVITATION',
				title: 'Workspace Invite',
				message: 'You were invited to a workspace'
			}),
			createMockNotification({
				id: 'icon-4',
				type: 'MONTHLY_SUMMARY',
				title: 'Monthly Summary',
				message: 'Your February spending summary',
				isRead: true
			})
		];
		await mockNotificationApi(page, { notifications });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		await notificationsPage.openPanel();

		// Verify each notification type renders
		await expect(notificationsPage.getNotificationItem('Overdue Bill')).toBeVisible({
			timeout: 10_000
		});
		await expect(notificationsPage.getNotificationItem('Low Balance Alert')).toBeVisible({
			timeout: 10_000
		});
		await expect(notificationsPage.getNotificationItem('Workspace Invite')).toBeVisible({
			timeout: 10_000
		});
		await expect(notificationsPage.getNotificationItem('Monthly Summary')).toBeVisible({
			timeout: 10_000
		});
	});
});

// ---------------------------------------------------------------------------
// Notifications — API Polling
// ---------------------------------------------------------------------------
test.describe('Notifications — API Polling', () => {
	test.setTimeout(30_000);

	test('should fetch unread count on page load', async ({ page }) => {
		let fetchCount = 0;
		await page.route('**/api/notifications/unread-count', async (route, request) => {
			if (request.method() === 'GET') {
				fetchCount++;
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ count: 3 })
				});
			} else {
				await route.continue();
			}
		});

		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		// Should have fetched at least once
		expect(fetchCount).toBeGreaterThanOrEqual(1);

		// Badge should show the count
		await expect(notificationsPage.bellBadge).toBeVisible({ timeout: 10_000 });
		await expect(notificationsPage.bellBadge).toHaveText('3');
	});
});

// ---------------------------------------------------------------------------
// Notifications — Full Workflow
// ---------------------------------------------------------------------------
test.describe('Notifications — Full Workflow', () => {
	test.setTimeout(60_000);

	test('should open panel, view notifications, mark all as read, open preferences, and save', async ({
		page
	}) => {
		const notifications = [
			createMockNotification({
				id: 'flow-1',
				type: 'BILL_DUE_SOON',
				title: 'Bill Due Soon',
				message: 'Electric bill due in 2 days',
				isRead: false
			}),
			createMockNotification({
				id: 'flow-2',
				type: 'BUDGET_THRESHOLD',
				title: 'Budget Alert',
				message: 'Dining budget at 85%',
				isRead: false
			})
		];
		await mockNotificationApi(page, { notifications, unreadCount: 2 });
		const notificationsPage = new NotificationsPage(page);
		await notificationsPage.goto();
		await page.waitForLoadState('networkidle');

		// 1. Verify badge shows 2 unread
		await expect(notificationsPage.bellBadge).toBeVisible({ timeout: 10_000 });
		await expect(notificationsPage.bellBadge).toHaveText('2');

		// 2. Open panel and verify notifications
		await notificationsPage.openPanel();
		await expect(notificationsPage.getNotificationItem('Bill Due Soon')).toBeVisible({
			timeout: 10_000
		});
		await expect(notificationsPage.getNotificationItem('Budget Alert')).toBeVisible({
			timeout: 10_000
		});

		// 3. Mark all as read
		await notificationsPage.clickMarkAllAsRead();
		await notificationsPage.expectSuccessToast(/all notifications marked as read/i);
		await notificationsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

		// 4. Open preferences
		await notificationsPage.clickSettings();
		await expect(notificationsPage.preferencesDialog).toBeVisible({ timeout: 10_000 });

		// 5. Update a threshold and save
		await notificationsPage.fillThreshold('budget', '90');
		await notificationsPage.savePreferences();
		await notificationsPage.expectSuccessToast(/notification preferences saved/i);
	});
});
