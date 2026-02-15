# Playwright + SvelteKit Patterns

## Table of Contents

1. [Project Configuration](#project-configuration)
2. [Authentication Patterns](#authentication-patterns)
3. [Page Object Model](#page-object-model)
4. [Form Testing Patterns](#form-testing-patterns)
5. [API Mocking & Interception](#api-mocking--interception)
6. [Common Utilities](#common-utilities)
7. [SvelteKit-Specific Patterns](#sveltekit-specific-patterns)

---

## Project Configuration

### Recommended playwright.config.ts for SvelteKit

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Auth setup project runs first
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
```

### Key configuration points

- `fullyParallel: true` - Run tests in parallel for speed
- `forbidOnly: !!process.env.CI` - Prevent `.only` tests from reaching CI
- `retries` - Retry flaky tests in CI
- `trace: 'on-first-retry'` - Capture traces for debugging failures
- `screenshot: 'only-on-failure'` - Auto-screenshot on failures
- `reuseExistingServer` - Reuse dev server in local development
- `projects` with `setup` dependency - Handle authentication once, share state

### Recommended directory structure

```
e2e/
├── .auth/                    # Stored auth state (gitignore this)
│   └── user.json
├── fixtures/                 # Custom fixtures and test helpers
│   ├── test-fixtures.ts      # Extended test with custom fixtures
│   └── mock-data.ts          # Reusable test data
├── pages/                    # Page Object Models
│   ├── signin.page.ts
│   ├── dashboard.page.ts
│   ├── accounts.page.ts
│   ├── transactions.page.ts
│   ├── bills.page.ts
│   ├── categories.page.ts
│   └── components/           # Shared component POs
│       ├── navbar.component.ts
│       └── form-dialog.component.ts
├── auth.setup.ts             # Authentication setup
├── auth.spec.ts              # Auth flow tests
├── accounts.spec.ts          # Account management tests
├── transactions.spec.ts      # Transaction tests
├── bills.spec.ts             # Bills tests
├── categories.spec.ts        # Category tests
└── dashboard.spec.ts         # Dashboard tests
```

---

## Authentication Patterns

### Auth setup file (auth.setup.ts)

For apps with JWT auth stored in httpOnly cookies, use a setup project:

```typescript
import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard after login
  await page.waitForURL('/');
  await expect(page.locator('h1')).toBeVisible();

  // Save auth state (cookies + localStorage)
  await page.context().storageState({ path: authFile });
});
```

### Using auth state in tests

Tests that depend on the `setup` project will automatically load the stored auth state (cookies), so they start authenticated.

### Testing unauthenticated flows

For tests that should NOT have auth state (e.g., testing the login page itself), create a separate project without `storageState`:

```typescript
{
  name: 'unauthenticated',
  use: { ...devices['Desktop Chrome'] },
  testMatch: /.*\.unauth\.spec\.ts/,
},
```

---

## Page Object Model

### Base pattern

```typescript
import { type Page, type Locator } from '@playwright/test';

export class AccountsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addButton: Locator;
  readonly accountList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.addButton = page.getByRole('button', { name: /add|create|new/i });
    this.accountList = page.getByRole('list');
  }

  async goto() {
    await this.page.goto('/accounts');
  }

  async createAccount(data: { name: string; balance: string; type: string; currency: string }) {
    await this.addButton.click();
    await this.page.getByLabel(/name/i).fill(data.name);
    await this.page.getByLabel(/balance/i).fill(data.balance);
    // Select account type and currency...
    await this.page.getByRole('button', { name: /save|create|submit/i }).click();
  }

  async getAccountByName(name: string): Promise<Locator> {
    return this.page.getByRole('listitem').filter({ hasText: name });
  }
}
```

### Locator strategy priority (most to least preferred)

1. `page.getByRole()` - Accessible roles (button, heading, link, listitem)
2. `page.getByLabel()` - Form inputs by label text
3. `page.getByPlaceholder()` - Form inputs by placeholder
4. `page.getByText()` - Visible text content
5. `page.getByTestId()` - data-testid attributes (last resort)

---

## Form Testing Patterns

### Testing superforms-based forms

SvelteKit apps using sveltekit-superforms typically have:
- Client-side validation (Zod schemas)
- Server-side form actions
- Toast notifications for success/error feedback

```typescript
test('should show validation errors', async ({ page }) => {
  await page.goto('/accounts');
  await page.getByRole('button', { name: /add/i }).click();

  // Submit empty form
  await page.getByRole('button', { name: /save/i }).click();

  // Check for validation error messages
  await expect(page.getByText(/name is required/i)).toBeVisible();
});

test('should create entity successfully', async ({ page }) => {
  await page.goto('/accounts');
  await page.getByRole('button', { name: /add/i }).click();

  // Fill form
  await page.getByLabel(/name/i).fill('Test Account');
  await page.getByLabel(/balance/i).fill('1000');

  // Submit
  await page.getByRole('button', { name: /save/i }).click();

  // Verify success - look for toast notification (svelte-sonner)
  await expect(page.getByText(/created|success/i)).toBeVisible();
});
```

### Testing dialog/sheet forms

Many SvelteKit + shadcn apps use dialog or sheet components for CRUD forms:

```typescript
test('should open and close dialog form', async ({ page }) => {
  await page.getByRole('button', { name: /add/i }).click();

  // Verify dialog is open
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Close dialog
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
```

---

## API Mocking & Interception

### Route interception for isolated tests

When tests need to run without a real backend:

```typescript
test('should display accounts from API', async ({ page }) => {
  // Intercept the SvelteKit API route that proxies to backend
  await page.route('/api/accounts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: '1', name: 'Checking', balance: 5000, accountType: { name: 'Checking', accountCategory: 'ASSET' }, currencyCode: 'USD' },
        { id: '2', name: 'Credit Card', balance: 1500, accountType: { name: 'Credit Card', accountCategory: 'LIABILITY' }, currencyCode: 'USD' },
      ]),
    });
  });

  await page.goto('/accounts');
  await expect(page.getByText('Checking')).toBeVisible();
  await expect(page.getByText('Credit Card')).toBeVisible();
});
```

### Intercepting for error handling tests

```typescript
test('should handle API error gracefully', async ({ page }) => {
  await page.route('/api/accounts', async (route) => {
    await route.fulfill({ status: 500, body: 'Internal Server Error' });
  });

  await page.goto('/accounts');
  await expect(page.getByText(/error|something went wrong/i)).toBeVisible();
});
```

---

## Common Utilities

### Wait helpers

```typescript
// Wait for SvelteKit navigation to complete
await page.waitForURL('/accounts');

