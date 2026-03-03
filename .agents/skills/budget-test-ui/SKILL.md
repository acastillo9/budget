---
name: budget-test-ui
description: >
  Write E2E Playwright tests for the budget-ui SvelteKit frontend. Use when creating, modifying,
  or reviewing E2E test files in budget-ui/e2e/. The agent receives detailed feature information
  (pages, components, routes, form schemas) in its prompt and produces E2E test cases + page
  objects. Triggers on: "write E2E tests for the UI", "create Playwright tests for...",
  "test the X page", "add E2E coverage for the frontend".
---

# E2E Test Writing — budget-ui (Playwright)

## Test Infrastructure

### Playwright Config

- Base URL: `http://localhost:4173`
- Test dir: `e2e/`
- Two projects: `authenticated` (default) and `unauthenticated` (`*.unauth.spec.ts`)
- Web server: `npm run dev -- --port 4173 --mode test`
- Run tests: `cd budget-ui && npm run test:e2e`
- Run single file: `cd budget-ui && npx playwright test e2e/feature.spec.ts`

### Custom Fixtures — `e2e/fixtures.ts`

```typescript
import { test, expect } from './fixtures';
```

Worker-scoped fixtures register a fresh user per Playwright worker via the signup flow:

| Fixture | Scope | Description |
|---------|-------|-------------|
| `authRef` | worker | Primary user auth state (auto-registered) |
| `secondUserRef` | worker | Second user auth state (for multi-user tests) |
| `secondUserEmail` | worker | Email of the second user |
| `storageState` | test | Primary user's storage state, auto-refreshes if stale (>10min) |
| `secondUserState` | test | Second user's storage state, auto-refreshes if stale |

Tests using `test` from `./fixtures` are automatically authenticated — no manual login needed.

### Mailpit Helper — `e2e/helpers/mailpit.ts`

```typescript
import { MailpitClient } from './helpers/mailpit';
const mailpit = new MailpitClient(process.env.MAILPIT_API_URL);

await mailpit.deleteAllMessages();
await mailpit.waitForEmail(email);
await mailpit.getActivationCode(email);
await mailpit.getResetPasswordToken(email, knownCount);
await mailpit.getInvitationToken(email, knownCount);
await mailpit.countEmailsFor(email);
```

## Page Object Model (POM) Template

```typescript
import { type Page, type Locator, expect } from '@playwright/test';

export class FeaturePage {
  readonly page: Page;

  // Page header
  readonly heading: Locator;
  readonly description: Locator;

  // Dialog
  readonly dialog: Locator;
  readonly dialogTitle: Locator;

  // Confirmation dialog (AlertDialog)
  readonly confirmationDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  // Toast
  readonly toast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1, name: /feature/i });
    this.description = page.getByText(/description text/i);

    this.dialog = page.getByRole('dialog');
    this.dialogTitle = this.dialog.locator('[data-dialog-title]');

    this.confirmationDialog = page.getByRole('alertdialog');
    this.confirmDeleteButton = this.confirmationDialog.getByRole('button', { name: /delete/i });
    this.cancelDeleteButton = this.confirmationDialog.getByRole('button', { name: /cancel/i });

    this.toast = page.locator('[data-sonner-toast]');
  }

  async goto() {
    await this.page.goto('/feature');
  }

  // Granular methods — individual actions
  async openAddDialog() {
    await this.page.waitForLoadState('networkidle');
    await this.addButton.click();
    await expect(this.dialog).toBeVisible({ timeout: 10_000 });
  }

  // Complete flow methods — chain granular methods
  async createItem(name: string, ...args: string[]) {
    await this.openAddDialog();
    // fill form fields
    await this.submitCreate();
  }

  async deleteItem(name: string) {
    await this.clickDelete(name);
    await this.confirmDeleteButton.click();
  }

  async expectSuccessToast(textPattern?: RegExp) {
    const loc = textPattern
      ? this.page.locator('[data-sonner-toast]', { hasText: textPattern })
      : this.toast;
    await expect(loc).toBeVisible({ timeout: 10_000 });
  }
}
```

### Selector Strategy (priority order)

1. `getByRole('button', { name: /text/i })` — buttons, links, headings
2. `getByLabel(/label text/i)` — form inputs
3. `getByText(/visible text/i)` — static text
4. `data-*` attribute selectors — shadcn/bits-ui components (see below)

### shadcn/bits-ui Data Attributes

