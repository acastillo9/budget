# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Task                   | Command               |
| ---------------------- | --------------------- |
| Dev server             | `npm run dev`         |
| Build                  | `npm run build`       |
| Preview                | `npm run preview`     |
| Lint                   | `npm run lint`        |
| Format                 | `npm run format`      |
| Type check             | `npm run check`       |
| Type check (watch)     | `npm run check:watch` |
| E2E tests (Playwright) | `npm run test:e2e`    |

## Architecture

**SvelteKit 2 / Svelte 5** personal budget management app (TypeScript, Tailwind CSS v4) that acts as a frontend for a separate NestJS backend API. Deployed on Vercel (adapter-vercel, Node.js 22.x runtime). The API URL is configured via the `API_URL` env var (server-side only, not `PUBLIC_`).

### Route Groups

- `(app)/` — Authenticated pages (dashboard, accounts, bills, budgets, categories, transactions, workspaces). The `(app)/+layout.server.ts` redirects to `/signin` if no user session; loads user data, workspace list, currency rates, and current workspace on every request.
- `(auth)/` — Auth pages (signin, signup, forgot-password, reset-password/[token], accept-invite/[token], google/\* OAuth flow).
- `api/` — SvelteKit API routes that proxy to the backend. These exist so client-side fetches go through SvelteKit, which attaches the auth token and workspace header via `handleFetch` in `hooks.server.ts`.

### API Proxy Routes

Proxy routes under `src/routes/api/`:

| Area             | Routes                                                                                                                                                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Users**        | `PATCH /api/users`                                                                                                                                                                                                                                                                    |
| **Accounts**     | `DELETE /api/accounts/[id]`                                                                                                                                                                                                                                                           |
| **Transactions** | `DELETE /api/transactions/[id]`, `POST/PATCH /api/transactions/transfer/[id]`                                                                                                                                                                                                         |
| **Bills**        | `GET/PATCH /api/bills/[id]/[targetDate]`, `POST .../pay`, `POST .../unpay`                                                                                                                                                                                                            |
| **Categories**   | `DELETE /api/categories/[id]`                                                                                                                                                                                                                                                         |
| **Budgets**      | `DELETE /api/budgets/[id]`                                                                                                                                                                                                                                                            |
| **Currencies**   | `GET /api/currencies/[currencyCode]`                                                                                                                                                                                                                                                  |
| **Workspaces**   | `GET/POST /api/workspaces`, `GET /api/workspaces/current`, `GET /api/workspaces/members`, `PATCH /api/workspaces/members/[memberId]/role`, `DELETE /api/workspaces/members/[memberId]`, `GET/POST /api/workspaces/invitations`, `GET/POST/DELETE /api/workspaces/invitations/[token]` |
| **Auth**         | `POST /api/auth/resend-activation-code`                                                                                                                                                                                                                                               |

### Auth Flow

Authentication uses JWT tokens stored in httpOnly cookies (`AuthorizationToken`, `RefreshToken`). A third cookie `X-Workspace-Id` (not httpOnly — read by client) persists the active workspace.

The `hooks.server.ts` handle hook:

1. Validates `AuthorizationToken` on every request
2. If valid → fetches user from `GET /auth/me`
3. If expired → attempts refresh with `RefreshToken` via `GET /auth/refresh`
4. On refresh → updates both cookies (httpOnly, secure in prod)
5. Populates `event.locals.user` with `UserSession`
6. On failure → deletes cookies, proceeds without user

The `handleFetch` hook attaches:

- `Authorization: Bearer <token>` header
- `X-Workspace-Id` header (from cookie)
- `Accept-Language` header (from request)

### Workspace System

Multi-user workspace support integrated throughout the app:

- **Workspace switcher** in sidebar (`workspace-switcher.svelte`)
- **Member management** — invite, remove, change roles (OWNER/CONTRIBUTOR/VIEWER)
- **Invitation flow** — email invites with token-based acceptance (`/accept-invite/[token]`)
- **Role-based permissions** — `canEdit()` and `canManageWorkspace()` utilities in `src/lib/utils/permissions.ts`
- **Post-auth redirect** — invitation acceptance redirects to signin if unauthenticated, then auto-accepts after login

### Key Libraries & Patterns

