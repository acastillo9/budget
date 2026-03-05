# Skills Analysis: Notification System & Multi-Channel Alerts (ECS-45)

## Skill Usage Summary

| Skill | Phase(s) | Effectiveness | Notes |
|-------|----------|---------------|-------|
| `epic-orchestrator` | All (1-7) | High | Successfully coordinated 7 phases with STATUS.md tracking, parallel 4a/4b and 5a/5b dispatch, and user checkpoints. Token efficiency contract worked well. |
| `budget-api` | 2 (Design), 4a (Impl), 6 (Review) | High | Controller, service, entity, DTO, and module patterns directly applicable. Notification module followed all conventions. Deviations were minor and well-documented (e.g., omitting @Roles for user-scoped operations). |
| `budget-ui` | 2 (Design), 4b (Impl), 6 (Review) | High | Proxy route, component, i18n, type, and schema patterns directly applicable. 12 files created, 3 modified -- all followed skill conventions. |
| `svelte-code-writer` | 4b (Impl) | Medium | Provided Svelte 5 runes documentation reference, but the 4 new components (bell, panel, item, preferences-dialog) were layout-integrated components without dedicated pages, a pattern not explicitly covered by the skill. The skill's CLI tools (list-sections, get-documentation) were useful for $state/$effect/$bindable patterns. |
| `frontend-design` | 4b (Impl) | Low | The skill's creative-first approach (bold aesthetics, unusual fonts, unexpected layouts) was not aligned with this feature. Notifications UI needed to integrate seamlessly into the existing app header and follow established design patterns (Sheet, Dialog, Switch from shadcn-svelte). The skill's guidance pushed toward "distinctive, unforgettable" design when functional consistency was the actual requirement. |
| `budget-mermaid-docs` | 3 (Docs) | High | Created 3 diagrams (class, sequence, ER) following the exact naming and structure conventions. No friction. |
| `budget-test-api` | 5a (Tests) | High | 62 tests written following the E2E patterns. Test infrastructure (createTestApp, auth helpers, db helpers) all applicable. The `seedNotification` and `seedNotificationPreference` helpers were new but followed existing seed patterns. |
| `budget-test-ui` | 5b (Tests) | Medium | 33 tests written with POM and API mocking via `page.route()`. All tests failed due to auth fixture requiring live backend/Mailpit -- a known infrastructure dependency. The skill does not document how to handle tests for layout-embedded features (no dedicated page route), which required navigating to `/` and interacting with overlay components. |
| `code-review` | 6 (Review) | High | Found 2 critical, 9 warnings, 10 suggestions across 42 files. The checklist-based approach (conventions, security, error handling, TypeScript, i18n, reuse) systematically caught the I18nContext null issue in email.channel.ts and the N+1 query patterns in scheduled jobs. |
| `find-skills` | -- | N/A | Not used during this epic. |
| `skill-creator` | -- | N/A | Not used during this epic (no skills were created or updated). |
| `web-design-guidelines` | -- | N/A | Not invoked. Could have been useful in phase 4b for accessibility review of notification components (the code review later caught a11y issues in notification-item.svelte). |

## Identified Gaps

### Gap 1: No guidance for event-driven architecture patterns
The `budget-api` skill covers CRUD (controller/service/entity/DTO/module) but has no patterns for:
- Event emitter setup (`@nestjs/event-emitter`, `EventEmitter2` injection, `@OnEvent` handlers)
- Event handler file structure (`src/{feature}/handlers/{name}.handler.ts`)
- Event payload interface definitions
- Fire-and-forget error isolation (try/catch in event handlers to avoid crashing the emitter)
- Deduplication strategies

**Impact:** Phase 4a had to derive these patterns from scratch. The code review found issues with inline event interfaces typed as `any` (suggestion in phase 6), duplicate preference queries across handlers (warning), and duplicated period utility methods (warning). Explicit patterns would have prevented these.

**Suggested action:** Update `budget-api` skill with an "Event-Driven Patterns" section.

### Gap 2: No guidance for scheduled job / cron patterns
The `budget-api` skill has no patterns for:
- `@nestjs/schedule` setup and `@Cron` decorator usage
- Distributed locking for multi-instance deployments
- Cron schedule configuration via `process.env` (since `@Cron` evaluates at class definition time, before DI)
- Batch processing patterns to avoid N+1 queries in jobs
- Job file structure (`src/{feature}/jobs/{name}.job.ts`)

**Impact:** Phase 4a created 5 cron jobs without batch processing guidance, leading to N+1 query patterns caught in phase 6. The `process.env` vs `ConfigService` tension was also flagged as a warning.

