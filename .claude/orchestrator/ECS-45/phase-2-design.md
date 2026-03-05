# Design: Notification System & Multi-Channel Alerts (ECS-45)

## Overview

This epic adds a comprehensive notification system to the Budget application, transforming it from a reactive tool into a proactive financial assistant. The system introduces two new MongoDB collections (`Notification`, `NotificationPreference`), a new `NotificationsModule` in the API with a strategy-based channel dispatcher (in-app + email), event-driven triggers via `@nestjs/event-emitter`, scheduled jobs via `@nestjs/schedule`, and a frontend notification UI consisting of a bell icon in the app header, a slide-out Sheet panel, and a preferences dialog. The architecture follows the existing monorepo conventions: NestJS controller/service/entity/DTO patterns on the backend, SvelteKit page/server-load/proxy-route patterns on the frontend, and i18n support in both English and Spanish.

---

## API Changes

### New/Modified Modules

| Module | Purpose | File Path | Status |
|--------|---------|-----------|--------|
| `NotificationsModule` | Core notification CRUD, channels, dispatcher, event handlers, scheduled jobs | `budget-api/src/notifications/notifications.module.ts` | New |
| `AppModule` | Register `NotificationsModule`, `EventEmitterModule.forRoot()`, `ScheduleModule.forRoot()` | `budget-api/src/app.module.ts` | Modified |
| `TransactionsModule` | Emit domain events after transaction create/update/delete | `budget-api/src/transactions/transactions.module.ts` | Modified (import EventEmitterModule) |
| `BillsModule` | No direct modification (bills scanned via scheduled job accessing Bill model) | `budget-api/src/bills/bills.module.ts` | Unchanged |
| `WorkspacesModule` | Emit `workspace.invitation.created` event after invitation creation | `budget-api/src/workspaces/workspaces.module.ts` | Modified (import EventEmitterModule) |

### Endpoints

| Method | Path | Description | Auth | Request DTO | Response DTO |
|--------|------|-------------|------|-------------|--------------|
| `GET` | `/notifications` | List notifications for current user in workspace (paginated, filterable) | JWT + Workspace | `NotificationsQueryDto` (query) | `PaginatedDataDto<NotificationDto>` |
| `GET` | `/notifications/unread-count` | Get count of unread notifications | JWT + Workspace | - | `{ count: number }` |
| `PATCH` | `/notifications/:id/read` | Mark single notification as read | JWT + Workspace | - | `NotificationDto` |
| `PATCH` | `/notifications/read-all` | Mark all unread notifications as read | JWT + Workspace | - | `{ modifiedCount: number }` |
| `DELETE` | `/notifications/:id` | Delete a notification (owner only) | JWT + Workspace | - | `NotificationDto` |
| `GET` | `/notifications/preferences` | Get notification preferences (auto-creates defaults if none) | JWT + Workspace | - | `NotificationPreferenceDto` |
| `PUT` | `/notifications/preferences` | Update notification preferences (partial update) | JWT + Workspace | `UpdateNotificationPreferenceDto` | `NotificationPreferenceDto` |

### Entities/Schemas

#### `Notification` Entity

**File:** `budget-api/src/notifications/entities/notification.entity.ts`

```
Notification {
  type:        NotificationType (enum, required)       — event type identifier
  title:       String (required)                        — display title (pre-resolved from i18n)
  message:     String (required)                        — display message body
  isRead:      Boolean (default: false)                 — read status
  readAt:      Date (optional)                          — timestamp when marked as read
  data:        Object (optional, SchemaTypes.Mixed)     — event-specific payload (billId, budgetId, accountId, transactionId, etc.)
  actionUrl:   String (optional)                        — deep link path for navigation (e.g., "/bills", "/budgets")
  user:        ObjectId ref User (required)             — notification recipient
  workspace:   ObjectId ref Workspace (optional)        — workspace scope
  createdAt:   Date (auto, via AuditableSchema)
  updatedAt:   Date (auto, via AuditableSchema)
}

Indexes:
  - { user: 1, workspace: 1, createdAt: -1 }   — list query (sorted by newest)
  - { user: 1, workspace: 1, isRead: 1 }        — unread count query
  - { createdAt: 1 }                             — TTL cleanup query (expireAfterSeconds via scheduled job, not native TTL)
```

Schema extends `AuditableSchema` via `.add(AuditableSchema)`.

#### `NotificationType` Enum

**File:** `budget-api/src/notifications/entities/notification-type.enum.ts`

```typescript
export enum NotificationType {
  BILL_OVERDUE = 'BILL_OVERDUE',
  BILL_DUE_SOON = 'BILL_DUE_SOON',
  BUDGET_THRESHOLD = 'BUDGET_THRESHOLD',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  LOW_BALANCE = 'LOW_BALANCE',
  LARGE_TRANSACTION = 'LARGE_TRANSACTION',
  RECURRING_BILL_ENDING = 'RECURRING_BILL_ENDING',
  WORKSPACE_INVITATION = 'WORKSPACE_INVITATION',
  MONTHLY_SUMMARY = 'MONTHLY_SUMMARY',
}
```