- **UI components:** [shadcn-svelte](https://shadcn-svelte.com/) (bits-ui v2 + tailwind-variants) in `src/lib/components/ui/`. Add new components via `npx shadcn-svelte@latest add <component>`.
- **Forms:** sveltekit-superforms v2 with Zod v4 adapter (`zod4`). Schemas live in `src/lib/schemas/`.
- **Flash messages:** sveltekit-flash-message + svelte-sonner for toast notifications.
- **i18n:** svelte-i18n v4 with locale files in `src/lib/locales/` (en.json, es.json). Use `$t('key')` from `$lib/i18n` (unwrapped store) in server-side code. Client locale set from `window.navigator.language`; server locale from `accept-language` header.
- **State:** Svelte 5 reactive state in `src/lib/states/user.svelte.ts` (`userState` with `$state`) + Svelte context API (`src/lib/context.ts`) for passing `UserState` down the component tree. `syncUserState()` updates the global state from layout data.
- **Icons:** @lucide/svelte. Icon categories mapped in `src/lib/utils/icons.ts` (Food & Dining, Transportation, Shopping, Entertainment, etc.).
- **Date handling:** dayjs with LocalizedFormat plugin.
- **Dark mode:** mode-watcher library with `toggleMode()` in header.
- **Fonts:** Inter (variable, main font) + Leckerli One (`.font-cursive`, logo).

### Server-Side Data Loading

Page data is loaded in `+page.server.ts` files that fetch from the backend API using `API_URL`. The `handleFetch` hook automatically attaches auth and workspace headers.

**Common pattern** — server actions:

1. `superValidate(zod4(schema))` to prepare forms
2. Form submitted via `use:enhance`
3. Server action validates, proxies to API
4. On success: `setFlash({ type: 'success', message: $t('key') }, cookies)`
5. On error: `setFlash({ type: 'error', message }, cookies)` or `setError(form, field, msg)`

**Shared actions:** `addCategoryAction()` in `src/lib/server/actions/category.ts` is reused across dashboard, bills, and transactions pages.

### Transaction Features

- **Pagination** — offset-based via `PaginatedDataDto`
- **Filters** — `dateFrom`, `dateTo`, `categoryId`, `accountId`, `search` (query params)
- **Transfers** — separate wizard step (`create-transfer-form.svelte`) with source/destination accounts
- **Transaction wizard** — multi-step dialog: select type → fill form (transaction or transfer)

### Bill Management

- **Monthly calendar view** — query param `?month=YYYY-MM` for navigation
- **Pay/Unpay actions** — via API proxy routes
- **Virtual instances** — generated by backend, displayed with status (UPCOMING, DUE, OVERDUE, PAID)

### Types & Schemas

- **Types:** `src/lib/types/` — account, bill, budget, category, transaction, workspace types + shared types (UserSession, UserState, CurrencyRates, etc.)
- **Zod schemas:** `src/lib/schemas/` — auth, account, bill, budget, category, transaction, invitation schemas
- **Utilities:** `src/lib/utils/` — currency formatting, date helpers, account helpers, breadcrumb, icons, permissions, redirect

### Component Inventory

**Custom components** (`src/lib/components/`):

- Layout: `header`, `footer`, `app-sidebar`, `nav-main`, `nav-user`, `workspace-switcher`
- Dashboard: `total-card`, `balance-breakdown-card`, `currency-rates-card`, `upcoming-bills-card`, `budget-progress-bar`, `transaction-list`, `account-list`
- Wizards: `create-transaction-wizard/` (type selector, transaction form, transfer form), `create-bill-wizard/` (dialog + form)
- Dialogs: `create-category-dialog`, `create-budget-dialog`, `invite-member-dialog`, `confirmation-dialog`
- Misc: `currency-selector`, `logo`, `countdown`, `icons/google`

**shadcn-ui components** (`src/lib/components/ui/`): alert, alert-dialog, avatar, badge, breadcrumb, button, calendar, card, checkbox, collapsible, command, dialog, dropdown-menu, form, input, input-otp, label, pagination, popover, radio-group, scroll-area, select, separator, sheet, sidebar, skeleton, sonner, switch, textarea, tooltip.

### E2E Testing (Playwright)

Config in `playwright.config.ts`:

- Base URL: `http://localhost:4173`
- Test directory: `e2e/`
- Two projects: `authenticated` (most tests) and `unauthenticated` (`*.unauth.spec.ts`)
- CI: 2 retries, 1 worker; screenshot/trace only on failure
- Web server: `npm run dev -- --port 4173 --mode test`

### Styling

- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (no separate config file)
- **Dark mode** via `mode-watcher` (class-based toggling)
- **Fonts**: `@fontsource-variable/inter`, `@fontsource/leckerli-one`
- **CSS approach**: Tailwind utility classes + shadcn-ui component styles

### Environment Variables

- `API_URL` — Backend API base URL (server-side private)
- `.env.example` — Template
- `.env.test` — Test env (includes `API_URL` and `MAILPIT_API_URL`)
