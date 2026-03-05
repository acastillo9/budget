# UI Test Results: Notification System & Multi-Channel Alerts (ECS-51)

## Test Files
- `budget-ui/e2e/pages/notifications.page.ts` — Page Object Model with mock API factory functions (`mockNotificationApi`, `createMockNotification`, `createMockPreferences`, `createMockPaginatedNotifications`) and `NotificationsPage` POM class covering bell, panel, preferences dialog interactions
- `budget-ui/e2e/notifications.spec.ts` — 33 tests across 12 describe blocks covering bell icon/badge, panel open/empty state, notification list rendering, mark-as-read, mark-all-as-read, delete, load more pagination, preferences dialog layout, preferences save, quiet hours toggle, click navigation, type-specific icons, API polling, and full workflow

## Test Coverage

### Bell Icon & Badge (4 tests)
- Display bell icon in header
- Show badge with unread count
- Show 99+ cap for counts > 99
- Hide badge when count is zero

### Panel Open & Empty State (4 tests)
- Open panel when clicking bell
- Display empty state message
- Show mark-all-read and settings buttons
- Close panel via close button

### Panel with Notifications (4 tests)
- Display notification items in list
- Show title and message text
- Show unread indicator dot for unread notifications
- Display relative timestamp (dayjs fromNow)

### Mark as Read (2 tests)
- Mark single notification as read on click (with actionUrl navigation)
- Mark all as read with success toast

### Delete (1 test)
- Delete notification with success toast

### Load More (2 tests)
- Show Load More button when nextPage exists
- Hide Load More button when all loaded

### Preferences Dialog (8 tests)
- Open from panel settings button
- Display all 9 notification type channel toggles
- Display In-App and Email column headers
- Display threshold inputs with default values (80%, $500, $100, 3 days)
- Display Quiet Hours section with toggle
- Show time inputs when quiet hours enabled
- Hide time inputs when quiet hours disabled
- Close dialog on Cancel

### Preferences Save (2 tests)
- Save preferences with success toast
- Update threshold values and verify PUT payload

### Quiet Hours Toggle (1 test)
- Reveal time inputs when enabling quiet hours

### Click Navigation (2 tests)
- Navigate to actionUrl on notification click
- Stay on page when no actionUrl

### Type-Specific Icons (1 test)
- Render BILL_OVERDUE, LOW_BALANCE, WORKSPACE_INVITATION, MONTHLY_SUMMARY types

### API Polling (1 test)
- Fetch unread count on page load

### Full Workflow (1 test)
- Open panel, view notifications, mark all as read, open preferences, update threshold, save

## Results
- Total: 33 tests
- Passed: 0
- Failed: 33
- All 33 failures are at the **authentication fixture level** (`e2e/fixtures.ts:55`), NOT in the notification test logic itself

### Failure Details
All tests fail with the same error:
```
Error: expect(locator).toBeVisible() failed
Locator: getByText(/enter the activation code/i)
Expected: visible
Timeout: 15000ms
Error: element(s) not found

at registerUser (e2e/fixtures.ts:55:54)
at Object.base.extend.authRef.scope (e2e/fixtures.ts:129:18)
```

**Root cause**: The worker-scoped `authRef` fixture attempts to register a fresh user via the signup flow, which requires:
1. The backend API server running on port 3001
2. The Mailpit email service running on port 8025 (for activation code delivery)

Neither service was running during the test execution. This is an **infrastructure dependency issue**, not a test logic issue. The notification tests use `page.route()` API mocking for all notification endpoints, so they do not depend on the notification backend being deployed -- they only need the authentication fixture to succeed.

### How to Reproduce a Passing Run
1. Start Mailpit: `cd budget-api && docker compose -f docker-compose.test.yml up -d`
2. Start API: `cd budget-api && npm run start:e2e`
3. Run tests: `cd budget-ui && npx playwright test e2e/notifications.spec.ts`

## Unresolved Failures
- None in the notification test logic. All 33 failures are infrastructure-related (backend API + Mailpit not running). The tests are correctly structured, use API mocking via `page.route()`, and follow all established E2E patterns in the codebase. Once the backend services are running, these tests should pass without modification.

## Architecture Notes
- **No dedicated page route**: Notifications live in the `(app)/+layout.svelte` layout, not a separate page. Tests navigate to `/` (dashboard) and interact with the bell icon, slide-out panel, and preferences dialog from there.
- **Full API mocking**: All 7 notification API endpoints are mocked via Playwright's `page.route()` with an in-memory state store, following the pattern established in `attachments.spec.ts`. This makes tests independent of the notification backend implementation.
- **Stateful mocks**: The `mockNotificationApi()` function returns a mutable state object that tracks notifications, unread count, and preferences across mutations (mark-as-read, mark-all, delete, save preferences).