#### `NotificationPreference` Entity

**File:** `budget-api/src/notifications/entities/notification-preference.entity.ts`

```
NotificationPreference {
  user:             ObjectId ref User (required)
  workspace:        ObjectId ref Workspace (optional)

  // Per-event channel toggles
  channels: {
    BILL_OVERDUE:             { inApp: Boolean (default: true), email: Boolean (default: true) }
    BILL_DUE_SOON:            { inApp: Boolean (default: true), email: Boolean (default: true) }
    BUDGET_THRESHOLD:         { inApp: Boolean (default: true), email: Boolean (default: true) }
    BUDGET_EXCEEDED:          { inApp: Boolean (default: true), email: Boolean (default: true) }
    LOW_BALANCE:              { inApp: Boolean (default: true), email: Boolean (default: true) }
    LARGE_TRANSACTION:        { inApp: Boolean (default: true), email: Boolean (default: false) }
    RECURRING_BILL_ENDING:    { inApp: Boolean (default: true), email: Boolean (default: true) }
    WORKSPACE_INVITATION:     { inApp: Boolean (default: true), email: Boolean (default: false) }
    MONTHLY_SUMMARY:          { inApp: Boolean (default: false), email: Boolean (default: true) }
  }

  // Thresholds
  budgetThresholdPercent:    Number (default: 80)       — trigger at this % of budget
  largeTransactionAmount:    Number (default: 500)      — flag transactions above this
  lowBalanceAmount:          Number (default: 100)      — flag accounts below this
  billDueSoonDays:           Number (default: 3)        — days before due date

  // Quiet hours (email only)
  quietHoursEnabled:         Boolean (default: false)
  quietHoursStart:           String (default: "22:00")  — HH:mm format
  quietHoursEnd:             String (default: "08:00")  — HH:mm format
  quietHoursTimezone:        String (default: "UTC")    — IANA timezone

  createdAt / updatedAt      (via AuditableSchema)
}

Indexes:
  - { user: 1, workspace: 1 } unique compound index
```

#### `NotificationLock` Entity

**File:** `budget-api/src/notifications/entities/notification-lock.entity.ts`

```
NotificationLock {
  jobName:    String (required, unique)     — cron job identifier
  lockedAt:   Date (required)               — when the lock was acquired
  lockedBy:   String (required)             — instance identifier (hostname or UUID)
  expiresAt:  Date (required)               — auto-release time (lock TTL)
}
```

Used for distributed lock to prevent concurrent cron job execution in multi-instance deployments.

### DTOs

#### Input DTOs

**`NotificationsQueryDto`** — `budget-api/src/notifications/dto/notifications-query.dto.ts`
```typescript
extends PaginationDto {
  type?:     NotificationType    // @IsOptional() @IsEnum(NotificationType)
  isRead?:   boolean             // @IsOptional() @Transform to boolean
}
```

**`CreateNotificationDto`** — `budget-api/src/notifications/dto/create-notification.dto.ts` (internal, not exposed via API)
```typescript
{
  type:       NotificationType   // @IsEnum
  title:      string             // @IsString @IsNotEmpty
  message:    string             // @IsString @IsNotEmpty
  data?:      Record<string, any>
  actionUrl?: string             // @IsOptional @IsString
  user:       string             // @IsMongoId
  workspace?: string             // @IsOptional @IsMongoId
}
```

**`UpdateNotificationPreferenceDto`** — `budget-api/src/notifications/dto/update-notification-preference.dto.ts`
```typescript
{
  channels?:                 Record<NotificationType, { inApp?: boolean, email?: boolean }>
  budgetThresholdPercent?:   number   // @IsOptional @IsNumber @Min(1) @Max(100)
  largeTransactionAmount?:   number   // @IsOptional @IsNumber @IsPositive
  lowBalanceAmount?:         number   // @IsOptional @IsNumber @Min(0)
  billDueSoonDays?:          number   // @IsOptional @IsNumber @Min(1) @Max(30)
  quietHoursEnabled?:        boolean  // @IsOptional @IsBoolean
  quietHoursStart?:          string   // @IsOptional @Matches(/^\d{2}:\d{2}$/)
  quietHoursEnd?:            string   // @IsOptional @Matches(/^\d{2}:\d{2}$/)
  quietHoursTimezone?:       string   // @IsOptional @IsString
}
```

#### Response DTOs

**`NotificationDto`** — `budget-api/src/notifications/dto/notification.dto.ts`
```typescript
@Exclude()
class NotificationDto {
  @Expose() id: string
  @Expose() type: NotificationType
  @Expose() title: string
  @Expose() message: string
  @Expose() isRead: boolean
  @Expose() readAt?: Date
  @Expose() data?: Record<string, any>
  @Expose() actionUrl?: string
  @Expose() createdAt: Date
}
```

