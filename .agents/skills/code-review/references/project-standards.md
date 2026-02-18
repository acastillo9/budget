# Project Standards Reference

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | SvelteKit | 2.x |
| UI Framework | Svelte | 5 (runes) |
| Language | TypeScript | strict mode |
| Styling | Tailwind CSS | v4 |
| UI Components | shadcn-svelte | (bits-ui + tailwind-variants) |
| Forms | sveltekit-superforms | with zod4 adapter |
| Validation | Zod | v4 |
| i18n | svelte-i18n | en, es locales |
| Icons | @lucide/svelte | only |
| Dates | dayjs | only |
| Flash messages | sveltekit-flash-message | + svelte-sonner |
| Backend | NestJS API | separate repo, proxied |

## Formatting Rules (Prettier)

- **Indentation**: Tabs (not spaces)
- **Quotes**: Single quotes
- **Trailing commas**: None
- **Print width**: 100 characters
- **Svelte parser**: prettier-plugin-svelte
- **Tailwind sorting**: prettier-plugin-tailwindcss

## File Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Svelte components | kebab-case | `date-picker.svelte` |
| TypeScript types | PascalCase | `Account`, `Transaction` |
| Functions/variables | camelCase | `formatCurrency`, `getUserState` |
| Route files | SvelteKit conventions | `+page.svelte`, `+page.server.ts` |
| Schema files | kebab-case | `account-schema.ts` |
| Locale files | language code | `en.json`, `es.json` |

## Svelte 5 Runes (Mandatory)

This project uses Svelte 5 runes exclusively. Svelte 4 patterns are forbidden.

| Correct (Svelte 5) | Forbidden (Svelte 4) |
|---|---|
| `let count = $state(0)` | `let count = 0` (reactive) |
| `let doubled = $derived(count * 2)` | `$: doubled = count * 2` |
| `$effect(() => { ... })` | `$: { ... }` (side effects) |
| `let { data } = $props()` | `export let data` |
| `{#snippet name()}...{/snippet}` | `<slot>` / `<slot name="x">` |
| `{@render name()}` | slot rendering |
| `onclick={handler}` | `on:click={handler}` |
| `bind:value={val}` | Still valid, no change |

### Key Rune Rules

- All component props must use `$props()` destructuring
- All reactive state must use `$state()`
- All derived values must use `$derived()` or `$derived.by()`
- Side effects must use `$effect()`
- Event handlers use direct attribute syntax: `onclick`, `onsubmit`, etc.

## Forms: superforms + zod4

### Correct Pattern

```typescript
// +page.server.ts
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { accountSchema } from '$lib/schemas/account-schema';

export const load = async () => {
  const form = await superValidate(zod4(accountSchema));
  return { form };
};

export const actions = {
  default: async ({ request }) => {
    const form = await superValidate(request, zod4(accountSchema));
    if (!form.valid) return fail(400, { form });
    // process...
    return { form };
  }
};
```

### Violations to Flag

- Using `zod` adapter instead of `zod4`
- Not using `superValidate` for form initialization
- Manual form parsing instead of superforms
- Missing `fail(400, { form })` on validation failure
- Schemas not in `src/lib/schemas/`

## API Proxy Pattern

### Architecture

Client-side fetches go through SvelteKit API routes (`src/routes/api/`), which proxy to the
backend. The `handleFetch` hook in `hooks.server.ts` automatically attaches the Bearer token and
Accept-Language header.

### Correct Pattern

```typescript
// src/routes/api/accounts/+server.ts
import { API_URL } from '$env/static/private';

export const GET = async ({ fetch }) => {
  const res = await fetch(`${API_URL}/accounts`);
  return new Response(res.body, { status: res.status, headers: res.headers });
};
```

### Violations to Flag

- Importing `API_URL` in client-side code (`.svelte` files, non-server `.ts`)
- Using `PUBLIC_` prefix for API_URL
- Client-side code fetching directly to the backend URL
- Not using the `fetch` from event (which triggers `handleFetch`)
- Hardcoded API URLs

