# Backend Implementation: Notification System & Multi-Channel Alerts

## Created Files
- `budget-api/src/notifications/entities/notification-type.enum.ts` -- NotificationType enum with 9 event types
- `budget-api/src/notifications/entities/notification.entity.ts` -- Notification Mongoose schema with 3 indexes (user+workspace+createdAt, user+workspace+isRead, createdAt)
- `budget-api/src/notifications/entities/notification-preference.entity.ts` -- NotificationPreference schema with per-event channel toggles, thresholds, quiet hours, and unique compound index
- `budget-api/src/notifications/entities/notification-lock.entity.ts` -- NotificationLock schema for distributed cron job locking
- `budget-api/src/notifications/dto/notifications-query.dto.ts` -- Query DTO extending PaginationDto with type and isRead filters
- `budget-api/src/notifications/dto/create-notification.dto.ts` -- Internal DTO for creating notifications (not API-exposed)
- `budget-api/src/notifications/dto/update-notification-preference.dto.ts` -- DTO for updating notification preferences with validation
- `budget-api/src/notifications/dto/notification.dto.ts` -- Response DTO with @Exclude/@Expose pattern
- `budget-api/src/notifications/dto/notification-preference.dto.ts` -- Response DTO for preferences with @Exclude/@Expose pattern
- `budget-api/src/notifications/notifications.service.ts` -- Core CRUD service with 8 methods (create, findAll, findUnreadCount, markAsRead, markAllAsRead, remove, getPreferences, updatePreferences, deleteOldNotifications, findDuplicateKey)
- `budget-api/src/notifications/services/notification-event.interface.ts` -- NotificationEvent interface for dispatcher
- `budget-api/src/notifications/services/notification-dispatcher.service.ts` -- Dispatcher with preference resolution, quiet hours check, deduplication, and per-channel error isolation
- `budget-api/src/notifications/services/notification-lock.service.ts` -- Distributed lock service using NotificationLock collection with TTL
- `budget-api/src/notifications/channels/channel-strategy.interface.ts` -- ChannelStrategy interface
- `budget-api/src/notifications/channels/in-app.channel.ts` -- In-app channel that persists via NotificationsService.create()
- `budget-api/src/notifications/channels/email.channel.ts` -- Email channel that sends via MailService with user email resolution
- `budget-api/src/notifications/handlers/transaction-notification.handler.ts` -- Event handler for transaction.created (budget threshold/exceeded, large transaction, low balance)
- `budget-api/src/notifications/handlers/workspace-notification.handler.ts` -- Event handler for workspace.invitation.created
- `budget-api/src/notifications/jobs/bill-scanner.job.ts` -- Daily cron job scanning bills for overdue, due-soon, and ending-soon notifications
- `budget-api/src/notifications/jobs/budget-checker.job.ts` -- 6-hourly cron job checking budget progress for threshold/exceeded notifications
- `budget-api/src/notifications/jobs/low-balance.job.ts` -- Daily cron job scanning accounts for low balance notifications
- `budget-api/src/notifications/jobs/monthly-summary.job.ts` -- Monthly cron job aggregating financial data for email-only summaries
- `budget-api/src/notifications/jobs/notification-cleanup.job.ts` -- Daily cron job deleting notifications older than retention period
- `budget-api/src/notifications/notifications.controller.ts` -- Controller with 7 endpoints (GET list, GET unread-count, GET preferences, PUT preferences, PATCH read-all, PATCH :id/read, DELETE :id)
- `budget-api/src/notifications/notifications.module.ts` -- Module registering all schemas, controllers, providers, and importing MailModule, UsersModule, CategoriesModule
- `budget-api/src/i18n/en/billOverdue.json` -- English i18n for bill overdue email template
- `budget-api/src/i18n/en/billDueSoon.json` -- English i18n for bill due soon email template
- `budget-api/src/i18n/en/budgetThreshold.json` -- English i18n for budget threshold email template
- `budget-api/src/i18n/en/budgetExceeded.json` -- English i18n for budget exceeded email template
- `budget-api/src/i18n/en/lowBalance.json` -- English i18n for low balance email template
- `budget-api/src/i18n/en/largeTransaction.json` -- English i18n for large transaction email template
- `budget-api/src/i18n/en/recurringBillEnding.json` -- English i18n for recurring bill ending email template
- `budget-api/src/i18n/en/workspaceInvitationNotification.json` -- English i18n for workspace invitation notification email template
- `budget-api/src/i18n/en/monthlySummary.json` -- English i18n for monthly summary email template
- `budget-api/src/i18n/es/billOverdue.json` -- Spanish i18n for bill overdue email template
- `budget-api/src/i18n/es/billDueSoon.json` -- Spanish i18n for bill due soon email template
- `budget-api/src/i18n/es/budgetThreshold.json` -- Spanish i18n for budget threshold email template
- `budget-api/src/i18n/es/budgetExceeded.json` -- Spanish i18n for budget exceeded email template
- `budget-api/src/i18n/es/lowBalance.json` -- Spanish i18n for low balance email template
- `budget-api/src/i18n/es/largeTransaction.json` -- Spanish i18n for large transaction email template
- `budget-api/src/i18n/es/recurringBillEnding.json` -- Spanish i18n for recurring bill ending email template
- `budget-api/src/i18n/es/workspaceInvitationNotification.json` -- Spanish i18n for workspace invitation notification email template
- `budget-api/src/i18n/es/monthlySummary.json` -- Spanish i18n for monthly summary email template

## Modified Files
- `budget-api/src/app.module.ts` -- Added imports for EventEmitterModule.forRoot(), ScheduleModule.forRoot(), and NotificationsModule
- `budget-api/src/transactions/transactions.service.ts` -- Added EventEmitter2 injection and event emission ('transaction.created') after successful transaction creation
- `budget-api/src/workspaces/workspaces.service.ts` -- Added EventEmitter2 injection and event emission ('workspace.invitation.created') after invitation save
- `budget-api/package.json` -- Added @nestjs/event-emitter and @nestjs/schedule dependencies

## Lint Status
```
> budget-api@0.0.1 lint
> eslint "{src,apps,libs,test}/**/*.ts" --fix

(no errors or warnings)
```
Lint passed with zero errors and zero warnings.

## Deviations
- Response DTOs (NotificationDto, NotificationPreferenceDto) use @Exclude/@Expose pattern as specified in the design, while some existing DTOs in the codebase (e.g., TransactionDto, BudgetDto) do not use this pattern. This is not a deviation from the design, but a deviation from some existing codebase patterns. The design explicitly called for @Exclude/@Expose, so we followed the design.
- The design specifies `@Roles(WorkspaceRole.CONTRIBUTOR, WorkspaceRole.OWNER)` for mutating endpoints, but notification endpoints (markAsRead, markAllAsRead, delete, updatePreferences) are user-scoped operations filtered by userId, not workspace-level mutations. Any authenticated user in the workspace should be able to manage their own notifications, so @Roles is omitted. Ownership is enforced via query filters (user + workspace).
- Event emission in TransactionsService.create() only fires when no external session is provided (i.e., when the service manages its own transaction), to avoid emitting events for nested calls from BillsService that are part of a larger transaction.