**`NotificationPreferenceDto`** — `budget-api/src/notifications/dto/notification-preference.dto.ts`
```typescript
@Exclude()
class NotificationPreferenceDto {
  @Expose() id: string
  @Expose() channels: Record<NotificationType, { inApp: boolean, email: boolean }>
  @Expose() budgetThresholdPercent: number
  @Expose() largeTransactionAmount: number
  @Expose() lowBalanceAmount: number
  @Expose() billDueSoonDays: number
  @Expose() quietHoursEnabled: boolean
  @Expose() quietHoursStart: string
  @Expose() quietHoursEnd: string
  @Expose() quietHoursTimezone: string
}
```

### Services

#### `NotificationsService`

**File:** `budget-api/src/notifications/notifications.service.ts`

| Method | Input | Output | Business Logic |
|--------|-------|--------|----------------|
| `create(dto, userId, workspaceId)` | `CreateNotificationDto`, `string`, `string` | `NotificationDto` | Persist notification document, return DTO |
| `findAll(userId, workspaceId, query)` | `string`, `string`, `NotificationsQueryDto` | `PaginatedDataDto<NotificationDto>` | Filter by workspace + user, optional type/isRead filter, sort by `createdAt: -1`, paginate |
| `findUnreadCount(userId, workspaceId)` | `string`, `string` | `{ count: number }` | Count documents where `isRead: false` |
| `markAsRead(id, userId, workspaceId)` | `string`, `string`, `string` | `NotificationDto` | Set `isRead: true`, `readAt: new Date()` via `findOneAndUpdate` |
| `markAllAsRead(userId, workspaceId)` | `string`, `string` | `{ modifiedCount: number }` | `updateMany({ user, workspace, isRead: false }, { isRead: true, readAt: new Date() })` |
| `remove(id, userId, workspaceId)` | `string`, `string`, `string` | `NotificationDto` | `findOneAndDelete` with user ownership check |
| `getPreferences(userId, workspaceId)` | `string`, `string` | `NotificationPreferenceDto` | Find or create with defaults if none exist (`findOneAndUpdate` with `upsert: true, setOnInsert: defaults`) |
| `updatePreferences(userId, workspaceId, dto)` | `string`, `string`, `UpdateNotificationPreferenceDto` | `NotificationPreferenceDto` | Deep merge channels + flat update thresholds/quiet hours |
| `deleteOldNotifications(retentionDays)` | `number` | `{ deletedCount: number }` | Delete notifications older than retention period (called by cleanup job) |
| `findDuplicateKey(userId, workspaceId, type, deduplicationKey)` | `string`, `string`, `NotificationType`, `string` | `boolean` | Check if notification with same `data.deduplicationKey` exists within last 24h (prevents duplicate alerts) |

#### `NotificationDispatcher`

**File:** `budget-api/src/notifications/services/notification-dispatcher.service.ts`

| Method | Input | Output | Business Logic |
|--------|-------|--------|----------------|
| `dispatch(event)` | `NotificationEvent` | `void` | 1. Resolve user's preferences for workspace. 2. Check each channel enabled for event type. 3. Check quiet hours (skip email if in quiet hours). 4. Run deduplication check. 5. Dispatch to enabled channels (in-app via `InAppChannel`, email via `EmailChannel`). 6. Errors isolated per channel (one failure does not block others). |

`NotificationEvent` type:
```typescript
{
  type: NotificationType;
  userId: string;
  workspaceId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  emailTemplate?: string;       // Handlebars template name
  emailContext?: Record<string, any>;  // Template variables
  deduplicationKey?: string;    // Unique key per event instance (e.g., `bill_overdue_${billId}_${date}`)
}
```

#### Channel Strategies

**Interface:** `budget-api/src/notifications/channels/channel-strategy.interface.ts`
```typescript
export interface ChannelStrategy {
  send(event: NotificationEvent): Promise<void>;
}
```

**`InAppChannel`** — `budget-api/src/notifications/channels/in-app.channel.ts`
- Implements `ChannelStrategy`
- Calls `NotificationsService.create()` to persist the notification

**`EmailChannel`** — `budget-api/src/notifications/channels/email.channel.ts`
- Implements `ChannelStrategy`
- Calls `MailService.sendMail()` with `event.emailTemplate` and `event.emailContext`
- Requires user email (resolved from `UsersService.findById()`)

#### Event Handlers

**File:** `budget-api/src/notifications/handlers/`

| Handler Class | Listens To | Fires For |
|--------------|------------|-----------|
| `TransactionNotificationHandler` | `transaction.created` | Budget threshold/exceeded, large transaction, low balance |
| `BillNotificationHandler` | (none — uses scheduled scanning) | - |
| `WorkspaceNotificationHandler` | `workspace.invitation.created` | Workspace invitation (in-app for invited user) |

