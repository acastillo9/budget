---
name: budget-ui
description: >
  Contextualized patterns for the budget-ui SvelteKit frontend (budget-ui/).
  Use when creating, editing, or reviewing any code inside budget-ui/ including
  pages, components, server loaders, form actions, API proxy routes, schemas,
  types, utilities, or E2E tests. Triggers on work in budget-ui/ such as adding
  pages, creating features, fixing bugs, writing tests, or modifying UI.
---

# Budget UI Patterns

Root: `budget-ui/`. SvelteKit 2 + Svelte 5 + TypeScript + Tailwind CSS v4.

## Page Structure

Each feature page follows this layout under `src/routes/(app)/`:

```
feature/
  +page.server.ts    # Data loading + form actions
  +page.svelte       # UI with $props(), $state, $derived
```

Auth pages live under `src/routes/(auth)/`. API proxy routes under `src/routes/api/`.

## Server Load Pattern (`+page.server.ts`)

```typescript
import { fail } from '@sveltejs/kit';
import { API_URL } from '$env/static/private';
import { $t } from '$lib/i18n';
import { setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { createFeatureSchema } from '$lib/schemas/feature.schema';

export const load: PageServerLoad = async ({ cookies, fetch }) => {
  let items = [];
  try {
    const response = await fetch(`${API_URL}/features`);
    if (!response.ok) throw new Error('Failed to load');
    items = await response.json();
  } catch {
    setFlash({ type: 'error', message: $t('features.loadError') }, cookies);
  }

  return {
    addForm: await superValidate(zod4(createFeatureSchema)),
    items
  };
};
```

Rules:
- `fetch()` gets auth headers automatically from `handleFetch` in `hooks.server.ts`
- Non-fatal errors: `try/catch` + `setFlash` (page still renders)
- Fatal errors: `throw error()` or `redirect()`
- Always return `superValidate` form(s) for each form on the page

### URL Query Params (pagination/filters)

```typescript
export const load: PageServerLoad = async ({ cookies, fetch, url }) => {
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const dateFrom = url.searchParams.get('dateFrom') || undefined;

  const params = new URLSearchParams();
  if (offset) params.set('offset', String(offset));
  if (dateFrom) params.set('dateFrom', `${dateFrom}T00:00:00.000Z`);
  const qs = params.toString();

  const response = await fetch(`${API_URL}/features${qs ? `?${qs}` : ''}`);
  const { data, total, limit, offset: resOffset, nextPage } = await response.json();

  return { items: { data, total, limit, offset: resOffset, nextPage }, filters: { dateFrom } };
};
```

## Form Action Pattern

```typescript
export const actions: Actions = {
  addFeature: async ({ request, cookies, fetch }) => {
    const form = await superValidate(request, zod4(createFeatureSchema));
    if (!form.valid) return fail(400, { form });

    // Create/edit duality: form.data.id presence determines mode
    const isEditing = Boolean(form.data.id);
    try {
      const response = await fetch(`${API_URL}/features${isEditing ? `/${form.data.id}` : ''}`, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.data)
      });

      if (!response.ok) {
        const { message, statusCode } = await response.json();
        setFlash({ type: 'error', message }, cookies);
        return fail(statusCode, { form });
      }

      setFlash({ type: 'success', message: $t('features.addSuccess') }, cookies);
      return { form };
    } catch {
      setFlash({ type: 'error', message: $t('features.addError') }, cookies);
      return fail(500, { form });
    }
  }
};
```

### Shared Actions

For actions reused across pages, extract into `src/lib/server/actions/`:

```typescript
// src/lib/server/actions/category.ts
export async function addCategoryAction({
  request, cookies, fetch
}: Pick<RequestEvent, 'request' | 'cookies' | 'fetch'>) { /* ... */ }

// In +page.server.ts:
export const actions: Actions = {
  addCategory: async (event) => addCategoryAction(event),
};
```