// Wait for loading states to resolve
await page.waitForLoadState('networkidle');

// Wait for specific element to appear after action
await expect(page.getByRole('heading', { name: /accounts/i })).toBeVisible({ timeout: 10000 });
```

### Toast notification assertions (svelte-sonner)

```typescript
// svelte-sonner renders toasts in a specific container
const toast = page.locator('[data-sonner-toast]');
await expect(toast).toBeVisible();
await expect(toast).toContainText(/success/i);
```

### Table/List assertions

```typescript
// Count items in a list
const items = page.getByRole('listitem');
await expect(items).toHaveCount(5);

// Verify table row content
const row = page.getByRole('row').filter({ hasText: 'Checking Account' });
await expect(row).toContainText('$5,000');
```

---

## SvelteKit-Specific Patterns

### Handling route groups

SvelteKit route groups like `(app)` and `(auth)` don't affect URLs. Test routes use clean URLs:
- `(app)/accounts/+page.svelte` → navigate to `/accounts`
- `(auth)/signin/+page.svelte` → navigate to `/signin`

### Server-side redirects

The `(app)/+layout.server.ts` redirects unauthenticated users to `/signin`. Test this:

```typescript
test('should redirect unauthenticated user to signin', async ({ browser }) => {
  const context = await browser.newContext(); // No stored auth state
  const page = await context.newPage();
  await page.goto('/accounts');
  await expect(page).toHaveURL(/signin/);
  await context.close();
});
```

### Testing with i18n

For apps using svelte-i18n, prefer matching by role and accessible patterns rather than exact translated text. Use regex patterns that match common terms across languages:

```typescript
// Prefer role-based selectors over text
await page.getByRole('button', { name: /sign|login|iniciar/i }).click();

// Or use data-testid for i18n-heavy elements
await page.getByTestId('submit-button').click();
```

### Flash messages / Toasts

Apps using sveltekit-flash-message + svelte-sonner display feedback after form actions. Always wait for and verify these:

```typescript
// After a form submission
await expect(page.locator('[data-sonner-toast]')).toBeVisible();
```