**Event payloads emitted from existing services:**

`TransactionsService.create()` emits after DB transaction commit:
```typescript
this.eventEmitter.emit('transaction.created', {
  transaction: savedTransaction,
  userId,
  workspaceId,
  accountId: transaction.account,
  categoryId: transaction.category,
  amount: transaction.amount,
});
```

`WorkspacesService.createInvitation()` emits after invitation saved:
```typescript
this.eventEmitter.emit('workspace.invitation.created', {
  invitation: savedInvitation,
  workspaceId,
  invitedUserId,     // resolved from email if user exists
  invitedByName,
});
```

#### Scheduled Jobs

**File:** `budget-api/src/notifications/jobs/`

| Job Class | Cron Schedule | Description |
|-----------|---------------|-------------|
| `BillScannerJob` | Daily at 08:00 UTC (configurable via `CRON_BILL_SCANNER`) | Scans all bills, generates instances, identifies overdue + due-soon + ending-soon bills, dispatches notifications |
| `BudgetCheckerJob` | Every 6 hours (configurable via `CRON_BUDGET_CHECKER`) | Computes budget progress for all budgets, dispatches threshold/exceeded notifications |
| `LowBalanceJob` | Daily at 09:00 UTC (configurable via `CRON_LOW_BALANCE`) | Scans all accounts per workspace, dispatches low balance notifications |
| `MonthlySummaryJob` | 1st of month at 10:00 UTC (configurable via `CRON_MONTHLY_SUMMARY`) | Aggregates monthly data (income, expenses, top categories, bill payments) per user/workspace, dispatches email-only notification |
| `NotificationCleanupJob` | Daily at 03:00 UTC (configurable via `CRON_NOTIFICATION_CLEANUP`) | Deletes notifications older than 90 days (configurable via `NOTIFICATION_RETENTION_DAYS`) |

Each job:
1. Acquires a distributed lock via `NotificationLock` collection (`findOneAndUpdate` with `upsert` + TTL check)
2. Executes business logic
3. Releases lock on completion
4. Logs execution metrics (items processed, notifications dispatched, duration)

### New Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `CRON_BILL_SCANNER` | `0 8 * * *` | Bill scanner schedule |
| `CRON_BUDGET_CHECKER` | `0 */6 * * *` | Budget checker schedule |
| `CRON_LOW_BALANCE` | `0 9 * * *` | Low balance scanner schedule |
| `CRON_MONTHLY_SUMMARY` | `0 10 1 * *` | Monthly summary schedule |
| `CRON_NOTIFICATION_CLEANUP` | `0 3 * * *` | Notification cleanup schedule |
| `NOTIFICATION_RETENTION_DAYS` | `90` | Days to retain notifications |

### New npm Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/event-emitter` | `^2.x` | Event bus for domain events |
| `@nestjs/schedule` | `^4.x` | Cron job scheduling |

---

## UI Changes

### New/Modified Routes

No new page routes. The notification system is integrated into the existing app layout (bell icon in header, Sheet panel overlay, preferences dialog).

### Components

#### `notification-bell.svelte` (New)

**File:** `budget-ui/src/lib/components/notification-bell.svelte`

**Purpose:** Bell icon button in the app header bar with unread count badge. Clicking opens the notification panel.

**Props interface:**
```typescript
{
  unreadCount: number;    // Unread notification count
  onclick: () => void;    // Handler to open notification panel
}
```

**Behavior:**
- Renders a `Bell` icon from `@lucide/svelte/icons/bell`
- Shows a red badge with `unreadCount` when > 0; hides badge when 0
- Badge uses absolute positioning on the icon button
- Button has `aria-label` for accessibility

#### `notification-panel.svelte` (New)

**File:** `budget-ui/src/lib/components/notification-panel.svelte`

**Purpose:** Slide-out Sheet (right side) displaying the notification list with actions.

**Props interface:**
```typescript
{
  open: boolean;                      // $bindable — sheet open state
  notifications: PaginatedNotifications;  // Paginated notification data
  loading: boolean;                    // Loading state
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onLoadMore: () => void;             // Load next page
  onOpenPreferences: () => void;      // Open preferences dialog
}
```

**Behavior:**
- Uses `Sheet` component (side="right") from `$lib/components/ui/sheet`
- Header: title "Notifications" + "Mark all read" button + settings gear icon
- Body: scrollable list of `notification-item.svelte` components
- Footer: "Load more" button if `nextPage` exists
- Empty state when no notifications

#### `notification-item.svelte` (New)

**File:** `budget-ui/src/lib/components/notification-item.svelte`

**Purpose:** Single notification row in the panel.

**Props interface:**
```typescript
{
  notification: Notification;
  onclick: (notification: Notification) => void;
  onDelete: (id: string) => void;
}
```

