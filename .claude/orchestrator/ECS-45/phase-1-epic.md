# Epic: ECS-45 — Notification System & Multi-Channel Alerts

## Description

The Budget application currently has no way to proactively inform users about important financial events. Users must manually check for overdue bills, budget overspending, or low balances. This epic adds a comprehensive notification system with two delivery channels (in-app, email) and event-driven + scheduled triggers, transforming the app from a reactive tool into a proactive financial assistant.

**Current state**: No notification, scheduling, event-emitter, or real-time infrastructure exists. Only email sending via `MailService` (SMTP + Handlebars templates) is available.

### Notification Events

| Event | Trigger Type | Default Channels |
| --- | --- | --- |
| Bill Overdue | Scheduled (daily scan) | In-app, Email |
| Bill Due Soon | Scheduled (daily scan, configurable: 1, 3 days before) | In-app, Email |
| Budget Threshold Reached | Event-driven (on transaction) + Scheduled (every 6h) | In-app, Email |
| Budget Exceeded (>100%) | Event-driven + Scheduled | In-app, Email |
| Low Account Balance | Event-driven (on transaction) + Scheduled (daily) | In-app, Email |
| Large Transaction | Event-driven (on transaction create) | In-app |
| Recurring Bill Ending | Scheduled (daily scan, 7 days before endDate) | In-app, Email |
| Workspace Invitation | Event-driven (on invitation create) | In-app |
| Monthly Summary | Scheduled (1st of month) | Email only |

### Key Decisions

- **SMS**: Deferred to a future story. Only in-app + email channels for now.
- **Preferences**: Per-workspace scoping (users can customize per workspace).
- **Real-time**: 60-second polling for unread count (no WebSocket/SSE).
- **Events**: All 9 events included as proposed.

### Implementation Order

```
Story 1 (Data Model) --> Story 5 (API Endpoints) --> Story 6 (Frontend UI)
       |
       +--> Story 2 (Channels) --> Story 3 (Event Triggers) --+
                    |                                           +--> Story 7 (Templates)
                    +--> Story 4 (Scheduled Jobs) -------------+
```

**Parallel tracks after Story 1**:
- Track A: Story 1 -> Story 5 -> Story 6
- Track B: Story 1 -> Story 2 -> Stories 3 & 4 (parallel) -> Story 7

### New npm Dependencies

| Package | Project | Purpose |
| --- | --- | --- |
| `@nestjs/event-emitter` | budget-api | Event bus for real-time triggers |
| `@nestjs/schedule` | budget-api | Cron job scheduling |

### Verification

1. **Unit**: Each service method testable in isolation with mocked dependencies
2. **E2E (API)**: Test notification CRUD endpoints, preference CRUD, unread count
3. **E2E (UI)**: Test bell icon visibility, panel open/close, mark as read, preferences dialog
4. **Integration**: Create a transaction that crosses a budget threshold -> verify in-app notification appears + email sent
5. **Scheduled**: Manually trigger bill scanner with test bill data -> verify overdue notifications generated

---

## Stories & Tasks

### ECS-46 — Notification Data Model & Core Service (Backend)
- **Type:** Story
- **Status:** Backlog
- **Priority:** Medium
- **Description:** Create the notification data model (Mongoose entities), enums, DTOs, and core `NotificationsService` with CRUD operations. Register `NotificationsModule` in `app.module.ts`. Blocks Stories 2 and 5.
- **Acceptance Criteria:**
  - Notification entity created with all fields and index
  - NotificationPreferences entity created with unique compound index
  - All DTOs created with class-validator decorators and Swagger docs
  - NotificationsService implements all 8 methods (create, findAll, findUnreadCount, markAsRead, markAllAsRead, remove, getPreferences, updatePreferences)
  - NotificationsModule registered in AppModule
  - Project compiles with no TypeScript errors

### ECS-47 — Notification Delivery Channels (Backend)
- **Type:** Story
- **Status:** Backlog
- **Priority:** Medium
- **Description:** Create the channel strategy pattern and `NotificationDispatcher` service that routes notifications to the correct channels based on user preferences and quiet hours. Depends on Story 1 (ECS-46). Blocks Stories 3, 4, 7.
- **Acceptance Criteria:**
  - `ChannelStrategy` interface defined
  - `InAppChannel` persists notifications via `NotificationsService.create()`
  - `EmailChannel` sends emails via existing `MailService`
  - `NotificationDispatcher` resolves preferences and routes to correct channels
  - Quiet hours respected (email skipped, in-app always delivers)
  - Error isolation: one channel failure doesn't affect others
  - All new providers registered in `NotificationsModule`