| Component | Selector |
|-----------|----------|
| Toast (sonner) | `[data-sonner-toast]` |
| Select trigger | `[data-slot="select-trigger"]` |
| Dialog title | `[data-dialog-title]` |
| AlertDialog title | `[data-alert-dialog-title]` |
| AlertDialog description | `[data-alert-dialog-description]` |
| Calendar | `[data-calendar]` |
| Calendar day | `button[data-day]` |

## Test File Template

```typescript
import { test, expect } from './fixtures';
import { FeaturePage } from './pages/feature.page';

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Feature — Page Load & List
// ---------------------------------------------------------------------------
test.describe('Feature — Page Load & List', () => {
  let featurePage: FeaturePage;

  test.beforeEach(async ({ page }) => {
    featurePage = new FeaturePage(page);
    await featurePage.goto();
    await page.waitForLoadState('networkidle');
  });

  test('should display the page heading and description', async () => {
    await expect(featurePage.heading).toBeVisible();
    await expect(featurePage.description).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Feature — Create
// ---------------------------------------------------------------------------
test.describe('Feature — Create', () => {
  let featurePage: FeaturePage;

  test.beforeEach(async ({ page }) => {
    featurePage = new FeaturePage(page);
    await featurePage.goto();
    await page.waitForLoadState('networkidle');
  });

  test('should create an item successfully', async () => {
    const name = uniqueName('Item');
    await featurePage.createItem(name);

    await expect(featurePage.dialog).not.toBeVisible({ timeout: 10_000 });
    await featurePage.expectSuccessToast(/added successfully/i);
  });
});

// ---------------------------------------------------------------------------
// Feature — Edit
// ---------------------------------------------------------------------------
test.describe('Feature — Edit', () => {
  let featurePage: FeaturePage;
  let itemName: string;

  test.beforeEach(async ({ page }) => {
    featurePage = new FeaturePage(page);
    await featurePage.goto();
    await page.waitForLoadState('networkidle');

    // Create item to edit
    itemName = uniqueName('EditMe');
    await featurePage.createItem(itemName);
    await expect(featurePage.dialog).not.toBeVisible({ timeout: 10_000 });
    await featurePage.expectSuccessToast(/added successfully/i);
    await featurePage.toast.waitFor({ state: 'hidden', timeout: 10_000 });
  });

  test('should edit an item successfully', async () => {
    const newName = uniqueName('Updated');
    await featurePage.editItem(itemName, { name: newName });

    await expect(featurePage.dialog).not.toBeVisible({ timeout: 10_000 });
    await featurePage.expectSuccessToast(/edited successfully/i);
  });
});

// ---------------------------------------------------------------------------
// Feature — Delete
// ---------------------------------------------------------------------------
test.describe('Feature — Delete', () => {
  // Similar to Edit: create in beforeEach, then test deletion
});

// ---------------------------------------------------------------------------
// Feature — Full CRUD Workflow
// ---------------------------------------------------------------------------
test.describe('Feature — Full CRUD Workflow', () => {
  test('should create, edit, and delete in sequence', async ({ page }) => {
    // Single test covering the complete lifecycle
  });
});
```

## Test Case Categories

| Category | What to test |
|----------|-------------|
| **Page Load & List** | Heading, description, add button, empty state, list rendering |
| **Create** | Valid data, form validation, disabled button states |
| **Edit** | Pre-filled dialog, update fields, verify changes |
| **Delete** | Confirmation dialog, cancel keeps item, confirm removes item |
| **Full CRUD** | Create → Edit → Delete in a single test |
| **Form Validation** | Required fields, invalid values, disabled submit |
| **Navigation** | Sidebar links, breadcrumbs, back navigation |
| **Multi-step Wizards** | Step transitions, data persistence across steps |
| **Multi-user** | Use `secondUserState` for data isolation tests |
| **Filters & Pagination** | Date ranges, search, category/account filters, page navigation |

## Cross-Page Prerequisite Pattern

When a test needs data from another page (e.g., transactions need an account and a category):

```typescript
import { AccountsPage } from './pages/accounts.page';
import { CategoriesPage } from './pages/categories.page';

async function createPrerequisites(page: Page) {
  const accountsPage = new AccountsPage(page);
  await accountsPage.goto();
  await page.waitForLoadState('networkidle');
  const accountName = uniqueName('Prereq Account');
  await accountsPage.createAccount(accountName, '5000', 'Checking');
  await expect(accountsPage.dialog).not.toBeVisible({ timeout: 10_000 });
  await accountsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

  const categoriesPage = new CategoriesPage(page);
  await categoriesPage.goto();
  // ... create category
  return { accountName, categoryName };
}
```