**Behavior:**
- Type-specific icon (using a map from `NotificationType` to Lucide icons)
- Title + message text
- Relative timestamp via `dayjs().fromNow()` (requires `relativeTime` plugin)
- Unread indicator (dot or background highlight)
- Click marks as read + navigates to `actionUrl` if present
- Delete button (trash icon) on hover/focus
- Icon map: `BILL_OVERDUE` -> `AlertTriangle`, `BILL_DUE_SOON` -> `Clock`, `BUDGET_THRESHOLD` -> `TrendingUp`, `BUDGET_EXCEEDED` -> `AlertOctagon`, `LOW_BALANCE` -> `Wallet`, `LARGE_TRANSACTION` -> `DollarSign`, `RECURRING_BILL_ENDING` -> `CalendarX`, `WORKSPACE_INVITATION` -> `UserPlus`, `MONTHLY_SUMMARY` -> `BarChart3`

#### `notification-preferences-dialog.svelte` (New)

**File:** `budget-ui/src/lib/components/notification-preferences-dialog.svelte`

**Purpose:** Dialog for managing notification preferences per workspace.

**Props interface:**
```typescript
{
  open: boolean;                              // $bindable
  preferences: NotificationPreference | null; // Current preferences
  onSave: (prefs: UpdateNotificationPreference) => void;
  loading: boolean;
}
```

**Behavior:**
- Uses `Dialog` component from `$lib/components/ui/dialog`
- Table-like layout: rows for each notification type, columns for "In-App" and "Email" toggles (Switch components)
- Section for thresholds: budget %, large transaction amount, low balance amount, bill due-soon days (number inputs)
- Section for quiet hours: enable toggle, start/end time inputs, timezone select
- Save and Cancel buttons
- Form validation with Zod schema

#### Modified: `(app)/+layout.svelte`

**Changes:**
- Import and render `notification-bell.svelte` in the header bar (between currency selector and theme toggle)
- Import and render `notification-panel.svelte` (Sheet, always mounted, controlled by `open` state)
- Import and render `notification-preferences-dialog.svelte`
- Add polling `$effect` for unread count (60-second interval via `setInterval`)
- Add notification state management (`$state` for notifications list, unread count, panel open, preferences dialog open)

#### Modified: `(app)/+layout.server.ts`

**Changes:**
- No changes needed for initial load. Unread count is fetched client-side via polling to avoid blocking SSR.

### API Proxy Routes

| Proxy Route | Method(s) | Upstream API |
|-------------|-----------|--------------|
| `src/routes/api/notifications/+server.ts` | `GET` | `GET /notifications` |
| `src/routes/api/notifications/unread-count/+server.ts` | `GET` | `GET /notifications/unread-count` |
| `src/routes/api/notifications/read-all/+server.ts` | `PATCH` | `PATCH /notifications/read-all` |
| `src/routes/api/notifications/[id]/read/+server.ts` | `PATCH` | `PATCH /notifications/:id/read` |
| `src/routes/api/notifications/[id]/+server.ts` | `DELETE` | `DELETE /notifications/:id` |
| `src/routes/api/notifications/preferences/+server.ts` | `GET`, `PUT` | `GET/PUT /notifications/preferences` |

All proxy routes follow the existing pattern: forward request via `fetch()` with `handleFetch` auto-attaching auth headers.

### State Management

The notification state lives in the `(app)/+layout.svelte` component (not a global store) since it is workspace-scoped and tightly coupled to the layout lifecycle.

```typescript
// In (app)/+layout.svelte <script>
let notificationPanelOpen = $state(false);
let preferencesDialogOpen = $state(false);
let unreadCount = $state(0);
let notifications = $state<PaginatedNotifications>({ data: [], total: 0, limit: 20, offset: 0, nextPage: null });
let notificationsLoading = $state(false);
let preferencesLoading = $state(false);
let preferences = $state<NotificationPreference | null>(null);

// Polling effect
$effect(() => {
  fetchUnreadCount();
  const interval = setInterval(fetchUnreadCount, 60_000);
  return () => clearInterval(interval);
});
```

### Types

**File:** `budget-ui/src/lib/types/notification.types.ts`

```typescript
export type NotificationType =
  | 'BILL_OVERDUE'
  | 'BILL_DUE_SOON'
  | 'BUDGET_THRESHOLD'
  | 'BUDGET_EXCEEDED'
  | 'LOW_BALANCE'
  | 'LARGE_TRANSACTION'
  | 'RECURRING_BILL_ENDING'
  | 'WORKSPACE_INVITATION'
  | 'MONTHLY_SUMMARY';

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  createdAt: string;
};

export type PaginatedNotifications = {
  data: Notification[];
  total: number;
  limit: number;
  offset: number;
  nextPage: number | null;
};

export type ChannelPreference = {
  inApp: boolean;
  email: boolean;
};

export type NotificationPreference = {
  id: string;
  channels: Record<NotificationType, ChannelPreference>;
  budgetThresholdPercent: number;
  largeTransactionAmount: number;
  lowBalanceAmount: number;
  billDueSoonDays: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
};

export type UpdateNotificationPreference = Partial<Omit<NotificationPreference, 'id'>>;
```