## Auth Flow

### Cookie Configuration

| Cookie | httpOnly | secure | sameSite | path |
|---|---|---|---|---|
| `AuthorizationToken` | true | prod only | strict | `/` |
| `RefreshToken` | true | prod only | strict | `/` |

### Flow

1. `hooks.server.ts` handle hook validates access token on every request
2. If expired, attempts refresh using `RefreshToken`
3. On success, sets new cookies and populates `event.locals.user`
4. On failure, clears both cookies

### Route Protection

- `(app)/+layout.server.ts` checks `event.locals.user` and redirects to `/signin` if missing
- `(auth)/` routes are for unauthenticated users

### Violations to Flag

- Setting cookies without `httpOnly: true`
- Missing `sameSite: 'strict'`
- Not checking `event.locals.user` in protected routes
- Exposing tokens in client-side code
- Auth logic outside `hooks.server.ts`

## i18n

### Client-Side (Svelte components)

```svelte
<script>
  import { t } from '$lib/i18n';
</script>

<h1>{$t('dashboard.title')}</h1>
```

### Server-Side (+page.server.ts, +server.ts)

```typescript
import { t } from '$lib/i18n';
// Use unwrapped store: $t('key') — NOT $t('key') via Svelte store syntax
```

### Violations to Flag

- Hardcoded user-facing strings (English text in templates)
- Using `$t()` Svelte store syntax in server-side code
- Missing translations in locale files (`src/lib/locales/en.json`, `es.json`)
- Inconsistent translation keys between locales

## State Management

Use Svelte context API via `src/lib/context.ts`:

```typescript
import { getUserState } from '$lib/context';
const userState = getUserState();
```

### Violations to Flag

- Global mutable state outside of context
- Using Svelte stores (`writable`, `readable`) for app state instead of context + runes
- Prop drilling through many levels instead of using context

## Error Handling

### Server-Side

```typescript
import { fail, error } from '@sveltejs/kit';

// Form validation failure
return fail(400, { form });

// Page-level error
throw error(404, 'Not found');
```

### Client-Side (Toast Notifications)

```typescript
import { setFlash } from 'sveltekit-flash-message';
import { toast } from 'svelte-sonner';
```

### Violations to Flag

- Unhandled promise rejections in load functions
- Missing error responses (no `fail()` on bad input)
- Using `throw new Error()` instead of `error()` from SvelteKit
- Silent failures (catch blocks that swallow errors)

## UI Components

### Rules

- All UI primitives must come from `shadcn-svelte` (`src/lib/components/ui/`)
- Add new components via `npx shadcn-svelte@latest add <component>`
- Icons must use `@lucide/svelte` only
- Date handling must use `dayjs` only

### Violations to Flag

- Custom UI components that duplicate shadcn-svelte functionality
- Importing icons from other icon libraries
- Using `moment`, `date-fns`, or native `Date` formatting instead of `dayjs`
- Inline styles instead of Tailwind classes

## Security Checklist

| Check | Details |
|---|---|
| **API_URL exposure** | Must NEVER appear in client bundles. Only in `$env/static/private` |
| **XSS** | No `{@html}` with user input. Svelte auto-escapes by default |
| **CSRF** | SvelteKit form actions have built-in CSRF protection. Don't disable it |
| **Cookies** | Must be `httpOnly`, `secure` in production, `sameSite: 'strict'` |
| **Auth bypass** | All `(app)/` routes must check `event.locals.user` |
| **Secrets in code** | No API keys, tokens, or credentials in source code |
| **Input validation** | All user input validated via Zod schemas before processing |

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   └── ui/          # shadcn-svelte components
│   ├── context.ts       # Svelte context (UserState)
│   ├── i18n/            # i18n setup
│   ├── locales/         # en.json, es.json
│   ├── schemas/         # Zod validation schemas
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── routes/
│   ├── (app)/           # Authenticated pages
│   ├── (auth)/          # Auth pages
│   └── api/             # API proxy routes
└── hooks.server.ts      # Auth handling, handleFetch
```
