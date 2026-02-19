# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `npm run dev`
- **Build:** `npm run build`
- **Lint:** `npm run lint`
- **Format:** `npm run format`
- **Type check:** `npm run check`
- **Unit tests:** `npm run test:unit -- --run` (single run) or `npm run test:unit` (watch mode)
- **E2E tests:** `npm run test:e2e` (Playwright)
- **All tests:** `npm run test`

## Architecture

This is a **SvelteKit 2 / Svelte 5** personal budget management app (TypeScript, Tailwind CSS v4) that acts as a frontend for a separate [NestJS backend API](https://github.com/acastillo9/budget-api). The API URL is configured via the `API_URL` env var (server-side only, not `PUBLIC_`).

### Route Groups

- `(app)/` — Authenticated pages (dashboard, accounts, bills, budgets, categories, transactions). The `(app)/+layout.server.ts` redirects to `/signin` if no user session.
- `(auth)/` — Auth pages (signin, signup, forgot-password, reset-password, Google OAuth flow).
- `api/` — SvelteKit API routes that proxy to the backend (accounts, bills, categories, transactions, currencies, users). These exist so client-side fetches go through SvelteKit, which attaches the auth token via `handleFetch` in `hooks.server.ts`.

### Auth Flow

Authentication uses JWT tokens stored in httpOnly cookies (`AuthorizationToken`, `RefreshToken`). The `hooks.server.ts` handle hook validates/refreshes tokens on every request and populates `event.locals.user`.

### Key Libraries & Patterns

- **UI components:** [shadcn-svelte](https://shadcn-svelte.com/) (bits-ui + tailwind-variants) in `src/lib/components/ui/`. Add new components via `npx shadcn-svelte@latest add <component>`.
- **Forms:** sveltekit-superforms with Zod v4 adapter (`zod4`). Schemas live in `src/lib/schemas/`.
- **Flash messages:** sveltekit-flash-message + svelte-sonner for toast notifications.
- **i18n:** svelte-i18n with locale files in `src/lib/locales/` (en, es). Use `$t('key')` from `$lib/i18n` (unwrapped store) in server-side code.
- **State:** Svelte context API (`src/lib/context.ts`) for passing `UserState` (user + currency rates) down the component tree.
- **Icons:** @lucide/svelte.
- **Date handling:** dayjs.

### Server-Side Data Loading

Page data is loaded in `+page.server.ts` files that fetch from the backend API using `API_URL`. The `handleFetch` hook in `hooks.server.ts` automatically attaches the auth Bearer token and Accept-Language header to all server-side fetches.

### Types & Schemas

- Types: `src/lib/types/` (account, bill, category, transaction types)
- Zod schemas: `src/lib/schemas/` (used by superforms for validation)
- Utilities: `src/lib/utils/` (currency formatting, date helpers, account helpers, breadcrumb, icons)