### Schemas

**File:** `budget-ui/src/lib/schemas/notification-preferences.schema.ts`

```typescript
import { z } from 'zod/v4';

const channelPreferenceSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
});

export const updateNotificationPreferencesSchema = z.object({
  channels: z.record(z.string(), channelPreferenceSchema).optional(),
  budgetThresholdPercent: z.number().min(1).max(100).optional(),
  largeTransactionAmount: z.number().min(0).optional(),
  lowBalanceAmount: z.number().min(0).optional(),
  billDueSoonDays: z.number().min(1).max(30).optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursTimezone: z.string().optional(),
});
```

---

## Data Flow

### In-App Notification (Event-Driven)

```
1. User creates a transaction in the UI
   → POST /api/transactions (SvelteKit proxy)
   → POST /transactions (NestJS API)

2. TransactionsService.create() saves transaction in DB transaction
   → After commit, emits 'transaction.created' event via EventEmitter

3. TransactionNotificationHandler.handleTransactionCreated()
   → Checks budget progress for affected categories
   → If threshold crossed: builds NotificationEvent
   → Calls NotificationDispatcher.dispatch(event)

4. NotificationDispatcher.dispatch()
   → Loads user's NotificationPreference for workspace
   → Checks channels enabled for BUDGET_THRESHOLD
   → Checks quiet hours (skip email if in quiet hours)
   → Checks deduplication (skip if duplicate within 24h)
   → For in-app: InAppChannel.send() → NotificationsService.create() → saves to MongoDB
   → For email: EmailChannel.send() → MailService.sendMail() → SMTP

5. UI polling (every 60s) fetches GET /api/notifications/unread-count
   → Returns { count: N }
   → Badge updates on bell icon

6. User clicks bell → Panel opens → GET /api/notifications
   → Displays notification list
   → User clicks notification → PATCH /api/notifications/:id/read
   → Navigates to actionUrl (e.g., /budgets)
```

### Scheduled Notification (Bill Scanner)

```
1. BillScannerJob fires at 08:00 UTC (via @Cron)
   → Acquires distributed lock via NotificationLock

2. Loads all bills across all workspaces
   → For each bill, generates instances for today + configurable lookahead
   → Identifies: overdue (unpaid, past due), due soon (within N days), ending soon (7 days before endDate)

3. For each notification-worthy instance:
   → Looks up bill owner's preferences for the workspace
   → Builds deduplication key: `bill_overdue_${billId}_${targetDate}`
   → Calls NotificationDispatcher.dispatch()

4. Same dispatch flow as event-driven (step 4 above)
5. Releases distributed lock
```

### Preferences Update

```
1. User opens preferences dialog in UI
   → GET /api/notifications/preferences → fetches or creates defaults

2. User toggles channels, adjusts thresholds
   → PUT /api/notifications/preferences with updated fields
   → Deep merge on backend (channels nested object merged, flat fields overwritten)

3. Updated preferences immediately affect next dispatch cycle
```

---

## Implementation Order

1. **[ECS-46] Notification Data Model & Core Service** (Backend)
   - Create `NotificationType` enum
   - Create `Notification` entity with schema and indexes
   - Create `NotificationPreference` entity with schema and compound index
   - Create `NotificationLock` entity
   - Create all DTOs (input + response)
   - Implement `NotificationsService` with 8 CRUD methods
   - Create `NotificationsModule` and register in `AppModule`
   - **Depends on:** Nothing
   - **Blocks:** Steps 2, 5

2. **[ECS-47] Notification Delivery Channels** (Backend)
   - Define `ChannelStrategy` interface
   - Implement `InAppChannel` (persists via `NotificationsService.create()`)
   - Implement `EmailChannel` (sends via `MailService.sendMail()`)
   - Implement `NotificationDispatcher` service (preference resolution, quiet hours, deduplication, error isolation)
   - Register all providers in `NotificationsModule`
   - **Depends on:** Step 1
   - **Blocks:** Steps 3, 4, 7

3. **[ECS-48] Event-Driven Notification Triggers** (Backend)
   - Install `@nestjs/event-emitter`, register `EventEmitterModule.forRoot()` in `AppModule`
   - Add `EventEmitter2` injection to `TransactionsService`, emit `transaction.created` after DB commit
   - Add `EventEmitter2` injection to `WorkspacesService`, emit `workspace.invitation.created` after invitation save
   - Create `TransactionNotificationHandler` (budget threshold/exceeded, large transaction, low balance)
   - Create `WorkspaceNotificationHandler` (workspace invitation)
   - Implement deduplication logic per handler
   - **Depends on:** Step 2
   - **Can run in parallel with:** Step 4

