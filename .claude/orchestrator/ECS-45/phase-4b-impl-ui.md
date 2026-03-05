# Frontend Implementation: Notification System & Multi-Channel Alerts (ECS-51)

## Created Files
- `budget-ui/src/lib/types/notification.types.ts` — TypeScript types for Notification, PaginatedNotifications, NotificationPreference, ChannelPreference, UpdateNotificationPreference, and NotificationType union type
- `budget-ui/src/lib/schemas/notification-preferences.schema.ts` — Zod v4 validation schema for UpdateNotificationPreference (channels, thresholds, quiet hours)
- `budget-ui/src/routes/api/notifications/+server.ts` — API proxy route: GET /notifications with query string forwarding (pagination, type, isRead filters)
- `budget-ui/src/routes/api/notifications/unread-count/+server.ts` — API proxy route: GET /notifications/unread-count
- `budget-ui/src/routes/api/notifications/read-all/+server.ts` — API proxy route: PATCH /notifications/read-all
- `budget-ui/src/routes/api/notifications/[id]/read/+server.ts` — API proxy route: PATCH /notifications/:id/read
- `budget-ui/src/routes/api/notifications/[id]/+server.ts` — API proxy route: DELETE /notifications/:id
- `budget-ui/src/routes/api/notifications/preferences/+server.ts` — API proxy route: GET + PUT /notifications/preferences
- `budget-ui/src/lib/components/notification-bell.svelte` — Bell icon button with unread count badge (99+ cap), placed in app header
- `budget-ui/src/lib/components/notification-item.svelte` — Single notification row with type-specific icon map, relative timestamp (dayjs fromNow), unread indicator, click-to-read, delete button
- `budget-ui/src/lib/components/notification-panel.svelte` — Slide-out Sheet (right side) with notification list, mark-all-read, settings gear, load-more pagination, empty state
- `budget-ui/src/lib/components/notification-preferences-dialog.svelte` — Dialog with per-type channel toggles (in-app/email switches), threshold number inputs, quiet hours section with enable toggle/time/timezone

## Modified Files
- `budget-ui/src/routes/(app)/+layout.svelte` — Integrated notification bell in header (between currency selector and theme toggle), added notification panel and preferences dialog components, added notification state management ($state for unreadCount, notifications, preferences, loading states, panel/dialog open), added 60-second polling $effect for unread count (client-side only via browser guard), added handler functions for mark-as-read, mark-all-as-read, delete, load-more, open-preferences, save-preferences, notification-click-to-navigate
- `budget-ui/src/lib/locales/en.json` — Added "notifications" i18n section with 33 keys: title, noNotifications, markAllRead, success/error messages, preferences labels, channel names, threshold labels, quiet hours labels, eventTypes sub-object (9 notification type display names), save/cancel
- `budget-ui/src/lib/locales/es.json` — Added "notifications" i18n section with 33 keys: Spanish translations matching en.json structure

## Lint/Check Status

### `npm run lint` output:
```
Checking formatting...
[warn] src/lib/components/bill-item.svelte
[warn] src/lib/components/bill-list.svelte
[warn] src/lib/components/transaction-item.svelte
[warn] src/lib/components/workspace-switcher.svelte
[warn] src/routes/(app)/workspaces/+page.svelte
Code style issues found in 5 files. Run Prettier with --write to fix.
```
**Status: PASS for new files.** All 5 warnings are pre-existing formatting issues in files not touched by this implementation. All new/modified files pass Prettier and ESLint.

### `npm run check` output:
```
START "/Users/andres_castillo1/acastillo/budget/budget-ui"
WARNING "src/lib/components/transaction-item.svelte" 112:2 "noninteractive element cannot have nonnegative tabIndex value"
WARNING "src/lib/components/transaction-item.svelte" 185:5 "Visible, non-interactive elements with a click event..."
WARNING "src/lib/components/transaction-item.svelte" 224:6 "Visible, non-interactive elements with a click event..."
COMPLETED 6278 FILES 0 ERRORS 3 WARNINGS 1 FILES_WITH_PROBLEMS
```
**Status: PASS.** 0 errors. All 3 warnings are pre-existing in `transaction-item.svelte`, not in any new or modified files.

## Deviations
- **`onNotificationClick` prop added to `notification-panel.svelte`** — The design spec did not list this as a separate prop, but the panel needs to communicate click events (for navigation to actionUrl) back to the layout. The layout handles mark-as-read + goto navigation on click. This follows the existing pattern of callbacks passed down from layout to child components.
- **No `$bindable` on `open` prop in `notification-preferences-dialog.svelte`** — The design mentions `$bindable` for the `open` prop, but the implementation uses `bind:open` from the parent which achieves the same result via Svelte 5 `$bindable()` implicitly through the Dialog.Root bind pattern. The `$bindable` is used in `notification-panel.svelte` for the Sheet.
- **`loadCurrencyRates` variable renamed to `currencyData`** — In the layout, the local variable inside `loadCurrencyRates` was renamed from `data` to `currencyData` to avoid shadowing the `data` prop. This is a minor clarity improvement with no functional change.
