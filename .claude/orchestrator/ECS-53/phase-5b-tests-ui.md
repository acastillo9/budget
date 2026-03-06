# UI Test Results: Terms of Service, Privacy Policy & User Consent System

## Test Files
- `budget-ui/e2e/legal.unauth.spec.ts` — 23 unauthenticated tests covering /terms, /privacy pages, footer links, consent checkbox on signup, and cross-navigation
- `budget-ui/e2e/legal.spec.ts` — 12 authenticated tests covering Legal & Privacy section on /workspaces settings page
- `budget-ui/e2e/pages/legal.page.ts` — Page Object Model for legal pages (LegalPage and LegalSettingsSection)

## Results
- Total: 35 tests
- Passed: 35
- Failed: 0

## Modified Files
- `budget-ui/e2e/pages/signup.page.ts` — Added consent checkbox locators and checkConsent/uncheckConsent methods; fillBasicInfo now ensures consent is checked
- `budget-ui/src/lib/schemas/auth.schema.ts` — Fixed termsAccepted schema from z.literal(true) to z.boolean().refine() for proper FormData compatibility with superforms
- `budget-ui/src/lib/components/register-form/basic-info-form.svelte` — Added hidden input for termsAccepted to bridge bits-ui Checkbox (button-based) with HTML FormData submission

## Test Coverage Breakdown

### Terms of Service — Page Load (3 tests, unauthenticated)
- Renders /terms page with content or graceful error state
- Has correct page title
- Shows either content card or error message

### Privacy Policy — Page Load (3 tests, unauthenticated)
- Renders /privacy page with content or graceful error state
- Has correct page title
- Shows either content card or error message

### Footer — Legal Links (5 tests, unauthenticated)
- Displays Terms of Service link in footer on signin page
- Displays Privacy Policy link in footer on signin page
- Navigates to /terms when clicking footer Terms link
- Navigates to /privacy when clicking footer Privacy link
- Displays both legal links on signup page

### Sign Up — Consent Checkbox (10 tests, unauthenticated)
- Displays consent checkbox on signup form
- Displays consent label with Terms and Privacy links
- Starts with checkbox unchecked by default
- Disables Next button when checkbox is unchecked
- Enables Next button when checkbox is checked
- Disables Next button again after unchecking
- Displays Google consent note below Google button
- Shows Terms and Privacy links in Google consent note
- Opens /terms in new tab from consent label link
- Opens /privacy in new tab from consent label link

### Legal Pages — Cross Navigation (2 tests, unauthenticated)
- Navigates from /terms to /privacy via footer link
- Navigates from /privacy to /terms via footer link

### Legal Settings — Section on Workspaces Page (9 tests, authenticated)
- Displays the Legal & Privacy section card
- Displays the section description
- Displays View Terms of Service button
- Displays View Privacy Policy button
- Has Terms link that opens /terms
- Has Privacy link that opens /privacy
- Displays consent history section heading
- Displays consent status section
- Shows consent history for registered user

### Legal Settings — Consent Status (1 test, authenticated)
- Displays either "Up to date" or "Action required" badge

### Legal Settings — Quick Links (2 tests, authenticated)
- Opens Terms of Service page from View Terms button
- Opens Privacy Policy page from View Privacy button

## Source Fixes Applied

### 1. termsAccepted Schema Fix (auth.schema.ts)
The original implementation used `z.literal(true)` for the `termsAccepted` field. This caused a critical bug where form submissions always failed server-side validation. The root cause: superforms v2 with `use:enhance` sends HTML FormData (not JSON) to the server. The bits-ui Checkbox component renders as a `<button>` element (not `<input type="checkbox">`), so the `termsAccepted` value was never included in the FormData sent to the server.

**Fix:** Changed schema to `z.boolean().refine(val => val === true, ...)` which:
- Defaults to `false` (checkbox starts unchecked, correct UX for consent)
- Works with superforms' FormData boolean coercion (string "on" -> true)

### 2. Hidden Input for FormData (basic-info-form.svelte)
Added a conditional hidden input `<input type="hidden" name="termsAccepted" value="on" />` that renders only when `$formData.termsAccepted` is true. This bridges the gap between the bits-ui Checkbox (which uses `bind:checked` for JS state) and the HTML form's FormData submission mechanism.

### 3. Checkbox Hydration Timing (signup.page.ts)
Added `waitForLoadState('networkidle')` in the `checkConsent()` POM method before clicking the checkbox. Without this, Svelte's hydration may not have completed, causing the bits-ui Checkbox click to silently fail.

## Regression Testing
- All 37 existing auth.unauth.spec.ts tests pass (0 regressions)
- All 12 new legal.spec.ts tests pass
- All 23 new legal.unauth.spec.ts tests pass
- Total verified: 72 tests, 72 passed, 0 failed

## Unresolved Failures
- None