4. **[ECS-49] Scheduled Notification Jobs** (Backend)
   - Install `@nestjs/schedule`, register `ScheduleModule.forRoot()` in `AppModule`
   - Create distributed lock service using `NotificationLock`
   - Create `BillScannerJob` (overdue, due-soon, ending-soon)
   - Create `BudgetCheckerJob` (threshold, exceeded)
   - Create `LowBalanceJob` (low account balance)
   - Create `MonthlySummaryJob` (aggregate monthly data, email-only)
   - Create `NotificationCleanupJob` (delete old notifications)
   - **Depends on:** Step 2
   - **Can run in parallel with:** Step 3

5. **[ECS-50] Notification API Endpoints** (Backend)
   - Create `NotificationsController` with 7 endpoints
   - Add Swagger documentation
   - Register controller in `NotificationsModule`
   - **Depends on:** Step 1
   - **Blocks:** Step 6

6. **[ECS-51] In-App Notification UI** (Frontend)
   - Create TypeScript types (`notification.types.ts`)
   - Create Zod schema (`notification-preferences.schema.ts`)
   - Create 6 API proxy routes
   - Create `notification-bell.svelte` component
   - Create `notification-item.svelte` component
   - Create `notification-panel.svelte` component
   - Create `notification-preferences-dialog.svelte` component
   - Modify `(app)/+layout.svelte` to integrate bell, panel, preferences dialog, and polling
   - Add i18n translations (en.json, es.json)
   - **Depends on:** Step 5

7. **[ECS-52] Notification Templates & i18n** (Full Stack)
   - Create 9 Handlebars email templates following `workspaceInvitation.hbs` pattern
   - Create 9 API i18n JSON files (en) for email templates
   - Create 9 API i18n JSON files (es) for email templates
   - **Depends on:** Steps 2, 3, 4

---

## i18n Keys

### Frontend (budget-ui) — `src/lib/locales/en.json` and `es.json`

```json
{
  "notifications": {
    "title": "Notifications",
    "noNotifications": "No notifications yet",
    "markAllRead": "Mark all as read",
    "markAllReadSuccess": "All notifications marked as read",
    "markAllReadError": "Error marking notifications as read",
    "deleteSuccess": "Notification deleted",
    "deleteError": "Error deleting notification",
    "loadError": "Error loading notifications",
    "unreadCountError": "Error loading notification count",
    "viewAll": "View all",
    "loadMore": "Load more",
    "justNow": "Just now",
    "preferences": "Notification Preferences",
    "preferencesDescription": "Customize how and when you receive notifications",
    "preferencesLoadError": "Error loading notification preferences",
    "preferencesSaveSuccess": "Notification preferences saved",
    "preferencesSaveError": "Error saving notification preferences",
    "channels": "Channels",
    "inApp": "In-App",
    "email": "Email",
    "thresholds": "Thresholds",
    "budgetThresholdPercent": "Budget alert threshold (%)",
    "largeTransactionAmount": "Large transaction amount",
    "lowBalanceAmount": "Low balance amount",
    "billDueSoonDays": "Days before due date",
    "quietHours": "Quiet Hours",
    "quietHoursDescription": "Pause email notifications during these hours",
    "quietHoursEnabled": "Enable quiet hours",
    "quietHoursStart": "Start time",
    "quietHoursEnd": "End time",
    "quietHoursTimezone": "Timezone",
    "eventTypes": {
      "BILL_OVERDUE": "Bill Overdue",
      "BILL_DUE_SOON": "Bill Due Soon",
      "BUDGET_THRESHOLD": "Budget Threshold Reached",
      "BUDGET_EXCEEDED": "Budget Exceeded",
      "LOW_BALANCE": "Low Account Balance",
      "LARGE_TRANSACTION": "Large Transaction",
      "RECURRING_BILL_ENDING": "Recurring Bill Ending",
      "WORKSPACE_INVITATION": "Workspace Invitation",
      "MONTHLY_SUMMARY": "Monthly Summary"
    },
    "save": "Save Preferences",
    "cancel": "Cancel"
  }
}
```

### Backend (budget-api) — `src/i18n/en/` and `src/i18n/es/`

9 new i18n JSON files (one per notification event type, matching the email template pattern):

