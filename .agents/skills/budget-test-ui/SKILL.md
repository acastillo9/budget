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
| `attachments.spec.ts` | Upload zone visibility, file input, client-side validation, upload/delete with API mock | `/transactions` (edit mode) |

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

## Testing File Inputs

Use Playwright's `setInputFiles()` to simulate file uploads via hidden file inputs.

### Setting file inputs

```typescript
// Create a temporary test file with proper content
const tmpDir = path.join(os.tmpdir(), '.tmp-test-upload');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
  0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9]);
const filePath = path.join(tmpDir, 'receipt.jpg');
fs.writeFileSync(filePath, jpegHeader);

// Set the file on the hidden input
await page.locator('input[type="file"]').setInputFiles(filePath);

// Cleanup in finally block
fs.rmSync(tmpDir, { recursive: true, force: true });
```

Rules:
- Always create temp files with proper MIME headers (JPEG: `0xff 0xd8 0xff 0xe0`, PNG: `0x89 0x50 0x4e 0x47`)
- Use `try/finally` with `fs.rmSync()` for cleanup
- Target hidden inputs with `page.locator('input[type="file"]')` or a POM locator
- For testing oversized files, use `Buffer.alloc(6 * 1024 * 1024)` prepended with MIME header
- For unsupported types, use `.txt` files — they fail the MIME check

### Extending existing POM for embedded features

When file upload is part of an existing page (e.g., transaction form), extend the existing POM with new locators rather than creating a separate page object:

```typescript
// In transactions.page.ts constructor:
this.uploadZone = page.getByRole('button', { name: /drag and drop/i });
this.fileInput = page.locator('input[type="file"]');
this.supportedFormatsText = page.getByText(/supported.*jpg.*png/i);
this.attachmentsTitle = page.getByRole('heading', { name: /attachments/i });
```

## Mocking API Responses for Uploads

Use `page.route()` to intercept upload/download API calls with an in-memory store.

```typescript
async function mockAttachmentApi(page: Page) {
  const store = new Map<string, Array<Record<string, unknown>>>();
  let idCounter = 1;

  await page.route('**/api/transactions/*/attachments**', async (route, request) => {
    const url = new URL(request.url());
    const segments = url.pathname.split('/');
    const transactionId = segments[3];
    const attachmentId = segments.length > 5 ? segments[5] : undefined;

    if (!attachmentId && request.method() === 'POST') {
      // Parse filename from multipart body
      const body = request.postData() || '';
      const match = body.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : `file-${idCounter}.jpg`;

      const attachment = {
        id: `mock-att-${idCounter++}`,
        filename,
        mimeType: 'image/jpeg',
        size: 22,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const list = store.get(transactionId) || [];
      list.push(attachment);
      store.set(transactionId, list);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(attachment) });
    } else if (!attachmentId && request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(store.get(transactionId) || []) });
    } else if (attachmentId && request.method() === 'DELETE') {
      // ... remove from store, fulfill with deleted item
    } else {
      await route.continue();
    }
  });
}
```

Rules:
- Call `mockAttachmentApi(page)` **before** navigating to the page
- Use `request.postData()` + regex to extract filename from multipart body
- Maintain `Map` keyed by parent entity ID for realistic GET responses
- Use `route.continue()` as fallback for unmatched methods

Source: `budget-ui/e2e/attachments.spec.ts`

## Layout/Overlay Testing Patterns

For testing features embedded in the app layout (notification panels, overlays, global widgets) rather than dedicated pages.

### Testing layout-embedded features

Navigate to any app page (e.g., dashboard), then interact with header/overlay elements:

```typescript
async goto() {
  await this.page.goto('/');  // Any app page — feature lives in layout
}

async openPanel() {
  await this.bellButton.click();
  await expect(this.panel).toBeVisible({ timeout: 10_000 });
}
```

### Stateful API mocking with `page.route()`

Use a shared closure state across multiple route handlers so mutations in one endpoint are visible to others:

```typescript
export async function mockNotificationApi(page: Page, options: { notifications?: Record<string, unknown>[]; unreadCount?: number; preferences?: Record<string, unknown> } = {}) {
  const state = {
    notifications: [...(options.notifications || [])],
    unreadCount: options.unreadCount ?? 0,
    preferences: { ...(options.preferences || defaultPreferences) },
  };

  // GET /api/notifications/unread-count — reads shared state
  await page.route('**/api/notifications/unread-count', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: state.unreadCount }) });
    }
  });

  // PATCH /api/notifications/:id/read — mutates shared state
  await page.route('**/api/notifications/*/read', async (route, request) => {
    if (request.method() === 'PATCH') {
      const id = new URL(request.url()).pathname.split('/')[3];
      const notification = state.notifications.find((n) => n.id === id);
      if (notification) {
        notification.isRead = true;
        if (state.unreadCount > 0) state.unreadCount--;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(notification) });
    }
  });

  // GET + PUT /api/notifications/preferences
  await page.route('**/api/notifications/preferences', async (route, request) => {
    if (request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.preferences) });
    } else if (request.method() === 'PUT') {
      const body = JSON.parse(request.postData() || '{}');
      state.preferences = { ...state.preferences, ...body };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.preferences) });
    }
  });

  return state; // Caller can inspect state changes in assertions
}
```

Rules:
- Call mock setup **before** navigating to the page
- Use a single `state` object shared across all route handlers for consistency
- Return the state object so tests can assert on mutations
- Extract IDs from URLs with `new URL(request.url()).pathname.split('/')`
- Use `route.continue()` as fallback for unmatched methods

### Testing Sheet/Dialog overlay interactions

```typescript
// POM: locators for both overlay types
this.panel = page.locator('[data-slot="sheet-content"]');
this.panelTitle = this.panel.locator('[data-slot="sheet-title"]');
this.preferencesDialog = page.getByRole('dialog', { name: /notification preferences/i });

// Test: multi-step overlay workflow
test('should open panel, mark all read, open preferences, and save', async ({ page }) => {
  await mockNotificationApi(page, { notifications: mockItems, unreadCount: 2 });
  const notificationsPage = new NotificationsPage(page);
  await notificationsPage.goto();
  await page.waitForLoadState('networkidle');

  // 1. Open Sheet panel
  await notificationsPage.openPanel();
  await expect(notificationsPage.panel).toBeVisible({ timeout: 10_000 });

  // 2. Interact within Sheet
  await notificationsPage.clickMarkAllAsRead();
  await notificationsPage.expectSuccessToast(/all notifications marked as read/i);
  await notificationsPage.toast.waitFor({ state: 'hidden', timeout: 10_000 });

  // 3. Open Dialog from Sheet
  await notificationsPage.clickSettings();
  await expect(notificationsPage.preferencesDialog).toBeVisible({ timeout: 10_000 });

  // 4. Interact within Dialog and verify
  await notificationsPage.fillThreshold('budget', '90');
  await notificationsPage.savePreferences();
  await notificationsPage.expectSuccessToast(/preferences saved/i);
});
```

### Intercepting requests for assertions

```typescript
const putRequest = page.waitForRequest(
  (req) => req.url().includes('/api/notifications/preferences') && req.method() === 'PUT'
);
await notificationsPage.savePreferences();
const req = await putRequest;
const body = JSON.parse(req.postData() || '{}');
expect(body.budgetThresholdPercent).toBe(75);
```

Reference impl: `budget-ui/e2e/notifications.spec.ts` and `budget-ui/e2e/pages/notifications.page.ts`

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
