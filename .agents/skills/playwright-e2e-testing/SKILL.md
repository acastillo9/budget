---
name: playwright-e2e-testing
description: Create, plan, and execute Playwright end-to-end tests for SvelteKit web applications, with emphasis on personal finance management apps. Use when asked to write E2E tests, create Playwright tests, test workflows end-to-end, test user flows, add integration tests, improve Playwright configuration, set up E2E testing infrastructure, or test any feature involving authentication, accounts, transactions, bills, budgets, or categories. Also use when asked to review or improve existing E2E test coverage.
---

# Playwright E2E Testing for SvelteKit

Create comprehensive Playwright E2E tests by exploring the codebase, planning test scenarios, and writing robust tests that cover complete user workflows.

## Workflow Overview

Creating E2E tests involves these steps:

1. Explore the codebase (understand routes, types, schemas, UI components)
2. Evaluate and improve Playwright configuration
3. Plan test scenarios (prioritize by criticality)
4. Write tests (using Page Object Model and best practices)
5. Run and verify tests

## Step 1: Explore the Codebase

Before writing any test, thoroughly understand what you're testing. Read the [Test Planning Guide](references/test-planning-guide.md) for the detailed exploration checklist.

### Quick exploration sequence

1. Read `playwright.config.ts` — current configuration state
2. Read `src/routes/` structure — identify all pages and server actions
3. Read `src/lib/schemas/` — understand form fields and validation rules
4. Read `src/lib/types/` — understand data models
5. Read `src/hooks.server.ts` — understand auth flow
6. Read existing `e2e/` tests — understand current patterns and conventions
7. Read page components (`+page.svelte`) for the feature being tested — identify UI elements, dialogs, forms, lists, buttons

Capture this information to inform scenario planning. Pay special attention to:

- **Form fields and validation rules** from Zod schemas (required fields, min/max, patterns)
- **Data relationships** between entities (e.g., transactions reference accounts and categories)
- **Auth requirements** — which routes are protected, how redirects work
- **UI patterns** — does the app use dialogs/sheets for forms? How are lists rendered? What feedback mechanisms exist (toasts, redirects)?

## Step 2: Evaluate and Improve Configuration

