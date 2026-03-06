# Event-Driven, Jobs, Strategy & Email Patterns

## Table of Contents

- [Event-Driven Architecture](#event-driven-architecture)
- [Scheduled Jobs](#scheduled-jobs)
- [Strategy / Dispatcher Pattern](#strategy--dispatcher-pattern)
- [Email Templates](#email-templates)

---

## Event-Driven Architecture

Use `EventEmitter2` for cross-module communication. Handlers consume events asynchronously without coupling source modules to notification/side-effect logic.

### Event payload interface

```typescript
// src/{feature}/events/{event-name}.event.ts
export interface TransactionCreatedEvent {
  transaction: any;
  userId: string;
  workspaceId: string;
  accountId: string;
  categoryId: string;
  amount: number;
}
```

### Emitting events

```typescript
// In the source service — emit after successful operation
this.eventEmitter.emit('transaction.created', {
  transaction: result,
  userId,
  workspaceId,
  accountId: dto.account,
  categoryId: dto.category,
  amount: result.amount,
});
```

### Event handler

```typescript
// src/{feature}/handlers/{event-name}.handler.ts
@Injectable()
export class TransactionNotificationHandler {
  private readonly logger: Logger = new Logger(TransactionNotificationHandler.name);

  @OnEvent('transaction.created')
  async handleTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    try {
      // Load shared data once
      const prefs = await this.prefsModel.findOne({
        user: event.userId,
        workspace: event.workspaceId,
      });

      // Error isolation: each check fails independently
      await Promise.allSettled([
        this.checkBudgetThresholds(event, prefs),
        this.checkLargeTransaction(event, prefs),
        this.checkLowBalance(event, prefs),
      ]);
    } catch (error) {
      this.logger.error(`Error handling transaction.created: ${error.message}`, error.stack);
    }
  }
}
```

Rules:
- Event payloads: typed interfaces in `src/{feature}/events/`, never inline `any`
- Handler files: `src/{feature}/handlers/{event-name}.handler.ts`
- Always wrap handler logic in try/catch — event failures must not propagate to the emitter
- Use `Promise.allSettled` when a handler triggers multiple independent checks
- Deduplication: include a `deduplicationKey` in event data, check-before-dispatch with 24h time window:

```typescript
// In the service that stores notifications
async findDuplicateKey(userId: string, workspaceId: string, type: NotificationType, deduplicationKey: string): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 24);
  const existing = await this.model.findOne({
    user: userId, workspace: workspaceId, type,
    'data.deduplicationKey': deduplicationKey,
    createdAt: { $gte: cutoff },
  });
  return !!existing;
}
```

Reference impl: `budget-api/src/notifications/handlers/` and `budget-api/src/notifications/events/`

---

## Scheduled Jobs

Use `@nestjs/schedule` for cron-based background jobs with distributed locking.

### Cron decorator with env var

```typescript
// src/{feature}/jobs/{job-name}.job.ts
@Cron(process.env.CRON_BUDGET_CHECKER || '0 */6 * * *')
async handleCron(): Promise<void> { /* ... */ }
```

**Why `process.env` instead of `ConfigService`:** `@Cron` is a decorator — it evaluates at class definition time, before the DI container is initialized. `ConfigService` is not available yet.

### Distributed lock pattern (MongoDB)

```typescript
// Entity: src/{feature}/entities/{feature}-lock.entity.ts
@Schema()
export class NotificationLock {
  @Prop({ type: String, required: true, unique: true })
  jobName: string;

  @Prop({ type: Date, required: true })
  lockedAt: Date;

  @Prop({ type: String, required: true })
  lockedBy: string; // `${os.hostname()}-${process.pid}`

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}
export const NotificationLockSchema = SchemaFactory.createForClass(NotificationLock)
  .index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-cleanup
```

```typescript
// Lock service: atomic upsert — only one instance wins
async acquireLock(jobName: string, ttlMinutes = 30): Promise<boolean> {
  try {
    const now = new Date();
    const result = await this.lockModel.findOneAndUpdate(
      { jobName, $or: [{ expiresAt: { $lt: now } }, { expiresAt: { $exists: false } }] },
      { $set: { jobName, lockedAt: now, lockedBy: this.instanceId, expiresAt: new Date(now.getTime() + ttlMinutes * 60000) } },
      { upsert: true, new: true },
    );
    return result?.lockedBy === this.instanceId;
  } catch (error) {
    if (error.code === 11000) return false; // Another instance won
    throw error;
  }
}
```

### Job structure

```typescript
@Injectable()
export class BudgetCheckerJob {
  private readonly logger: Logger = new Logger(BudgetCheckerJob.name);

  @Cron(process.env.CRON_BUDGET_CHECKER || '0 */6 * * *')
  async handleCron(): Promise<void> {
    const startTime = Date.now();
    const locked = await this.lockService.acquireLock('budget-checker', 30);
    if (!locked) {
      this.logger.debug('Lock not acquired, skipping');
      return;
    }

    let processed = 0;
    let dispatched = 0;
    try {
      // ... batch processing logic ...
      this.logger.log(
        `Budget checker completed: ${processed} processed, ${dispatched} dispatched in ${Date.now() - startTime}ms`,
      );
    } catch (error) {
      this.logger.error(`Budget checker failed: ${error.message}`, error.stack);
    } finally {
      await this.lockService.releaseLock('budget-checker');
    }
  }
}
```

### Batch processing: group-by-workspace

```typescript
// Group by workspace to bulk-load preferences (avoid N+1)
const byWorkspace = new Map<string, typeof items>();
for (const item of items) {
  const wsId = item.workspace?.toString();
  if (!wsId) continue;
  if (!byWorkspace.has(wsId)) byWorkspace.set(wsId, []);
  byWorkspace.get(wsId).push(item);
}

for (const [workspaceId, workspaceItems] of byWorkspace) {
  const members = await this.memberModel.find({ workspace: workspaceId });
  const memberUserIds = members.map((m) => m.user?.toString()).filter(Boolean);

  // Bulk load all preferences for the workspace at once
  const allPrefs = await this.prefsModel.find({ user: { $in: memberUserIds }, workspace: workspaceId });
  const prefsMap = new Map(allPrefs.map((p) => [p.user?.toString(), p]));

  for (const item of workspaceItems) {
    for (const member of members) {
      const prefs = prefsMap.get(member.user?.toString()); // O(1) lookup
      // ... process with preloaded data ...
    }
  }
}
```

Rules:
- Job files: `src/{feature}/jobs/{job-name}.job.ts`
- Always acquire lock before processing, release in `finally`
- Log execution metrics: items processed, notifications dispatched, duration in ms
- Group-by-workspace + bulk-load preferences to avoid N+1 queries

Reference impl: `budget-api/src/notifications/jobs/`

---

## Strategy / Dispatcher Pattern

Use interface-based strategies for pluggable delivery channels (in-app, email, push, etc.).

### Strategy interface

```typescript
// src/{feature}/channels/channel-strategy.interface.ts
import { NotificationEvent } from '../services/notification-event.interface';

export interface ChannelStrategy {
  send(event: NotificationEvent): Promise<void>;
}
```

### Strategy implementation

```typescript
// src/{feature}/channels/in-app.channel.ts
@Injectable()
export class InAppChannel implements ChannelStrategy {
  private readonly logger: Logger = new Logger(InAppChannel.name);

  async send(event: NotificationEvent): Promise<void> {
    try {
      await this.notificationsService.create(
        { type: event.type, title: event.title, message: event.message, data: event.data, actionUrl: event.actionUrl },
        event.userId, event.workspaceId,
      );
    } catch (error) {
      this.logger.error(`Failed to send in-app notification: ${error.message}`, error.stack);
    }
  }
}
```

### Dispatcher service

```typescript
// src/{feature}/services/{feature}-dispatcher.service.ts
@Injectable()
export class NotificationDispatcher {
  async dispatch(event: NotificationEvent): Promise<void> {
    // 1. Load preferences
    const prefs = await this.service.getPreferences(event.userId, event.workspaceId);

    // 2. Check deduplication
    if (event.deduplicationKey) {
      const isDuplicate = await this.service.findDuplicateKey(event.userId, event.workspaceId, event.type, event.deduplicationKey);
      if (isDuplicate) return;
    }

    // 3. Dispatch to enabled channels — per-channel error isolation
    if (prefs.channels?.[event.type]?.inApp ?? true) {
      try { await this.inAppChannel.send(event); }
      catch (error) { this.logger.error(`In-app failed: ${error.message}`, error.stack); }
    }

    if (prefs.channels?.[event.type]?.email ?? false) {
      try { await this.emailChannel.send(event); }
      catch (error) { this.logger.error(`Email failed: ${error.message}`, error.stack); }
    }
  }
}
```

Rules:
- Strategy interface: `src/{feature}/channels/channel-strategy.interface.ts`
- Implementations: `src/{feature}/channels/{channel-name}.channel.ts`
- Dispatcher: routes to strategies based on user preferences
- Per-channel error isolation with individual try/catch (or `Promise.allSettled`)
- Pass only necessary data to strategies — avoid redundant parameters

Reference impl: `budget-api/src/notifications/channels/`

---

## Email Templates

Handlebars templates with i18n support via `nestjs-i18n` + `@nestjs-modules/mailer`.

### Template structure

```
src/mail/templates/{templateName}.hbs    # Handlebars template
src/i18n/en/{templateName}.json          # English translations
src/i18n/es/{templateName}.json          # Spanish translations
```

### i18n JSON structure

```json
{
  "subject": "Budget Exceeded: {{budgetName}}",
  "preheader": "Your budget {{budgetName}} has been exceeded.",
  "heading": "Budget Exceeded",
  "greeting": "Hi there,",
  "instruction": "Your budget has been exceeded.",
  "button": "View Budgets",
  "regards": "Best regards,",
  "signature": "The Budget Team.",
  "rightsReserved": "All rights reserved."
}
```

Keys support Handlebars interpolation (`{{variable}}`). First key is `subject`, second is `preheader`.

### `{{t "key"}}` helper in templates

```handlebars
<html lang="{{i18nLang}}">
<head><title>{{t "budgetExceeded.subject"}}</title></head>
<body>
  <h1>{{t "budgetExceeded.heading"}}</h1>
  <p>{{t "budgetExceeded.instruction"}}</p>

  <!-- CTA button pattern -->
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px auto;">
    <tr><td align="center">
      <a href="{{actionUrl}}"
         style="display:inline-block; padding:12px 24px; background:#007BFF; color:#ffffff;
                text-decoration:none; border-radius:5px; font-size:16px;">
        {{t "budgetExceeded.button"}}
      </a>
    </td></tr>
  </table>

  <p>&copy; {{year}} Budget App. {{t "budgetExceeded.rightsReserved"}}</p>
</body>
</html>
```

### MailService usage from non-request contexts

```typescript
// In MailService — handles null I18nContext for cron jobs / event handlers
async sendMail(options: ISendMailOptions) {
  options.context = {
    ...(options.context || {}),
    i18nLang: I18nContext.current()?.lang || 'en', // Falls back to 'en' outside HTTP scope
  };
  return this.mailerService.sendMail(options);
}
```

### Sending email from a job or handler

```typescript
await this.dispatcher.dispatch({
  type: NotificationType.BUDGET_EXCEEDED,
  userId, workspaceId,
  title: 'Budget Exceeded',
  message: `Your budget "${budgetName}" exceeded (${percentUsed}% used)`,
  emailTemplate: 'budgetExceeded',           // Maps to templates/budgetExceeded.hbs
  emailContext: { budgetName, spent, limit, percentUsed }, // Template variables
  deduplicationKey: `budget_exceeded_${budgetId}_${periodKey}`,
});
```

Rules:
- Template naming: matches i18n JSON filename (e.g., `budgetExceeded.hbs` <-> `budgetExceeded.json`)
- Always provide both `en` and `es` i18n JSON files
- `I18nContext.current()` returns `null` outside HTTP request scope — always use `?.lang || 'en'` fallback
- CTA buttons: use `<table>` + `<a>` pattern for email client compatibility
- The `{{t}}` helper is registered in `MailModule` via `HandlebarsAdapter({ t: i18n.hbsHelper })`
- Always pass `year: new Date().getFullYear()` in context for footer copyright

Reference impl: `budget-api/src/mail/templates/` and `budget-api/src/i18n/`
