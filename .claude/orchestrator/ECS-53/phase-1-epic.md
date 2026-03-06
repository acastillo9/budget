# Epic: ECS-53 — Terms of Service, Privacy Policy & User Consent System

## Description

The Budget application stores sensitive personal data (name, email, profile picture, Google OAuth tokens, hashed passwords) and financial data (account balances, transactions, bills, budgets, receipts). It currently has **zero legal infrastructure** — no Terms of Service, no Privacy Policy, no consent tracking. This epic adds the full legal compliance layer that financial applications require.

### Data the App Handles

* **Personal Information:** Name, email, profile picture, hashed passwords, Google OAuth tokens
* **Financial Data:** Account balances, transactions, bills, budgets, categories
* **Attachments:** Receipt images stored in AWS S3
* **Third-party Integrations:** Google OAuth, exchange rate API

### Key Decisions

| Decision | Choice |
| --- | --- |
| Existing users | Grandfathered in — only new users must accept at registration |
| Versioning | Yes — track consent per terms version for future updates |
| Privacy Policy | Separate page alongside Terms of Service |
| Languages | Bilingual — English (en) and Spanish (es) |
| Public access | ToS and Privacy Policy pages accessible without authentication |

### Story Dependency Graph

```
Story 1 (Content)  ──────────────────────────┐
                                              │
Story 2 (Data Model) ──> Story 3 (API) ──> Story 4 (Pages) ──> Story 5 (Registration Gate)
                              │
                              └──────────────> Story 6 (Settings Legal Section)
```

**Implementation order:** Stories 1 & 2 (parallel) → Story 3 → Stories 4 & 6 (parallel) → Story 5

### Out of Scope

* Forced re-acceptance for existing users (can be added later with the versioning system)
* Cookie consent banner
* GDPR data export/deletion (Article 15, 17)
* Admin panel for publishing new terms versions (can seed via migration)
* SMS/push notifications for terms updates

---

## Stories & Tasks

### ECS-54 — Legal Content — Terms of Service & Privacy Policy
- **Type:** Story
- **Status:** Backlog (To Do)
- **Priority:** Medium
- **Description:** Draft the actual legal text for the Terms of Service and Privacy Policy documents that will be served by the Budget application. Both documents must be bilingual (English and Spanish) and stored as markdown files in the repository for seeding into the database. The ToS must cover standard clauses (service description, user responsibilities, account creation, acceptable use, intellectual property, limitation of liability, termination, dispute resolution, modification clause, contact information). The Privacy Policy must cover data collected (personal, financial, technical, attachments), how data is used, storage & security, third-party services, data retention, user rights, cookies & tracking, children's privacy, international transfers, and contact information.
- **Acceptance Criteria:**
  - [ ] ToS covers all standard clauses listed above for a personal finance application
  - [ ] Privacy Policy accurately reflects the app's data handling (accounts, transactions, bills, budgets, attachments, notifications)
  - [ ] Both documents available in English and Spanish
  - [ ] Content stored as markdown files in the repository under `budget-api/src/modules/terms/content/`
  - [ ] Documents are well-structured with clear headings and sections
  - [ ] Last updated date included in each document
  - [ ] Version number included (v1.0.0)

### ECS-55 — Terms Version & User Consent Data Model (Backend)
- **Type:** Story
- **Status:** Backlog (To Do)
- **Priority:** Medium
- **Description:** Create Mongoose schemas for tracking terms/policy versions and user consent records. These are the foundational data models that all other stories in the epic depend on. Includes a `TermsVersion` schema (type, version, title, content, locale, publishedAt, isActive) with compound index on `{ type, locale, isActive }` and a `UserConsent` schema (user, termsVersion, acceptedAt, ipAddress, userAgent) with compound index on `{ user, termsVersion }` with unique constraint. Both extend `AuditableSchema`.
- **Acceptance Criteria:**
  - [ ] `TermsVersion` schema created with all fields listed above
  - [ ] `UserConsent` schema created with all fields listed above
  - [ ] Both schemas extend `AuditableSchema` for automatic `createdAt`/`updatedAt` timestamps
  - [ ] Proper Mongoose indexes defined for efficient querying
  - [ ] Unique constraint prevents duplicate active versions per (type + locale)
  - [ ] Unique constraint prevents duplicate consent records per (user + termsVersion)
  - [ ] Enums created for `TermsType` (`TOS`, `PRIVACY_POLICY`) and `Locale` (`en`, `es`)
  - [ ] Schemas registered in a `TermsModule`
  - [ ] Entity files follow existing project patterns