## Existing Test Files

| File | Coverage | Route |
|------|----------|-------|
| `accounts.spec.ts` | CRUD accounts | `/accounts` |
| `auth.unauth.spec.ts` | Signin, signup, forgot/reset password, Google OAuth | `/signin`, `/signup`, `/forgot-password`, `/reset-password/[token]` |
| `bills.spec.ts` | CRUD bills, pay/unpay, calendar navigation | `/bills` |
| `budgets.spec.ts` | CRUD budgets, progress display | `/budgets` |
| `categories.spec.ts` | CRUD categories, parent-child | `/categories` |
| `dashboard.spec.ts` | Dashboard cards, navigation | `/` |
| `transactions.spec.ts` | CRUD transactions, transfers, filters, pagination | `/transactions` |
| `workspaces.spec.ts` | CRUD workspaces, members, invitations, roles | `/workspaces` |

## Existing Page Objects

| Page Object | Route | Key Methods |
|-------------|-------|-------------|
| `accounts.page.ts` | `/accounts` | `createAccount()`, `editAccount()`, `deleteAccount()` |
| `bills.page.ts` | `/bills` | `createBill()`, `editBill()`, `deleteBill()`, `payBill()` |
| `budgets.page.ts` | `/budgets` | `createBudget()`, `editBudget()`, `deleteBudget()` |
| `categories.page.ts` | `/categories` | `createCategory()`, `editCategory()`, `deleteCategory()` |
| `dashboard.page.ts` | `/` | Card locators, navigation helpers |
| `forgot-password.page.ts` | `/forgot-password` | `submitEmail()` |
| `reset-password.page.ts` | `/reset-password/[token]` | `submitNewPassword()` |
| `signin.page.ts` | `/signin` | `signIn()` |
| `signup.page.ts` | `/signup` | `fillBasicInfo()`, `fillActivationCode()`, `fillPassword()` |
| `transactions.page.ts` | `/transactions` | `createTransaction()`, `createTransfer()`, `deleteTransaction()` |
| `workspaces.page.ts` | `/workspaces` | `createWorkspace()`, `inviteMember()`, `removeMember()` |

## Rules

1. Import `test` and `expect` from `./fixtures`, never from `@playwright/test` in spec files
2. Import `Page`, `Locator`, `expect` from `@playwright/test` in page object files
3. File naming: `feature.spec.ts` for tests, `feature.page.ts` for page objects in `pages/`
4. Unauthenticated tests: name as `feature.unauth.spec.ts`
5. Use `uniqueName(prefix)` for all user-created data to avoid collisions in parallel runs
6. Every `test.describe` block must have a `test.beforeEach` that instantiates the POM and calls `goto()` + `waitForLoadState('networkidle')`
7. After dialog form submission, assert `dialog` is not visible with `timeout: 10_000`
8. After success actions, call `expectSuccessToast(/pattern/i)` to verify the toast
9. Before performing a second action after a toast, wait: `toast.waitFor({ state: 'hidden', timeout: 10_000 })`
10. Describe blocks: `'Feature — Category'` (e.g., `'Accounts — Create'`)
11. Use `getByRole` > `getByLabel` > `getByText` > data attribute selectors
12. Use `data-sonner-toast` for toast locators, never match by class
13. Use `getByRole('dialog')` for dialogs, `getByRole('alertdialog')` for confirmation dialogs
14. POM constructor: define all locators as `readonly` properties, no async in constructor
15. POM methods: provide both granular (single-action) and complete-flow (multi-step) methods
16. Keep tests deterministic — use `uniqueName()`, fixed amounts, predictable data
17. Test data isolation: second user's data must not appear in primary user's views
18. For prerequisite data from other pages, create helper functions that import other POMs
19. Never use `page.waitForTimeout()` — use `waitForLoadState`, `waitFor`, or `toBeVisible` with timeout
20. Always use `{ timeout: 10_000 }` for assertions on elements that depend on network responses

## Workflow

1. Read the feature's page components, server loader, form actions, and schema to understand the UI
2. Check 2-3 existing test files + page objects for patterns (especially one with similar complexity)
3. Create or update `budget-ui/e2e/pages/{feature}.page.ts` using the POM template
4. Create `budget-ui/e2e/{feature}.spec.ts` using the test file template
5. Run tests: `cd budget-ui && npx playwright test e2e/{feature}.spec.ts`
6. Fix failures and iterate until all tests pass