### ECS-48 — Event-Driven Notification Triggers (Backend)
- **Type:** Story
- **Status:** Backlog
- **Priority:** Medium
- **Description:** Install `@nestjs/event-emitter`, emit domain events from existing services, and create event handlers that trigger notifications for budget thresholds, large transactions, low balances, and workspace invitations. Depends on Story 2 (ECS-47).
- **Acceptance Criteria:**
  - `@nestjs/event-emitter` installed and `EventEmitterModule` registered
  - Events emitted from TransactionsService, BillsService, WorkspacesService
  - Budget threshold handler detects threshold crossings and dispatches notifications
  - Large transaction handler fires for transactions exceeding user threshold
  - Low balance handler fires when account balance drops below threshold
  - Workspace invitation handler creates in-app notification for invited user
  - Deduplication prevents duplicate notifications for same event
  - Events fire after DB transactions complete (not inside transaction)

### ECS-49 — Scheduled Notification Jobs (Backend)
- **Type:** Story
- **Status:** Backlog
- **Priority:** Medium
- **Description:** Install `@nestjs/schedule`, create cron-based notification jobs for bill scanning, budget checking, low balance scanning, monthly summaries, and notification cleanup. Include MongoDB-based distributed locks. Depends on Story 2 (ECS-47).
- **Acceptance Criteria:**
  - `@nestjs/schedule` installed and `ScheduleModule` registered
  - Bill scanner identifies overdue, due soon, and ending bills and dispatches notifications
  - Budget checker computes progress for all budgets and dispatches threshold notifications
  - Low balance check scans all accounts and dispatches notifications
  - Monthly summary aggregates data and dispatches email-only notification
  - Notification cleanup deletes notifications older than retention period
  - Distributed lock prevents concurrent job execution
  - All cron schedules configurable via env vars

### ECS-50 — Notification API Endpoints (Backend)
- **Type:** Story
- **Status:** Backlog
- **Priority:** Medium
- **Description:** Create `NotificationsController` with REST endpoints for notification CRUD, unread count, mark read/all read, and preferences management. All endpoints workspace-scoped. Depends on Story 1 (ECS-46). Blocks Story 6.
- **Acceptance Criteria:**
  - All 7 endpoints implemented and functional (GET list, GET unread-count, PATCH read, PATCH read-all, DELETE, GET preferences, PUT preferences)
  - Pagination works correctly with limit/offset/filters
  - Unread count returns correct number
  - Mark as read sets `isRead: true` and `readAt`
  - Mark all as read updates all unread notifications
  - Delete removes notification (only owner's notifications)
  - Preferences GET auto-creates defaults if none exist
  - Preferences PUT supports partial updates
  - All endpoints Swagger documented
  - Controller registered in NotificationsModule

### ECS-51 — In-App Notification UI (Frontend)
- **Type:** Story
- **Status:** Backlog
- **Priority:** Medium
- **Description:** Build the frontend notification UI: bell icon with unread badge, slide-out panel, notification list, preferences dialog, API proxy routes, types, schemas, and i18n translations. Depends on Story 5 (ECS-50).
- **Acceptance Criteria:**
  - Bell icon visible in header with unread badge
  - Badge hidden when count is 0
  - Panel opens from right as Sheet component
  - Notification list shows type-specific icons and relative timestamps
  - Click notification marks as read and navigates appropriately
  - "Mark all read" button works
  - Preferences dialog allows toggling channels and event preferences
  - 60-second polling for unread count
  - All proxy routes forward requests correctly
  - i18n translations added for both en and es

### ECS-52 — Notification Templates & i18n (Full Stack)
- **Type:** Story
- **Status:** Backlog
- **Priority:** Medium
- **Description:** Create 9 Handlebars email templates and corresponding i18n JSON files (en/es) for all notification event types. Follow the existing `workspaceInvitation.hbs` pattern. Depends on Stories 2 (ECS-47), 3 (ECS-48), 4 (ECS-49).
- **Acceptance Criteria:**
  - All 9 Handlebars templates created following existing pattern
  - All 9 i18n JSON files created for English
  - All 9 i18n JSON files created for Spanish
  - Templates use `{{t "key"}}` for all user-facing text
  - Templates include CTA buttons linking to relevant app pages
  - Monthly summary template handles aggregate data display (tables, lists)
  - All templates render correctly (no Handlebars compilation errors)
  - SMS templates deferred (not included in this story)

---

## Stats
- **Total issues:** 7
- **By type:** 7 stories, 0 tasks, 0 subtasks
- **By status:** 7 Backlog (To Do), 0 In Progress, 0 Done