Read the current `playwright.config.ts` and compare against the recommended configuration in [Playwright + SvelteKit Patterns](references/playwright-sveltekit-patterns.md#project-configuration).

### Configuration checklist

Verify and improve these settings:

- [ ] `fullyParallel: true` — parallel test execution
- [ ] `forbidOnly: !!process.env.CI` — prevent `.only` from reaching CI
- [ ] `retries` — retry on CI (2), none locally (0)
- [ ] `reporter` — HTML + list reporters configured
- [ ] `use.baseURL` — set to the preview server URL
- [ ] `use.trace` — `'on-first-retry'` for debugging
- [ ] `use.screenshot` — `'only-on-failure'` for debugging
- [ ] `webServer.reuseExistingServer` — `!process.env.CI`
- [ ] Auth `setup` project — if app has authentication
- [ ] `storageState` on authenticated projects — to share auth state
- [ ] Separate project for unauthenticated tests — if needed

### Directory structure

Ensure the E2E test directory follows the recommended structure:

```
e2e/
├── .auth/              # gitignored auth state
├── fixtures/           # Custom fixtures and test data
├── pages/              # Page Object Models
│   └── components/     # Shared component POs
├── auth.setup.ts       # Auth setup
└── *.spec.ts           # Test files
```

Add `e2e/.auth/` to `.gitignore` if not already there.

### Environment variables

If using a real backend for auth, ensure test credentials are available:

- `TEST_USER_EMAIL` — test account email
- `TEST_USER_PASSWORD` — test account password

These should be documented but never committed. Check for `.env.test` or similar.

## Step 3: Plan Test Scenarios

Read the [Test Planning Guide](references/test-planning-guide.md#scenario-planning-framework) for the full framework.

### Planning process

1. **Identify the feature scope** — which pages/flows are being tested?
2. **List all user interactions** on those pages (forms, buttons, navigation, dialogs)
3. **Categorize scenarios** by priority:

   - **P0 Critical**: Auth flows, core page loads, primary CRUD operations
   - **P1 High**: Form validation, error handling, complete CRUD cycles
   - **P2 Medium**: Cross-feature workflows, filters, navigation
   - **P3 Low**: Edge cases, responsive behavior

4. **Define test data needs** — what mock data or backend state is required?
5. **Identify dependencies** — does this test need other entities to exist first? (e.g., testing transactions needs accounts and categories)

### Scenario template

For each test, define:

- **Name**: Descriptive test name (`should create a new checking account with USD currency`)
- **Preconditions**: Auth state, existing data, page state
- **Steps**: User actions in sequence
- **Expected outcome**: What the user should see after completion

## Step 4: Write Tests

Read the [Playwright + SvelteKit Patterns](references/playwright-sveltekit-patterns.md) for detailed patterns.

### Core principles

1. **Use Page Object Model** for any page tested by more than one spec. Keep POs in `e2e/pages/`.
2. **Prefer accessible locators** in this order: `getByRole()` > `getByLabel()` > `getByPlaceholder()` > `getByText()` > `getByTestId()`.
3. **Test user-visible behavior**, not implementation details. Assert on what users see.
4. **Each test should be independent** — don't rely on test execution order.
5. **Use `expect` with meaningful assertions** — prefer `toBeVisible()`, `toHaveText()`, `toHaveURL()` over generic `toBeTruthy()`.

### Auth setup pattern

For apps using JWT cookies, create `e2e/auth.setup.ts`:

```typescript
import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
	await page.goto('/signin');
	// Fill credentials from env vars
	await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
	await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD!);
	await page.getByRole('button', { name: /sign in/i }).click();
	await page.waitForURL('/');
	await page.context().storageState({ path: authFile });
});
```

### Test file pattern

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/feature-url');
	});

	test('should display the page correctly', async ({ page }) => {
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('should create a new item', async ({ page }) => {
		await page.getByRole('button', { name: /add|create|new/i }).click();
		// Fill form...
		await page.getByRole('button', { name: /save|submit/i }).click();
		// Verify success toast
		await expect(page.locator('[data-sonner-toast]')).toBeVisible();
	});
});
```

### Testing approach decision

**Choose the testing approach based on context:**

- **Real backend available** → Use real API calls, seed test data via auth setup, clean up after tests
- **No backend / isolated tests needed** → Use `page.route()` to intercept SvelteKit API routes (`/api/*`) and return mock data matching types from `src/lib/types/`
- **Hybrid (recommended)** → Real backend for auth and critical paths; mocks for error scenarios and edge cases

### Writing workflow tests

For complete workflow tests that span multiple features:

```typescript
test('complete transaction workflow', async ({ page }) => {
	// 1. Ensure prerequisites exist (or create them)
	await page.goto('/categories');
	// Create category if needed...

	// 2. Navigate to main feature
	await page.goto('/transactions');

	// 3. Perform the workflow
	await page.getByRole('button', { name: /add/i }).click();
	// Fill form with references to prerequisite entities...

	// 4. Verify end state
	await expect(page.getByText('Transaction created')).toBeVisible();
});
```

## Step 5: Run and Verify

### Running tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test e2e/accounts.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run with UI mode (interactive debugging)
npx playwright test --ui

# Run specific test by name
npx playwright test -g "should create account"

# Show HTML report after run
npx playwright show-report
```

### Debugging failures

1. Check the HTML report: `npx playwright show-report`
2. Review traces: attach `--trace on` or check retried tests
3. Use `--headed` to watch the test execute
4. Use `--ui` for step-by-step debugging with time-travel
5. Add `await page.pause()` in test code for interactive debugging

### Common issues and fixes

| Issue                    | Cause                               | Fix                                                                 |
| ------------------------ | ----------------------------------- | ------------------------------------------------------------------- |
| Element not found        | Page not loaded, selector wrong     | Add `waitForURL()` or `waitForLoadState()` before assertion         |
| Timeout on click         | Element obscured or not interactive | Check for overlays, use `{ force: true }` as last resort            |
| Auth fails in CI         | Missing env vars                    | Ensure `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are set in CI     |
| Flaky tests              | Race conditions, animations         | Add explicit waits, use `expect().toBeVisible()` before interaction |
| Wrong URL after redirect | SvelteKit route groups              | Remember `(app)` and `(auth)` groups don't appear in URLs           |

## Conditional Workflows

### User asks to "write tests for [feature]"

1. Explore the feature's page component, server file, and related schemas/types
2. Plan scenarios using the framework above
3. Create Page Object Model if the page has significant interactions
4. Write tests covering happy path, validation, and error cases
5. Run tests and fix any issues

### User asks to "improve E2E configuration"

1. Read current `playwright.config.ts`
2. Compare against the recommended configuration checklist above
3. Apply improvements incrementally
4. Verify the config works by running existing tests
5. Set up auth infrastructure (setup project, storage state) if missing

### User asks to "test the complete workflow"

1. Identify all features involved in the workflow
2. Determine entity dependencies (which entities must exist first)
3. Plan the test to create prerequisites, execute the workflow, and verify the end state
4. Write a single test or test suite that covers the full flow
5. Consider cleanup of test data if using a real backend

### User asks to "add test coverage"

1. Run full codebase exploration (Step 1)
2. Audit existing tests against the feature list
3. Identify coverage gaps
4. Prioritize missing scenarios using the priority matrix
5. Write tests for the highest-priority gaps first