## Page Component Pattern (`+page.svelte`)

```svelte
<script lang="ts">
  import type { PageProps } from './$types';
  import { t } from 'svelte-i18n';
  import { toast } from 'svelte-sonner';
  import { invalidateAll } from '$app/navigation';
  import { getUserContext } from '$lib/context';
  import { canEdit } from '$lib/utils/permissions';

  let { data }: PageProps = $props();

  let isDialogOpen = $state(false);
  let selectedItem: Feature | undefined = $state(undefined);

  const userState = getUserContext();
  let editable = $derived(canEdit(userState.workspaceRole!));

  // Confirmation dialog state
  let confirmationDialog = $state({
    open: false, loading: false, title: '', description: '', onConfirm: () => {}
  });

  // DELETE: call API proxy, then invalidateAll()
  async function deleteItem(item: Feature) {
    confirmationDialog.loading = true;
    try {
      const response = await fetch(`/api/features/${item.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      confirmationDialog = { open: false, loading: false, title: '', description: '', onConfirm: () => {} };
      toast.success($t('features.deleteSuccess'));
      invalidateAll();
    } catch {
      toast.error($t('features.deleteError'));
    }
  }
</script>

<svelte:head>
  <title>Budget App - {$t('features.title')}</title>
</svelte:head>

{#if editable}
  <FeatureDialog data={data.addForm} bind:open={isDialogOpen} />
{/if}
```

Rules:
- Svelte 5 runes only: `$state`, `$derived`, `$effect`, `$props`. No `$: reactive`.
- Always gate mutating UI with `{#if editable}`
- Client-side deletes go through `/api/*` proxy routes, then `invalidateAll()`
- Use `$t('key')` (auto-subscribed store) for i18n in templates

### URL-Based Navigation (filters/pagination)

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) { if (v) sp.set(k, v); }
    const qs = sp.toString();
    return `/features${qs ? `?${qs}` : ''}`;
  }
</script>

<!-- Filter changes → goto() with replaceState -->
<Filters onFilterChange={(f) => goto(buildUrl({ ...f, offset: '0' }), { replaceState: true })} />
```

## API Proxy Route Pattern (`src/routes/api/`)

```typescript
import { API_URL } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const DELETE: RequestHandler = async ({ fetch, params }) => {
  const response = await fetch(`${API_URL}/features/${params.id}`, { method: 'DELETE' });
  if (!response.ok) {
    const { message, statusCode } = await response.json();
    return error(statusCode, { message });
  }
  return json(await response.json());
};

