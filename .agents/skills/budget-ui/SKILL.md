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

## Multipart Proxy Route Pattern

For file uploads, forward `FormData` directly — no `JSON.stringify`, no manual `Content-Type` header. The `handleFetch` hook still auto-attaches auth.

```typescript
import { API_URL } from '$env/static/private';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, fetch, params }) => {
  const { transactionId } = params;
  const formData = await request.formData();

  // Forward FormData directly — browser/SvelteKit sets Content-Type with boundary automatically
  const response = await fetch(`${API_URL}/transactions/${transactionId}/attachments`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const { message, statusCode } = await response.json();
    return error(statusCode, { message });
  }
  return json(await response.json());
};
```

Rules:
- `await request.formData()` to extract the multipart body
- Pass `body: formData` directly — **never** `JSON.stringify` or set `Content-Type` manually
- `handleFetch` still attaches `Authorization` and `X-Workspace-Id` headers automatically

Source: `budget-ui/src/routes/api/transactions/[transactionId]/attachments/+server.ts`

## Client-Side File Upload Pattern

Upload files to API proxy routes using `FormData` + `fetch`. Use `$state()` for loading/error tracking.

```typescript
let uploading = $state(false);

async function handleFileSelect(file: File) {
  if (!entityId) {
    // Queue files for upload after parent entity creation
    pendingFiles = [...pendingFiles, file];
    return;
  }
  uploading = true;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const response = await fetch(`/api/transactions/${entityId}/attachments`, {
      method: 'POST',
      body: fd
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Upload failed');
    }
    const newAttachment = await response.json();
    attachments = [...attachments, newAttachment];
    toast.success($t('feature.uploadSuccess'));
  } catch {
    toast.error($t('feature.uploadError'));
  } finally {
    uploading = false;
  }
}
```

**Pending files pattern** — when the parent entity doesn't exist yet (create mode), queue files in a `pendingFiles` array and upload them after the parent is created:

```typescript
let pendingFiles = $bindable<File[]>([]);
const MAX_ATTACHMENTS = 5;
let canUpload = $derived(attachments.length + pendingFiles.length < MAX_ATTACHMENTS);
```

Source: `budget-ui/src/lib/components/create-transaction-wizard/create-transaction-form.svelte`

## Drag-and-Drop File Input Pattern

Accessible file upload zone using a `<button>` with hidden `<input type="file">`, drag events, and client-side validation.

```svelte
<script lang="ts">
  let {
    accept = 'image/jpeg,image/png,image/webp,application/pdf',
    maxSize = 5242880,
    disabled = false,
    uploading = false,
    onFileSelect
  }: {
    accept?: string; maxSize?: number; disabled?: boolean;
    uploading?: boolean; onFileSelect: (file: File) => void;
  } = $props();

  let dragOver = $state(false);
  let errorMessage = $state('');
  let fileInputRef = $state<HTMLInputElement | null>(null);
  const allowedTypes = $derived(accept.split(',').map((t) => t.trim()));

  function validateFile(file: File): boolean {
    errorMessage = '';
    if (!allowedTypes.includes(file.type)) { errorMessage = $t('unsupportedType'); return false; }
    if (file.size > maxSize) { errorMessage = $t('fileTooLarge'); return false; }
    return true;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    if (disabled || uploading) return;
    const file = event.dataTransfer?.files?.[0];
    if (file && validateFile(file)) onFileSelect(file);
  }
</script>

<button type="button" ondrop={handleDrop} ondragover={...} onclick={() => fileInputRef?.click()}
  disabled={disabled || uploading}>
  <!-- Upload icon + instructions -->
</button>
{#if errorMessage}<p class="text-red-500">{errorMessage}</p>{/if}
<input bind:this={fileInputRef} type="file" {accept} class="hidden" onchange={handleFileInput} />
```

Rules:
- Use `<button type="button">` (not `<div>`) for keyboard accessibility
- Hidden `<input type="file">` triggered via `fileInputRef.click()`
- Client-side validation: check MIME type against `accept` list and file size against `maxSize`
- Display error message below the upload zone, reset on next attempt
- Reset `input.value = ''` after selection to allow re-selecting the same file
- `dragOver` state for visual feedback on drag

Source: `budget-ui/src/lib/components/file-upload-zone.svelte`

## Layout-Embedded Features

For features that live in the app layout (overlays, panels, global widgets) rather than dedicated pages. These use client-side state only — no server load functions or form actions.

### Client-side state in `(app)/+layout.svelte`

```svelte
<script lang="ts">
  let panelOpen = $state(false);
  let dialogOpen = $state(false);
  let unreadCount = $state(0);
  let items = $state<PaginatedItems>({ data: [], total: 0, limit: 20, offset: 0, nextPage: null });
  let loading = $state(false);
</script>
```

### Polling with `$effect` + `setInterval`

```typescript
import { browser } from '$app/environment';

$effect(() => {
  if (!browser) return;
  fetchUnreadCount();

  const interval = setInterval(() => {
    if (!document.hidden) fetchUnreadCount(); // Skip when tab is hidden
  }, 60_000);

  const handleVisibilityChange = () => {
    if (!document.hidden) fetchUnreadCount(); // Resume immediately on tab focus
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
});
```

Rules:
- Guard with `if (!browser) return` — `$effect` runs on server during SSR
- Always check `document.hidden` before polling to avoid wasted requests
- Listen for `visibilitychange` to refresh immediately when tab becomes visible
- Return cleanup function from `$effect` to clear interval and remove listeners

### Multiple overlay components (Sheet + Dialog)

```svelte
<!-- Panel (Sheet) opens from header button -->
<NotificationPanel
  bind:open={panelOpen}
  {items} {loading}
  onOpenPreferences={() => { dialogOpen = true; fetchPreferences(); }}
/>

<!-- Dialog opens from within the panel -->
<NotificationPreferencesDialog
  bind:open={dialogOpen}
  {preferences}
  onSave={handleSavePreferences}
/>
```

Coordination: the parent layout holds state for both overlays. Sheet triggers Dialog via callback prop.

### Client-side fetch without form actions

```typescript
async function fetchItems(loadMore = false) {
  loading = true;
  try {
    const offset = loadMore ? items.data.length : 0;
    const response = await fetch(`/api/notifications?limit=20&offset=${offset}`);
    if (!response.ok) { toast.error($t('notifications.loadError')); return; }
    const result = await response.json();
    items = loadMore ? { ...result, data: [...items.data, ...result.data] } : result;
  } catch {
    toast.error($t('notifications.loadError'));
  } finally {
    loading = false;
  }
}
```

Rules:
- Use direct `fetch` to API proxy routes + `toast` for success/error feedback
- No `superValidate` or form actions — these are purely client-side interactions
- For polling endpoints, fail silently (no toast on background fetch errors)

### `dayjs` plugin initialization

Initialize plugins once in a utility module, not in components:

```typescript
// src/lib/utils/date.ts
import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(LocalizedFormat);
dayjs.extend(utc);
dayjs.extend(relativeTime);
```

Usage in components: `let timeAgo = $derived(dayjs(item.createdAt).fromNow());`

Reference impl: Notification bell/panel/preferences in `budget-ui/src/routes/(app)/+layout.svelte`

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