### ECS-56 — Terms & Consent API Endpoints (Backend)
- **Type:** Story
- **Status:** Backlog (To Do)
- **Priority:** Medium
- **Description:** Create a `TermsModule` with controller and service providing endpoints for retrieving legal documents and managing user consent. Public endpoints: `GET /terms/active` (returns current active ToS and Privacy Policy for requested locale) and `GET /terms/:id` (get specific terms version by ID). Authenticated endpoints: `POST /terms/consent` (record user acceptance), `GET /terms/consent/status` (check if user has accepted all current active versions), `GET /terms/consent/history` (get user's full consent history). Service includes `recordBulkConsent` method for registration flow.
- **Acceptance Criteria:**
  - [ ] Public endpoints don't require authentication (use `@Public()` decorator)
  - [ ] Consent endpoints require authentication (JwtAuthGuard — global default)
  - [ ] DTOs use `class-validator` decorators for input validation
  - [ ] `POST /terms/consent` is idempotent — accepting the same version twice doesn't create duplicate records
  - [ ] Consent status correctly identifies pending versions the user hasn't accepted
  - [ ] `recordBulkConsent` method available for the registration flow to use
  - [ ] IP address extracted from request (consider `X-Forwarded-For` header for proxied requests)
  - [ ] User agent extracted from request headers
  - [ ] Locale parameter defaults to `en` when not provided
  - [ ] Module properly imports and exports service for use by other modules (e.g., AuthModule for registration)
  - [ ] Follows existing NestJS patterns in the project (controller + service + module + DTOs)

### ECS-57 — Terms & Privacy Policy Public Pages (Frontend)
- **Type:** Story
- **Status:** Backlog (To Do)
- **Priority:** Medium
- **Description:** Create publicly accessible pages for viewing the Terms of Service (`/terms`) and Privacy Policy (`/privacy`), and add footer links to these pages across all application layouts (both authenticated and unauthenticated). Pages fetch active content from `GET /terms/active?locale={userLocale}`, render markdown as formatted HTML with proper Tailwind CSS styling. Footer links added to login, registration, and main app layouts with subtle/secondary styling.
- **Acceptance Criteria:**
  - [ ] `/terms` page accessible without authentication, renders ToS from API
  - [ ] `/privacy` page accessible without authentication, renders Privacy Policy from API
  - [ ] Markdown content rendered as formatted HTML with proper styling
  - [ ] Footer links visible on login and registration pages
  - [ ] Footer links visible on authenticated app layouts
  - [ ] Content loaded for the user's current locale (en/es)
  - [ ] Responsive design — readable on mobile and desktop
  - [ ] Loading state while content is being fetched
  - [ ] Error state if content fails to load
  - [ ] Page titles set correctly for browser tab
  - [ ] i18n translation keys added for both English and Spanish
  - [ ] Pages follow existing SvelteKit routing and layout patterns

### ECS-58 — Registration Consent Gate (Frontend + Backend)
- **Type:** Story
- **Status:** Backlog (To Do)
- **Priority:** Medium
- **Description:** Modify the registration flow to require users to accept the Terms of Service and Privacy Policy before creating an account. Applies to both email registration and Google OAuth registration flows. Frontend: add required consent checkbox with links to `/terms` and `/privacy`, Zod schema validation with `z.literal(true)`. Backend: after successful user creation, call `TermsService.recordBulkConsent()` to record acceptance of all current active terms versions. Consent recording is non-blocking (registration succeeds even if consent recording fails).
- **Acceptance Criteria:**
  - [ ] Registration form has a required consent checkbox with links to `/terms` and `/privacy`
  - [ ] Form validation prevents submission without acceptance (checkbox must be checked)
  - [ ] Clear error message displayed when trying to submit without accepting
  - [ ] Links in the checkbox label navigate to the correct pages (open in new tab)
  - [ ] On successful email registration, consent records created for both active ToS and Privacy Policy versions
  - [ ] On successful Google OAuth registration (new users only), consent records created
  - [ ] Consent recorded with IP address and user agent
  - [ ] Consent recording is non-blocking — registration succeeds even if consent recording fails
  - [ ] Existing login flow is NOT affected (no consent check on login)
  - [ ] i18n: All new text available in English and Spanish
  - [ ] Registration form schema updated with Zod validation

### ECS-59 — Settings — Legal Section & Consent History (Frontend)
- **Type:** Story
- **Status:** Backlog (To Do)
- **Priority:** Medium
- **Description:** Add a legal/compliance section to the user settings page that shows links to current legal documents, the user's consent status, and their consent history (when they accepted each version). Includes section header "Legal & Privacy", links to `/terms` and `/privacy`, consent status indicator (green check / "Up to date" or warning / "Action required"), and consent history list showing document title, version number, and date accepted, sorted by most recent first.
- **Acceptance Criteria:**
  - [ ] Legal section visible in the user settings/profile page
  - [ ] Links to current Terms of Service and Privacy Policy pages
  - [ ] Consent status indicator shows whether all current versions are accepted
  - [ ] Consent history displays all accepted versions with dates
  - [ ] History sorted by most recent acceptance first
  - [ ] Dates formatted according to user's locale
  - [ ] Empty state handled when no consent history exists (e.g., grandfathered users)
  - [ ] i18n: All text available in English and Spanish
  - [ ] Section matches existing settings page design patterns
  - [ ] Responsive design — works on mobile and desktop

---

## Stats
- **Total issues:** 6
- **By type:** 6 stories, 0 tasks, 0 subtasks
- **By status:** 6 To Do (Backlog), 0 In Progress, 0 Done
