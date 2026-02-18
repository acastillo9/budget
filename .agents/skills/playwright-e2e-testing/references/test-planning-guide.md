# E2E Test Planning Guide for Financial Applications

## Table of Contents

1. [Exploration Phase](#exploration-phase)
2. [Scenario Planning Framework](#scenario-planning-framework)
3. [Priority Matrix](#priority-matrix)
4. [Common Financial App Workflows](#common-financial-app-workflows)
5. [Test Data Strategy](#test-data-strategy)

---

## Exploration Phase

Before writing any tests, explore the codebase to understand what exists and what to test.

### Step-by-step codebase exploration

1. **Read route structure** - List all `+page.svelte` and `+page.server.ts` files to identify all user-facing pages and server actions
2. **Read layout files** - Check `+layout.server.ts` for auth guards, data loading, redirects
3. **Read form schemas** - Check `src/lib/schemas/` to understand form validation rules (required fields, formats, constraints)
4. **Read type definitions** - Check `src/lib/types/` to understand data models and relationships
5. **Read page components** - Examine each page's UI to identify interactive elements, dialogs, forms, lists
6. **Read API routes** - Check `src/routes/api/` to understand what API endpoints exist and what they proxy
7. **Check hooks** - Read `hooks.server.ts` for auth flow, token handling, request interception
8. **Check existing tests** - Read `e2e/` directory for any existing test patterns or conventions

### Key information to capture

For each page/feature, document:

- URL path
- Required auth state (authenticated / unauthenticated)
- Forms present (fields, validation rules, submit actions)
- Data displayed (lists, tables, summaries)
- Navigation flows (links, redirects, breadcrumbs)
- User interactions (create, edit, delete, filter, sort)
- Success/error feedback (toasts, redirects, inline errors)

---

## Scenario Planning Framework

### Scenario categories

For each feature, plan tests in these categories:

#### 1. Happy path (Critical - always test)

The primary user workflow completing successfully.

- Example: Sign in → see dashboard → navigate to accounts → create account → see success

#### 2. Validation & error handling (High priority)

Form validation errors, API failures, edge cases.

- Example: Submit empty form → see validation errors → fix errors → submit successfully

#### 3. Navigation & routing (Medium priority)

Page navigation, breadcrumbs, deep linking, back button.

- Example: Navigate through sidebar → verify URL and page content match

#### 4. Auth boundaries (Critical)

Protected routes redirect, session expiry behavior.

- Example: Access /accounts without auth → redirected to /signin

#### 5. CRUD operations (High priority for data-driven apps)

Create, Read, Update, Delete for each entity.

- Example: Create account → see in list → edit name → verify update → delete → confirm gone

#### 6. Cross-feature workflows (Medium priority)

Workflows that span multiple features.

- Example: Create category → create account → create transaction linking both

---

## Priority Matrix

Prioritize test scenarios using this matrix:

| Priority      | Criteria                                   | Examples                                  |
| ------------- | ------------------------------------------ | ----------------------------------------- |
| P0 - Critical | Core user flow, blocks all usage if broken | Auth flow, dashboard load                 |
| P1 - High     | Primary feature CRUD, data integrity       | Create/edit/delete accounts, transactions |
| P2 - Medium   | Secondary features, edge cases             | Filters, sorting, pagination              |
| P3 - Low      | Visual/cosmetic, nice-to-have              | Animations, responsive layout             |

### Recommended test order

1. Auth flow (sign in, sign out, protected routes)
2. Dashboard (loads with data, shows summaries)
3. Each CRUD feature (accounts, categories, transactions, bills)
4. Cross-feature workflows
5. Error handling and edge cases

---

## Common Financial App Workflows

### Authentication workflows

| Workflow        | Steps                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------ |
| Sign up         | Navigate to signup → fill name/email → receive activation → set password → redirected      |
| Sign in         | Navigate to signin → fill email/password → submit → see dashboard                          |
| Sign out        | Click sign out → redirected to signin → verify can't access protected routes               |
| Forgot password | Navigate to forgot-password → enter email → submit → check confirmation                    |
| Reset password  | Navigate to reset-password with token → enter new password → submit → redirected to signin |
| Google OAuth    | Click Google sign in → redirect to Google → callback → authenticated                       |
| Auth redirect   | Access protected page without auth → redirected to signin                                  |

### Account management workflows

| Workflow             | Steps                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| Create account       | Open form → fill name, balance, type, currency → submit → verify in list |
| Edit account         | Find account → click edit → modify fields → submit → verify changes      |
| Delete account       | Find account → click delete → confirm → verify removed from list         |
| View account summary | Navigate to accounts → verify totals by category (assets vs liabilities) |

### Transaction workflows

| Workflow            | Steps                                                                     |
| ------------------- | ------------------------------------------------------------------------- |
| Create transaction  | Open form → fill amount, date, description, account, category → submit    |
| Create transfer     | Open transfer form → fill amount, origin account, target account → submit |
| Edit transaction    | Find transaction → click edit → modify → submit → verify                  |
| Delete transaction  | Find transaction → delete → confirm → verify removed                      |
| Filter transactions | Apply date/category/account filters → verify filtered results             |

### Bill management workflows

| Workflow        | Steps                                                                |
| --------------- | -------------------------------------------------------------------- |
| Create bill     | Open form → fill name, amount, due date, frequency, account → submit |
| Mark bill paid  | Find bill → mark as paid → verify status change                      |
| Edit bill       | Find bill → edit → modify fields → submit                            |
| Recurring bills | Create recurring bill → verify next occurrence generated             |

### Category workflows

| Workflow                | Steps                                              |
| ----------------------- | -------------------------------------------------- |
| Create income category  | Open form → fill name, icon, type=INCOME → submit  |
| Create expense category | Open form → fill name, icon, type=EXPENSE → submit |
| Edit category           | Find category → edit → modify → submit             |
| Delete category         | Find category → delete → confirm → verify removed  |

---

## Test Data Strategy

### Approaches (choose based on project needs)

#### 1. Real backend with test user

- Use a dedicated test account with known credentials
- Store credentials in environment variables (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`)
- Pros: Tests real API behavior; Cons: Requires running backend, data pollution

#### 2. API mocking with route interception

- Use `page.route()` to intercept SvelteKit API routes (`/api/*`)
- Return mock data matching the app's type definitions
- Pros: Fast, isolated, no backend needed; Cons: May miss real API issues

#### 3. Hybrid approach (recommended)

- Use real backend for auth setup and critical paths
- Use API mocking for edge cases, error scenarios, and data-heavy tests
- Best balance of coverage and reliability

### Mock data guidelines

- Mock data MUST match type definitions in `src/lib/types/`
- Use realistic values (real currency codes, valid dates, sensible amounts)
- Include edge cases: zero balances, very long names, special characters
- Include both states: empty lists and populated lists