| File | Key Prefix | Keys |
|------|-----------|------|
| `billOverdue.json` | `billOverdue.*` | `subject`, `preheader`, `heading`, `greeting`, `instruction`, `billName`, `amount`, `dueDate`, `button`, `regards`, `signature`, `rightsReserved` |
| `billDueSoon.json` | `billDueSoon.*` | `subject`, `preheader`, `heading`, `greeting`, `instruction`, `billName`, `amount`, `dueDate`, `daysUntilDue`, `button`, `regards`, `signature`, `rightsReserved` |
| `budgetThreshold.json` | `budgetThreshold.*` | `subject`, `preheader`, `heading`, `greeting`, `instruction`, `budgetName`, `spent`, `limit`, `percentUsed`, `button`, `regards`, `signature`, `rightsReserved` |
| `budgetExceeded.json` | `budgetExceeded.*` | `subject`, `preheader`, `heading`, `greeting`, `instruction`, `budgetName`, `spent`, `limit`, `percentUsed`, `button`, `regards`, `signature`, `rightsReserved` |
| `lowBalance.json` | `lowBalance.*` | `subject`, `preheader`, `heading`, `greeting`, `instruction`, `accountName`, `balance`, `threshold`, `button`, `regards`, `signature`, `rightsReserved` |
| `largeTransaction.json` | `largeTransaction.*` | `subject`, `preheader`, `heading`, `greeting`, `instruction`, `amount`, `description`, `accountName`, `date`, `button`, `regards`, `signature`, `rightsReserved` |
| `recurringBillEnding.json` | `recurringBillEnding.*` | `subject`, `preheader`, `heading`, `greeting`, `instruction`, `billName`, `endDate`, `button`, `regards`, `signature`, `rightsReserved` |
| `workspaceInvitationNotification.json` | `workspaceInvitationNotification.*` | `subject`, `preheader`, `heading`, `greeting`, `instruction`, `invitedBy`, `button`, `regards`, `signature`, `rightsReserved` |
| `monthlySummary.json` | `monthlySummary.*` | `subject`, `preheader`, `heading`, `greeting`, `instruction`, `month`, `totalIncome`, `totalExpenses`, `netSavings`, `topCategories`, `billsPaid`, `button`, `regards`, `signature`, `rightsReserved` |

Each file has both `en` and `es` versions.

---

## Edge Cases & Validation

### Input Validation Rules

| Field | Validation |
|-------|-----------|
| `NotificationsQueryDto.type` | Optional, must be valid `NotificationType` enum value |
| `NotificationsQueryDto.isRead` | Optional, boolean |
| `NotificationsQueryDto.limit` | Optional, positive integer, max 100 |
| `NotificationsQueryDto.offset` | Optional, non-negative integer |
| `UpdateNotificationPreferenceDto.budgetThresholdPercent` | 1-100 |
| `UpdateNotificationPreferenceDto.largeTransactionAmount` | Positive number |
| `UpdateNotificationPreferenceDto.lowBalanceAmount` | Non-negative number |
| `UpdateNotificationPreferenceDto.billDueSoonDays` | 1-30 |
| `UpdateNotificationPreferenceDto.quietHoursStart/End` | `HH:mm` format regex |
| `UpdateNotificationPreferenceDto.quietHoursTimezone` | Valid string (IANA timezone, validated at application level) |
| `Notification :id` param | Valid MongoDB ObjectId |

### Error Scenarios

| Scenario | Handling |
|----------|---------|
| Notification not found (mark read, delete) | `HttpException('Notification not found', 404)` |
| Notification belongs to different user | Ownership enforced by filtering `{ _id: id, user: userId, workspace: workspaceId }` -- returns 404, not 403 |
| Email channel fails (SMTP error) | Caught and logged; in-app notification still delivered. `EmailChannel.send()` wrapped in try/catch, error logged via `Logger` |
| Event handler throws | `@OnEvent` handlers wrapped in try/catch. Logged but never crash the main request flow (events are fire-and-forget) |
| Duplicate notification (same event fired twice) | Deduplication via `deduplicationKey` check: `data.deduplicationKey` + 24h window. If duplicate found, skip silently |
| Scheduled job concurrent execution | Distributed lock via `NotificationLock`. If lock already held and not expired, job skips execution silently |
| Preferences not found on GET | Auto-created with sensible defaults via `findOneAndUpdate` with `upsert: true` |
| Quiet hours span midnight (e.g., 22:00-08:00) | Logic handles cross-midnight ranges: if `start > end`, time is in quiet hours if `current >= start OR current < end` |
| User has no workspace set | Notifications workspace-scoped; `workspaceId` from session. If undefined, controller returns empty results |
| Polling during network error | Client-side fetch wrapped in try/catch; badge retains last known count, no toast error (silent fail for polling) |
| Panel opened while offline | Loading state shown; error toast on failure; retry on next open |
| Large notification volume (100+ unread) | Paginated API (limit 20 default); badge shows `99+` for counts > 99 |
| Bill scanner processes thousands of bills | Batch processing with cursor-based iteration; deduplication prevents flooding |
| Monthly summary has no data | Summary still sent but with "No activity this month" message variant |

### Security Considerations

- All notification endpoints require JWT authentication (global `JwtAuthGuard`)
- All queries filter by `user: userId` and `workspace: workspaceId` from session -- users can never access other users' notifications
- Mark-as-read and delete verify ownership via query filter (not separate authz check)
- Email channel resolves recipient email from `UsersService` (not from notification data) to prevent email injection
- `data` field is `SchemaTypes.Mixed` -- sanitized on output via `@Exclude()/@Expose()` DTO pattern
- Cron job env vars validated at startup