**Suggested action:** Update `budget-api` skill with a "Scheduled Jobs Patterns" section.

### Gap 3: No guidance for strategy / channel patterns
The `budget-api` skill covers services but not multi-strategy dispatch patterns:
- Interface-based channel strategies
- Dispatcher service that routes to multiple strategies based on configuration
- Error isolation per strategy (one failure should not block others)
- File structure for strategies (`src/{feature}/channels/` or `src/{feature}/strategies/`)

**Impact:** The channel strategy implementation was correct but the code review found redundant data passing between InAppChannel and NotificationsService (critical #2 in phase 6). An explicit strategy pattern would have clarified the data flow.

**Suggested action:** Update `budget-api` skill with a "Strategy Patterns" section under Advanced Patterns.

### Gap 4: No guidance for layout-embedded UI features (non-page components)
The `budget-ui` skill's page structure assumes each feature has its own `(app)/feature/+page.server.ts` + `+page.svelte`. The notification system has no dedicated page route -- it lives entirely in the `(app)/+layout.svelte` with a bell icon, Sheet overlay, and Dialog. The skill lacks patterns for:
- Client-side-only state management in layout (no server load, no form actions)
- Polling with `$effect` + `setInterval` (cleanup, visibility guards)
- Integrating multiple overlay components (Sheet + Dialog) into the layout
- Client-side fetch patterns without `superValidate` / `form actions`

**Impact:** Phase 4b had to improvise the state management and polling approach. The code review later found performance issues with the polling effect (no document visibility check) and `dayjs.extend()` being called at component scope.

**Suggested action:** Update `budget-ui` skill with a "Layout-Embedded Features" section covering client-side state + polling patterns.

### Gap 5: No guidance for Handlebars email templates
The epic required 9 Handlebars email templates with i18n JSON files. No skill covers:
- Handlebars template structure following existing `workspaceInvitation.hbs`
- i18n JSON file naming and key structure for email templates
- `{{t "key"}}` helper usage in templates
- CTA button patterns
- The relationship between `MailService.sendMail()`, `I18nContext`, and non-request contexts

**Impact:** The critical #1 issue in the code review (I18nContext null in cron/event contexts) was directly caused by this gap. The implementation correctly created templates but did not account for MailService's dependency on HTTP request context for i18n resolution.

**Suggested action:** Update `budget-api` skill with an "Email Templates" section, or create a dedicated `budget-email-templates` skill if email functionality grows.

### Gap 6: UI E2E tests for layout-embedded features lack pattern guidance
The `budget-test-ui` skill assumes features have dedicated page routes for navigation. The notification tests needed to:
- Navigate to `/` (dashboard) and interact with layout-embedded components
- Mock multiple API endpoints with stateful in-memory stores
- Test overlay interactions (Sheet open/close, Dialog within Sheet)

**Impact:** Phase 5b tests were well-structured but all 33 failed due to the auth fixture requiring live infrastructure. The skill's POM template assumes a feature-specific page, not a layout overlay. A pattern for layout-overlay testing would reduce friction.

**Suggested action:** Update `budget-test-ui` skill with a "Layout-Embedded Feature Testing" section.

## Improvement Recommendations

### 1. `budget-api` -- Add Event-Driven Architecture section
Add patterns for:
- `EventEmitter2` injection and `@OnEvent` decorator usage
- Handler file naming: `src/{feature}/handlers/{event-name}.handler.ts`
- Event payload interfaces (typed, in a shared location, not inline `any`)
- Error isolation: always wrap handler logic in try/catch
- Deduplication pattern (check-before-dispatch with time window)
- Shared event interfaces file: `src/{feature}/events/{event-name}.event.ts`

### 2. `budget-api` -- Add Scheduled Jobs section
Add patterns for:
- `@Cron(process.env.ENV_VAR || 'default')` (explain why ConfigService cannot be used)
- Job file naming: `src/{feature}/jobs/{job-name}.job.ts`
- Distributed lock pattern using a MongoDB lock collection
- Batch processing: group-by-workspace, bulk-load preferences, avoid N+1
- Logging pattern: log execution metrics (items processed, notifications sent, duration)

### 3. `budget-api` -- Add Strategy / Dispatcher section (or add to Advanced Patterns reference)
Add patterns for:
- Interface-based strategy definitions (`src/{feature}/channels/` or `strategies/`)
- Dispatcher service that routes to strategies based on configuration
- Per-strategy error isolation with `Promise.allSettled`
- Passing only necessary data to strategies (avoid redundant parameters)

### 4. `budget-api` -- Add Email Template section
Add patterns for:
- Handlebars template file location and naming
- i18n JSON file structure for email content
- MailService usage from non-request contexts (cron jobs, event handlers): must handle null `I18nContext`
- CTA button template pattern

### 5. `budget-ui` -- Add Layout-Embedded Features section
Add patterns for:
- Client-side state in `(app)/+layout.svelte` for overlay features
- Polling with `$effect` + `setInterval` (include `document.hidden` guard for visibility)
- Multiple overlay components (Sheet + Dialog) coordinated from layout
- Client-side fetch without form actions (direct `fetch` + `toast` for success/error)
- `dayjs` plugin initialization at app level, not component level

### 6. `budget-test-ui` -- Add Layout/Overlay Testing patterns
Add patterns for:
- Testing features embedded in the layout (navigate to any app page, interact with header/overlay)
- Stateful API mocking with `page.route()` for multiple endpoints sharing state
- Testing Sheet/Dialog overlay interactions (open, interact, close, verify state changes)

### 7. `code-review` -- Add I18nContext and Non-Request Context check
Add to the review checklist:
- Check for `I18nContext.current()` usage in code paths reachable from cron jobs or event handlers (returns null outside HTTP request scope)

### 8. `web-design-guidelines` -- Should be invoked in Phase 4b
The epic orchestrator does not invoke `web-design-guidelines` during frontend implementation. The code review later caught accessibility issues (missing `role="button"`, `tabindex`, keyboard handlers on clickable notification items). Invoking this skill during phase 4b or adding an a11y check to the phase 4b prompt would catch these earlier.

## New Skill Candidates

### 1. `budget-notifications` -- Notification system patterns and conventions
- **Purpose:** Centralize patterns for adding new notification types, event triggers, email templates, and UI event type mappings. As the notification system grows (SMS channel, push notifications, new event types), having a dedicated skill ensures consistency.
- **Trigger:** "Add a new notification type", "create a notification for...", "add an alert for..."
- **Content:** NotificationType enum extension checklist, new event handler template, email template + i18n checklist, UI icon map update, preference channel defaults, dispatcher routing
- **Estimated value:** Medium -- only valuable if the notification system expands significantly. If notifications remain stable, updating `budget-api` and `budget-ui` skills is sufficient.

### 2. `budget-i18n` -- Internationalization patterns and conventions
- **Purpose:** Consolidate i18n guidance across both subprojects. Currently, i18n patterns are split across `budget-api` (backend i18n JSON files, nestjs-i18n, MailService templates) and `budget-ui` (svelte-i18n, en.json/es.json, key naming). A unified skill would cover both, plus the cross-project concerns (email templates that need both backend i18n and frontend display names).
- **Trigger:** "Add translations for...", "create i18n keys", "add a new language"
- **Content:** Key naming conventions, file structure for both projects, backend i18n JSON template, frontend locale JSON template, Handlebars `{{t}}` helper, common pitfalls (I18nContext null in non-request scope)
- **Estimated value:** Medium -- reduces friction for any feature that touches i18n (most features do). The I18nContext null pitfall alone would justify the skill.

### 3. `budget-cron-jobs` -- Scheduled job patterns (alternative: section in budget-api)
- **Purpose:** Dedicated guidance for creating and maintaining cron jobs in the budget-api.
- **Trigger:** "Create a scheduled job", "add a cron job", "schedule a recurring task"
- **Content:** @Cron decorator with env var defaults, distributed locking, batch processing, logging/metrics, error handling, testing strategies
- **Estimated value:** Low -- better as a section in `budget-api` unless the project accumulates many more cron jobs beyond the current 5.

## Summary

- **Skills that worked well:** `epic-orchestrator`, `budget-api` (core CRUD), `budget-ui` (page patterns), `budget-mermaid-docs`, `budget-test-api`, `code-review`
- **Skills with reduced effectiveness:** `frontend-design` (wrong fit for integration work), `svelte-code-writer` (useful but limited for layout-embedded patterns), `budget-test-ui` (no layout overlay testing patterns)
- **Biggest friction points:** Event-driven architecture (no patterns), scheduled jobs (no patterns), email templates in non-request context (I18nContext null -- critical bug), layout-embedded UI features (no patterns)
- **Most impactful improvement:** Adding event-driven + scheduled job + email template sections to `budget-api` would have prevented the 2 critical issues and 3 of the 9 warnings found in the code review
