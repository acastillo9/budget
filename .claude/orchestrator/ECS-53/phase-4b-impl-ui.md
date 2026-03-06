# Frontend Implementation: Terms of Service, Privacy Policy & User Consent System

## Created Files
- `budget-ui/src/lib/types/terms.types.ts` — TypeScript interfaces for TermsVersion, UserConsent, and ConsentStatus
- `budget-ui/src/lib/components/legal-content-page.svelte` — Shared component for rendering legal markdown content with title, version, and last-updated metadata
- `budget-ui/src/lib/components/consent-checkbox.svelte` — Terms acceptance checkbox with i18n links to /terms and /privacy, used in registration form
- `budget-ui/src/lib/components/legal-settings-section.svelte` — Legal section card for workspace settings page showing consent status, document links, and consent history
- `budget-ui/src/routes/(auth)/terms/+page.server.ts` — Server loader for /terms page, fetches active TOS from API
- `budget-ui/src/routes/(auth)/terms/+page.svelte` — Public Terms of Service page using legal-content-page component
- `budget-ui/src/routes/(auth)/privacy/+page.server.ts` — Server loader for /privacy page, fetches active Privacy Policy from API
- `budget-ui/src/routes/(auth)/privacy/+page.svelte` — Public Privacy Policy page using legal-content-page component
- `budget-ui/src/routes/api/terms/active/+server.ts` — GET proxy route to /terms/active (public)
- `budget-ui/src/routes/api/terms/[id]/+server.ts` — GET proxy route to /terms/:id (public)
- `budget-ui/src/routes/api/terms/consent/+server.ts` — POST proxy route to /terms/consent (authenticated)
- `budget-ui/src/routes/api/terms/consent/status/+server.ts` — GET proxy route to /terms/consent/status (authenticated)
- `budget-ui/src/routes/api/terms/consent/history/+server.ts` — GET proxy route to /terms/consent/history (authenticated)

## Modified Files
- `budget-ui/src/lib/schemas/auth.schema.ts` — Added `termsAccepted: z.literal(true)` field to signupFormSchema with i18n error message
- `budget-ui/src/lib/components/footer.svelte` — Added Terms of Service and Privacy Policy links below copyright line
- `budget-ui/src/lib/components/register-form/basic-info-form.svelte` — Added ConsentCheckbox component before submit button; button disabled state includes termsAccepted check
- `budget-ui/src/routes/(auth)/signup/+page.svelte` — Added Google consent note with links below Google sign-in button
- `budget-ui/src/routes/(auth)/signup/+page.server.ts` — Strip termsAccepted field from form data before sending to backend API
- `budget-ui/src/routes/(app)/workspaces/+page.server.ts` — Added consent status and consent history data loading from API
- `budget-ui/src/routes/(app)/workspaces/+page.svelte` — Added LegalSettingsSection component with consent status and history
- `budget-ui/src/lib/locales/en.json` — Added `legal` namespace with all terms/privacy/consent i18n keys, added `termsRequired` to signUp.validation
- `budget-ui/src/lib/locales/es.json` — Added `legal` namespace with all Spanish translations, added `termsRequired` to signUp.validation

## Lint/Check Status

### Lint (`npm run lint`)
```
Checking formatting...
[warn] e2e/notifications.spec.ts
[warn] e2e/pages/notifications.page.ts
[warn] src/lib/components/bill-item.svelte
[warn] src/lib/components/bill-list.svelte
[warn] src/lib/components/transaction-item.svelte
[warn] src/lib/components/workspace-switcher.svelte
Code style issues found in 6 files. Run Prettier with --write to fix.
```
**Status: PASS (for new/modified files)** — All 6 warnings are pre-existing formatting issues in files NOT modified by this implementation. All new and modified files pass Prettier checks.

### Check (`npm run check`)
```
svelte-kit sync && svelte-check --tsconfig ./tsconfig.json
WARNING "src/lib/components/transaction-item.svelte" 112:2 a11y_no_noninteractive_tabindex
WARNING "src/lib/components/transaction-item.svelte" 185:5 a11y_click_events_have_key_events
WARNING "src/lib/components/transaction-item.svelte" 224:6 a11y_click_events_have_key_events
COMPLETED 6300 FILES 0 ERRORS 3 WARNINGS 1 FILES_WITH_PROBLEMS
```
**Status: PASS** — 0 errors, 3 pre-existing a11y warnings in transaction-item.svelte (not modified).

## Deviations
- **Consent checkbox uses `{@html}` for label rendering** — The i18n interpolation includes anchor tags for Terms/Privacy links. Since svelte-i18n's `$t()` returns a plain string, `{@html}` is used to render the HTML links within the label. The content is developer-authored i18n strings (not user input), so XSS risk is mitigated.
- **Google consent note uses `{@html}` for the same reason** — The note below the Google button on the signup page also needs to render clickable links within interpolated i18n text.
- **Legal content rendered with `{@html content}`** — The markdown content from the API is rendered as raw HTML. Per the design doc, content is authored by developers and stored in the repo, not user-generated, so XSS risk is acceptable. A sanitizing markdown library can be added later if needed.