export const PATCH: RequestHandler = async ({ request, fetch, params }) => {
  const body = await request.json();
  const response = await fetch(`${API_URL}/features/${params.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const { message, statusCode } = await response.json();
    return error(statusCode, { message });
  }
  return json(await response.json());
};
```

Purpose: client-side `fetch('/api/...')` goes through SvelteKit, which attaches auth via `handleFetch`.

## Schema Pattern (Zod v4)

```typescript
import { z } from 'zod/v4';

export const createFeatureSchema = z.object({
  id: z.string().optional(),                                    // Optional → create/edit duality
  name: z.string().min(1).max(200),
  amount: z.number().min(0).default('' as unknown as number),   // Empty string trick for number inputs
  type: z.enum(['A', 'B']).default('' as unknown as 'A'),       // Same trick for select inputs
  date: z.string().min(1, { message: 'Date is required' }),
  notes: z.string().optional()
});
export type CreateFeatureSchema = z.infer<typeof createFeatureSchema>;
```

Rules:
- Import from `'zod/v4'` (not `'zod'`)
- Adapter: `zod4` from `'sveltekit-superforms/adapters'`
- `id: z.string().optional()` enables create/edit duality
- Number/enum defaults: `'' as unknown as T` to prevent pre-filling

## State Management

### Global State (`src/lib/states/user.svelte.ts`)

```typescript
export const userState: UserState = $state({ user: undefined, currencyRates: undefined, ... });

export function syncUserState(data: LayoutData) {
  userState.user = data.user;
  userState.currencyRates = data.currencyRates;
  // ...
}
```

### Context API (`src/lib/context.ts`)

```typescript
// Set once in (app)/+layout.svelte
export function setUserContext(userState: UserState) { setContext('userState', userState); }

// Read in any child component
export function getUserContext(): UserState { return getContext('userState'); }
```

### Layout State Sync (`(app)/+layout.svelte`)

```svelte
<script lang="ts">
  import { setUserContext } from '$lib/context.js';
  import { userState, syncUserState } from '$lib/states/user.svelte';
  import { untrack } from 'svelte';

  let { data, children } = $props();
  untrack(() => syncUserState(data));
  setUserContext(userState);
  $effect.pre(() => { syncUserState(data); });
</script>
```

## i18n

- Server-side (`.server.ts`, schemas): `import { $t } from '$lib/i18n'` → `$t('key')`
- Client-side (`.svelte`): `import { t } from 'svelte-i18n'` → `$t('key')`
- Key convention: `'{domain}.{verbEntityResult}'` (e.g., `'accounts.addAccountSuccess'`)
- Locales: `src/lib/locales/en.json`, `src/lib/locales/es.json`

## Auth Flow

- JWT tokens in httpOnly cookies: `AuthorizationToken`, `RefreshToken`
- `X-Workspace-Id` cookie (NOT httpOnly — client-readable) for workspace multi-tenancy
- `hooks.server.ts` `handle`: validates token → fetches user → refreshes if expired
- `hooks.server.ts` `handleFetch`: attaches `Authorization`, `X-Workspace-Id`, `Accept-Language`
- Cookie settings: `httpOnly: true, secure: prod, sameSite: 'strict'`
- `rememberMe`: 30-day vs 2-hour token lifetime

## Key Imports

```typescript
// Server
import { API_URL } from '$env/static/private';
import { $t } from '$lib/i18n';
import { setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

// Client
import { t } from 'svelte-i18n';
import { toast } from 'svelte-sonner';
import { invalidateAll, goto } from '$app/navigation';
import { page } from '$app/stores';
import { getUserContext } from '$lib/context';
import { canEdit, canManageWorkspace } from '$lib/utils/permissions';
import { formatCurrencyWithSymbol } from '$lib/utils/currency';

// UI
import * as Dialog from '$lib/components/ui/dialog';
import * as Form from '$lib/components/ui/form';
import { Button } from '$lib/components/ui/button';
import Icon from '@lucide/svelte/icons/{icon-name}';
```

## Key Types

```typescript
type UserSession = { id, name, email, picture?, currencyCode }
type UserState = { user?, currencyRates?, workspaces, currentWorkspace?, workspaceRole?, hasCollaborators }
type WorkspaceRole = 'OWNER' | 'CONTRIBUTOR' | 'VIEWER'
type ToastMessage = { type: 'success' | 'error', message: string }
```

Full types in `src/lib/types/`: account, bill, budget, category, transaction, workspace.

## File Naming

- Pages: `src/routes/(app)/feature/+page.server.ts`, `+page.svelte`
- API proxy: `src/routes/api/feature/[id]/+server.ts`
- Schemas: `src/lib/schemas/feature.schema.ts`
- Types: `src/lib/types/feature.types.ts`
- Components: `src/lib/components/feature-name.svelte`
- Utilities: `src/lib/utils/feature.ts`
- Server actions: `src/lib/server/actions/feature.ts`

## UI Components

- **shadcn-svelte** (`src/lib/components/ui/`): add via `npx shadcn-svelte@latest add <name>`
- **Icons**: `@lucide/svelte` — import from `@lucide/svelte/icons/{name}`
- **Dark mode**: `mode-watcher` with `toggleMode()`
- **Fonts**: Inter (variable, main) + Leckerli One (`.font-cursive`, logo)
