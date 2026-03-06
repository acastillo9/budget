# Design: Terms of Service, Privacy Policy & User Consent System

## Overview

This feature adds a complete legal compliance layer to the Budget application, introducing Terms of Service and Privacy Policy documents with bilingual support (en/es), a versioned content management system backed by MongoDB, user consent tracking, and UI pages for viewing legal documents and managing consent history. The implementation follows the existing NestJS module pattern (controller + service + entities + DTOs) on the backend, adds a new `TermsModule` to `AppModule`, and on the frontend creates public SvelteKit pages under `(auth)` route group for unauthenticated access, modifies the registration flow to gate on consent, and adds a legal section to the workspaces/settings page. The system is designed so that existing users are grandfathered in and only new registrations require consent acceptance.

## API Changes

### New/Modified Modules

| Module | Purpose | Path | New/Modified |
|--------|---------|------|--------------|
| `TermsModule` | Terms versioning, consent tracking, legal content CRUD | `budget-api/src/terms/` | **New** |
| `AuthModule` | Add consent recording after registration | `budget-api/src/auth/` | **Modified** |

#### TermsModule Structure

```
budget-api/src/terms/
  terms.module.ts
  terms.controller.ts
  terms.service.ts
  content/
    terms-of-service.en.md
    terms-of-service.es.md
    privacy-policy.en.md
    privacy-policy.es.md
  entities/
    terms-version.entity.ts
    user-consent.entity.ts
    terms-type.enum.ts
    terms-locale.enum.ts
  dto/
    terms-version.dto.ts
    user-consent.dto.ts
    active-terms-query.dto.ts
    record-consent.dto.ts
    consent-status.dto.ts
    consent-history.dto.ts
```

### Endpoints

| Method | Path | Description | Auth | Request DTO | Response DTO |
|--------|------|-------------|------|-------------|--------------|
| `GET` | `/terms/active` | Get current active ToS and Privacy Policy for requested locale | `@Public()` | `ActiveTermsQueryDto` (query: `locale?=en`) | `TermsVersionDto[]` |
| `GET` | `/terms/:id` | Get specific terms version by ID | `@Public()` | Path param `id` (MongoId) | `TermsVersionDto` |
| `POST` | `/terms/consent` | Record user acceptance of a terms version | JWT (default) | `RecordConsentDto` | `UserConsentDto` |
| `GET` | `/terms/consent/status` | Check if user has accepted all current active versions | JWT (default) | Query: `locale?=en` | `ConsentStatusDto` |
| `GET` | `/terms/consent/history` | Get user's full consent history | JWT (default) | None | `UserConsentDto[]` |

### Entities/Schemas

#### `TermsVersion` (extends `AuditableSchema`)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | `String` (enum `TermsType`) | Yes | - | `TOS` or `PRIVACY_POLICY` |
| `version` | `String` | Yes | - | Semver string, e.g., `1.0.0` |
| `title` | `String` | Yes | - | Document title (localized) |
| `content` | `String` | Yes | - | Full markdown content of the document |
| `locale` | `String` (enum `TermsLocale`) | Yes | - | `en` or `es` |
| `publishedAt` | `Date` | Yes | - | When this version was published |
| `isActive` | `Boolean` | Yes | `true` | Whether this is the current active version |

**Indexes:**
- `{ type: 1, locale: 1, isActive: 1 }` compound index for efficient active version lookups
- `{ type: 1, version: 1, locale: 1 }` unique compound index to prevent duplicate versions

```typescript
@Schema()
export class TermsVersion {
  @Prop({ type: String, enum: TermsType, required: true })
  type: TermsType;

  @Prop({ type: String, required: true })
  version: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, enum: TermsLocale, required: true })
  locale: TermsLocale;

  @Prop({ type: Date, required: true })
  publishedAt: Date;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const TermsVersionSchema = SchemaFactory.createForClass(TermsVersion)
  .add(AuditableSchema)
  .index({ type: 1, locale: 1, isActive: 1 })
  .index({ type: 1, version: 1, locale: 1 }, { unique: true });
```

#### `UserConsent` (extends `AuditableSchema`)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `user` | `ObjectId` (ref `User`) | Yes | - | The user who accepted |
| `termsVersion` | `ObjectId` (ref `TermsVersion`) | Yes | - | The terms version accepted |
| `acceptedAt` | `Date` | Yes | - | When the user accepted |
| `ipAddress` | `String` | No | - | IP address at time of acceptance |
| `userAgent` | `String` | No | - | User agent string at time of acceptance |

**Indexes:**
- `{ user: 1, termsVersion: 1 }` unique compound index to prevent duplicate consent records

```typescript
@Schema()
export class UserConsent {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  user: UserDocument;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'TermsVersion', required: true, autopopulate: true })
  termsVersion: TermsVersionDocument;

  @Prop({ type: Date, required: true })
  acceptedAt: Date;

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: String })
  userAgent?: string;
}

export const UserConsentSchema = SchemaFactory.createForClass(UserConsent)
  .add(AuditableSchema)
  .index({ user: 1, termsVersion: 1 }, { unique: true });
```

#### Enums

**`TermsType`** (`budget-api/src/terms/entities/terms-type.enum.ts`):
```typescript
export enum TermsType {
  TOS = 'TOS',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
}
```

**`TermsLocale`** (`budget-api/src/terms/entities/terms-locale.enum.ts`):
```typescript
export enum TermsLocale {
  EN = 'en',
  ES = 'es',
}
```

### DTOs

#### `ActiveTermsQueryDto`
```typescript
export class ActiveTermsQueryDto {
  @ApiPropertyOptional({ enum: TermsLocale, default: TermsLocale.EN })
  @IsOptional()
  @IsEnum(TermsLocale)
  locale?: TermsLocale = TermsLocale.EN;
}
```

#### `TermsVersionDto`
```typescript
export class TermsVersionDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: TermsType }) type: TermsType;
  @ApiProperty() version: string;
  @ApiProperty() title: string;
  @ApiProperty() content: string;
  @ApiProperty({ enum: TermsLocale }) locale: TermsLocale;
  @ApiProperty() publishedAt: Date;
  @ApiProperty() isActive: boolean;
}
```

#### `RecordConsentDto`
```typescript
export class RecordConsentDto {
  @ApiProperty({ description: 'ID of the terms version being accepted' })
  @IsMongoId()
  termsVersionId: string;
}
```

#### `UserConsentDto`
```typescript
export class UserConsentDto {
  @ApiProperty() id: string;
  @ApiProperty() termsVersion: TermsVersionDto;
  @ApiProperty() acceptedAt: Date;
  @ApiProperty() ipAddress?: string;
  @ApiProperty() userAgent?: string;
}
```

#### `ConsentStatusDto`
```typescript
export class ConsentStatusDto {
  @ApiProperty() allAccepted: boolean;
  @ApiProperty({ type: [TermsVersionDto] }) pending: TermsVersionDto[];
  @ApiProperty({ type: [TermsVersionDto] }) accepted: TermsVersionDto[];
}
```

### Services

#### `TermsService`

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `getActiveTerms(locale)` | `TermsLocale` | `TermsVersionDto[]` | Returns all active terms versions for the given locale (both TOS and PRIVACY_POLICY) |
| `getTermsById(id)` | `string` | `TermsVersionDto` | Returns a specific terms version by MongoDB ID; throws 404 if not found |
| `recordConsent(userId, termsVersionId, ipAddress, userAgent)` | `string, string, string?, string?` | `UserConsentDto` | Records user acceptance; idempotent (uses `findOneAndUpdate` with `upsert` or catches duplicate key error, returns existing record if already accepted) |
| `recordBulkConsent(userId, locale, ipAddress, userAgent)` | `string, TermsLocale, string?, string?` | `UserConsentDto[]` | Fetches all active terms for locale, records consent for each; designed for registration flow; called from AuthService |
| `getConsentStatus(userId, locale)` | `string, TermsLocale` | `ConsentStatusDto` | Gets all active terms for locale, checks which the user has accepted, returns pending/accepted lists and `allAccepted` boolean |
| `getConsentHistory(userId)` | `string` | `UserConsentDto[]` | Returns all consent records for the user, sorted by `acceptedAt` descending, with populated `termsVersion` |

### AuthModule/AuthService Modifications

The `AuthService` will be modified to:

1. **Import `TermsModule`** in `AuthModule` imports (or inject `TermsService` directly since `TermsModule` will export it).
2. **`registerByEmail()`**: After successful user creation within the transaction, call `termsService.recordBulkConsent()` as a non-blocking fire-and-forget (wrap in try/catch, log error but do not throw). The IP address and user agent will need to be passed through from the controller.
3. **`googleLogin()`**: When a new user is created (the `!user` branch inside `googleAuthRedirect`), call `termsService.recordBulkConsent()` after the transaction completes, similarly non-blocking.
4. **Controller changes**: The `register()` and `googleAuthRedirect()` endpoints will need to extract `req.ip` (or `X-Forwarded-For`) and `req.headers['user-agent']` and pass them through to the service.

The `RegisterDto` does NOT need a `termsAccepted` field on the backend -- consent is recorded server-side after successful registration based on the current active terms. The frontend enforces the checkbox requirement via Zod validation.

### Migration

A migration will seed initial terms versions:

**File**: `migrations/YYYYMMDDHHMMSS-seed-terms-versions.js`

- Reads the 4 markdown files from `budget-api/src/terms/content/`
- Inserts 4 `termsVersions` documents (TOS en, TOS es, PRIVACY_POLICY en, PRIVACY_POLICY es)
- All with `version: '1.0.0'`, `isActive: true`, `publishedAt: new Date()`

---

## UI Changes

### New/Modified Routes

| Route Path | Page Component | Server Loader | Form Actions | Auth Required | New/Modified |
|------------|---------------|---------------|--------------|---------------|--------------|
| `/terms` | `(auth)/terms/+page.svelte` | `+page.server.ts` loads active TOS | None | No (public, under `(auth)` group) | **New** |
| `/privacy` | `(auth)/privacy/+page.svelte` | `+page.server.ts` loads active Privacy Policy | None | No (public, under `(auth)` group) | **New** |
| `/signup` | `(auth)/signup/+page.svelte` | Existing | Existing `post` action (no change needed) | No | **Modified** |
| `/workspaces` | `(app)/workspaces/+page.svelte` | Modified to also load consent status + history | None | Yes | **Modified** |

**Note on route placement**: The `/terms` and `/privacy` pages are placed under the `(auth)` route group because that group is publicly accessible (no auth redirect in its layout) and already includes the Header + Footer layout. This matches the pattern of other public pages (signin, signup, forgot-password).

### Components

#### New Components

| Component | Path | Purpose | Props | Events |
|-----------|------|---------|-------|--------|
| `legal-content-page.svelte` | `src/lib/components/legal-content-page.svelte` | Shared component for rendering legal markdown content as HTML. Used by both `/terms` and `/privacy` pages. | `title: string`, `content: string`, `version: string`, `lastUpdated: Date` | None |
| `consent-checkbox.svelte` | `src/lib/components/consent-checkbox.svelte` | Terms acceptance checkbox with links, used in registration form | `checked: boolean`, `error?: string` | `onchange: (checked: boolean) => void` |
| `legal-settings-section.svelte` | `src/lib/components/legal-settings-section.svelte` | Legal section for the workspaces/settings page | `consentStatus: ConsentStatus`, `consentHistory: UserConsent[]` | None |

#### Modified Components

| Component | Path | Change |
|-----------|------|--------|
| `footer.svelte` | `src/lib/components/footer.svelte` | Add links to `/terms` and `/privacy` alongside existing content |
| `basic-info-form.svelte` | `src/lib/components/register-form/basic-info-form.svelte` | Add `consent-checkbox.svelte` before the submit button |

### API Proxy Routes

| Proxy Route | Method(s) | Upstream API Endpoint | Auth Required | New |
|-------------|-----------|----------------------|---------------|-----|
| `/api/terms/active` | `GET` | `GET ${API_URL}/terms/active?locale={locale}` | No (public) | **New** |
| `/api/terms/[id]` | `GET` | `GET ${API_URL}/terms/:id` | No (public) | **New** |
| `/api/terms/consent` | `POST` | `POST ${API_URL}/terms/consent` | Yes | **New** |
| `/api/terms/consent/status` | `GET` | `GET ${API_URL}/terms/consent/status?locale={locale}` | Yes | **New** |
| `/api/terms/consent/history` | `GET` | `GET ${API_URL}/terms/consent/history` | Yes | **New** |

**Note**: The public proxy routes (`/api/terms/active` and `/api/terms/[id]`) will still go through `handleFetch` which attaches `Accept-Language`. The `/terms` and `/privacy` page server loaders will fetch directly from `API_URL` in `+page.server.ts` (same pattern as other server-side data loading).

#### Proxy Route File Structure

```
budget-ui/src/routes/
  api/
    terms/
      active/+server.ts          # GET - proxy to /terms/active
      [id]/+server.ts             # GET - proxy to /terms/:id
      consent/
        +server.ts                # POST - proxy to /terms/consent
        status/+server.ts         # GET - proxy to /terms/consent/status
        history/+server.ts        # GET - proxy to /terms/consent/history
```

### State Management

No new Svelte stores are needed. The legal pages load data server-side via `+page.server.ts` loaders and pass it as page data props. The consent status/history for the settings page is also loaded server-side.

The registration form checkbox state is managed locally within the `basic-info-form.svelte` component via Svelte 5 `$state()` and validated through the existing `superForm` + Zod pattern.

### Types

New TypeScript types in `budget-ui/src/lib/types/terms.types.ts`:

```typescript
export interface TermsVersion {
  id: string;
  type: 'TOS' | 'PRIVACY_POLICY';
  version: string;
  title: string;
  content: string;
  locale: 'en' | 'es';
  publishedAt: string;
  isActive: boolean;
}

export interface UserConsent {
  id: string;
  termsVersion: TermsVersion;
  acceptedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentStatus {
  allAccepted: boolean;
  pending: TermsVersion[];
  accepted: TermsVersion[];
}
```

### Schema Modifications

Modified Zod schema in `budget-ui/src/lib/schemas/auth.schema.ts`:

```typescript
export const signupFormSchema = z.object({
  name: z.string().min(1, { error: () => $t('signUp.validation.nameIsRequired') }).max(200),
  email: z.string().email(),
  currencyCode: z.enum(currencyCodes),
  termsAccepted: z.literal(true, {
    error: () => $t('signUp.validation.termsRequired')
  })
});
```

The `termsAccepted` field is frontend-only validation -- it is NOT sent to the backend API. The backend records consent automatically after successful registration.

---

## Data Flow

### Viewing Terms of Service / Privacy Policy

```
User visits /terms (or /privacy)
  -> SvelteKit +page.server.ts load()
    -> fetch(`${API_URL}/terms/active?locale=${userLocale}`)
      -> TermsController.getActiveTerms() [@Public()]
        -> TermsService.getActiveTerms(locale)
          -> TermsVersion.find({ isActive: true, locale })
          -> Returns TermsVersionDto[]
    -> Filter for type === 'TOS' (or 'PRIVACY_POLICY')
    -> Return { terms: TermsVersionDto } as page data
  -> legal-content-page.svelte renders markdown as HTML
```

### Registration with Consent Gate

```
User fills registration form (step 1) with consent checkbox checked
  -> basic-info-form.svelte validates via Zod (termsAccepted: z.literal(true))
  -> Form submits to ?/post action
    -> +page.server.ts actions.post()
      -> fetch(`${API_URL}/auth/register`, { body: { name, email, currencyCode } })
        -> AuthController.register() [@Public()]
          -> AuthService.registerByEmail()
            -> Creates user + workspace in transaction
            -> AFTER transaction succeeds:
              termsService.recordBulkConsent(userId, locale, ipAddress, userAgent)
                -> Finds all active terms for locale
                -> Creates UserConsent records for each
                -> Non-blocking (catch + log on error)
            -> Returns RegisterResponseDto
      -> Continues to activation code step (unchanged)
```

### Google OAuth Registration with Consent

```
User clicks Google sign-in button
  -> Redirects to Google OAuth
  -> Google redirects back to /auth/google-redirect
    -> AuthController.googleAuthRedirect()
      -> AuthService.googleLogin()
        -> If new user (!user):
          -> Creates user + workspace in transaction
          -> AFTER transaction succeeds:
            termsService.recordBulkConsent(userId, locale, ipAddress, userAgent)
              -> Non-blocking consent recording
        -> Returns credentials
  -> Frontend sets cookies, redirects to app
```

**Note on Google OAuth**: The consent checkbox is NOT shown for Google OAuth since the redirect flow does not have a form step. Consent is implicitly recorded when the user initiates Google sign-up. The frontend `/signup` page checkbox applies only to the email registration path. For Google OAuth, clicking the Google button on the signup page implies acceptance (the button label/area will include a note about agreeing to terms).

### Settings - Viewing Consent History

```
User navigates to /workspaces (settings page)
  -> +page.server.ts load()
    -> fetch(`${API_URL}/terms/consent/status?locale=${userLocale}`)
      -> TermsController.getConsentStatus() [JWT required]
        -> TermsService.getConsentStatus(userId, locale)
          -> Finds active terms, compares with user's consents
          -> Returns ConsentStatusDto
    -> fetch(`${API_URL}/terms/consent/history`)
      -> TermsController.getConsentHistory() [JWT required]
        -> TermsService.getConsentHistory(userId)
          -> UserConsent.find({ user: userId }).sort({ acceptedAt: -1 }).populate('termsVersion')
          -> Returns UserConsentDto[]
    -> Returns { ...existing data, consentStatus, consentHistory }
  -> legal-settings-section.svelte renders status + history
```

---

## Implementation Order

1. **ECS-54: Legal Content - Draft ToS and Privacy Policy markdown files**
   - Create `budget-api/src/terms/content/` directory
   - Write `terms-of-service.en.md` and `terms-of-service.es.md`
   - Write `privacy-policy.en.md` and `privacy-policy.es.md`
   - No code dependencies; can be done in parallel with step 2

2. **ECS-55: Backend Data Model - Entities and Enums**
   - Create `budget-api/src/terms/entities/terms-type.enum.ts`
   - Create `budget-api/src/terms/entities/terms-locale.enum.ts`
   - Create `budget-api/src/terms/entities/terms-version.entity.ts`
   - Create `budget-api/src/terms/entities/user-consent.entity.ts`
   - Create `budget-api/src/terms/terms.module.ts` (register schemas)
   - Register `TermsModule` in `AppModule`
   - **Depends on**: Nothing (can run in parallel with step 1)

3. **ECS-56: Backend API - Controller, Service, DTOs, Migration**
   - Create all DTOs in `budget-api/src/terms/dto/`
   - Create `budget-api/src/terms/terms.service.ts` with all methods
   - Create `budget-api/src/terms/terms.controller.ts` with all endpoints
   - Update `terms.module.ts` to export `TermsService`
   - Create migration to seed initial terms versions from markdown files
   - Modify `AuthModule` to import `TermsModule`
   - Modify `AuthService.registerByEmail()` to call `recordBulkConsent()` (non-blocking)
   - Modify `AuthService.googleLogin()` to call `recordBulkConsent()` (non-blocking)
   - Modify `AuthController.register()` to pass IP + user agent to service
   - Modify `AuthController.googleAuthRedirect()` to pass IP + user agent
   - **Depends on**: Steps 1 and 2

4. **ECS-57: Frontend - Terms & Privacy Public Pages + Footer Links**
   - Create `budget-ui/src/lib/types/terms.types.ts`
   - Create `budget-ui/src/lib/components/legal-content-page.svelte`
   - Create `budget-ui/src/routes/(auth)/terms/+page.server.ts` and `+page.svelte`
   - Create `budget-ui/src/routes/(auth)/privacy/+page.server.ts` and `+page.svelte`
   - Create API proxy routes: `api/terms/active/+server.ts`, `api/terms/[id]/+server.ts`
   - Modify `budget-ui/src/lib/components/footer.svelte` to add legal links
   - Add i18n keys for both `en.json` and `es.json`
   - **Depends on**: Step 3 (API must be available)

5. **ECS-58: Frontend - Registration Consent Gate**
   - Create `budget-ui/src/lib/components/consent-checkbox.svelte`
   - Modify `budget-ui/src/lib/schemas/auth.schema.ts` to add `termsAccepted` field
   - Modify `budget-ui/src/lib/components/register-form/basic-info-form.svelte` to include checkbox
   - Add note about terms near Google sign-in button on signup page
   - Add i18n keys for consent checkbox text
   - **Depends on**: Step 4 (links to /terms and /privacy must work); can run in parallel with step 6

6. **ECS-59: Frontend - Settings Legal Section**
   - Create `budget-ui/src/lib/components/legal-settings-section.svelte`
   - Create API proxy routes: `api/terms/consent/+server.ts`, `api/terms/consent/status/+server.ts`, `api/terms/consent/history/+server.ts`
   - Modify `budget-ui/src/routes/(app)/workspaces/+page.server.ts` to load consent data
   - Modify `budget-ui/src/routes/(app)/workspaces/+page.svelte` to render legal section
   - Add i18n keys for legal settings section
   - **Depends on**: Step 3 (API must be available); can run in parallel with step 5

---

## i18n Keys

### English (`en.json`)

```json
{
  "legal": {
    "termsOfService": "Terms of Service",
    "privacyPolicy": "Privacy Policy",
    "lastUpdated": "Last updated: {date}",
    "version": "Version {version}",
    "loadError": "Error loading legal content. Please try again later.",
    "loading": "Loading...",
    "consentCheckbox": "I agree to the {termsLink} and {privacyLink}",
    "termsLink": "Terms of Service",
    "privacyLink": "Privacy Policy",
    "googleConsentNote": "By signing up with Google, you agree to our {termsLink} and {privacyLink}",
    "settings": {
      "title": "Legal & Privacy",
      "description": "Your legal documents and consent history",
      "viewTerms": "View Terms of Service",
      "viewPrivacy": "View Privacy Policy",
      "consentStatus": "Consent Status",
      "upToDate": "Up to date",
      "actionRequired": "Action required",
      "consentHistory": "Consent History",
      "noHistory": "No consent history available.",
      "acceptedOn": "Accepted on {date}",
      "documentTitle": "Document",
      "versionColumn": "Version",
      "dateColumn": "Date Accepted"
    }
  },
  "signUp": {
    "validation": {
      "termsRequired": "You must accept the Terms of Service and Privacy Policy to create an account."
    }
  }
}
```

### Spanish (`es.json`)

```json
{
  "legal": {
    "termsOfService": "Terminos de Servicio",
    "privacyPolicy": "Politica de Privacidad",
    "lastUpdated": "Ultima actualizacion: {date}",
    "version": "Version {version}",
    "loadError": "Error al cargar el contenido legal. Por favor intenta de nuevo.",
    "loading": "Cargando...",
    "consentCheckbox": "Acepto los {termsLink} y la {privacyLink}",
    "termsLink": "Terminos de Servicio",
    "privacyLink": "Politica de Privacidad",
    "googleConsentNote": "Al registrarte con Google, aceptas nuestros {termsLink} y {privacyLink}",
    "settings": {
      "title": "Legal y Privacidad",
      "description": "Tus documentos legales e historial de consentimiento",
      "viewTerms": "Ver Terminos de Servicio",
      "viewPrivacy": "Ver Politica de Privacidad",
      "consentStatus": "Estado de Consentimiento",
      "upToDate": "Al dia",
      "actionRequired": "Accion requerida",
      "consentHistory": "Historial de Consentimiento",
      "noHistory": "No hay historial de consentimiento disponible.",
      "acceptedOn": "Aceptado el {date}",
      "documentTitle": "Documento",
      "versionColumn": "Version",
      "dateColumn": "Fecha de Aceptacion"
    }
  },
  "signUp": {
    "validation": {
      "termsRequired": "Debes aceptar los Terminos de Servicio y la Politica de Privacidad para crear una cuenta."
    }
  }
}
```

---

## Edge Cases & Validation

### Input Validation Rules

| Field | Validation | Error Message |
|-------|-----------|---------------|
| `locale` query param | Must be `en` or `es`; defaults to `en` if absent | Stripped by `ValidationPipe` whitelist if invalid enum |
| `termsVersionId` in `RecordConsentDto` | `@IsMongoId()` | Standard class-validator MongoId error |
| `termsAccepted` in signup form (frontend only) | `z.literal(true)` | `signUp.validation.termsRequired` |
| Terms version `:id` param | Must be a valid MongoDB ObjectId | 400 Bad Request |

### Error Scenarios

| Scenario | Handling |
|----------|----------|
| **No active terms found for locale** | `GET /terms/active` returns empty array `[]`; frontend shows error state message |
| **Terms version not found by ID** | `GET /terms/:id` returns 404 Not Found |
| **Duplicate consent recording** | `POST /terms/consent` is idempotent -- uses `findOneAndUpdate` with upsert or catches MongoDB 11000 duplicate key error, returns the existing consent record with 200/201 |
| **Consent recording fails during registration** | Non-blocking: error is logged with `Logger.error()`, registration proceeds normally. User consent can be recorded later if needed. |
| **User views /terms but API is down** | `+page.server.ts` catches fetch error, returns error flag; page shows error state with retry message |
| **User submits registration without checking consent box** | Zod validation (`z.literal(true)`) prevents form submission; error message displayed inline |
| **Google OAuth user - no checkbox shown** | Consent recorded automatically server-side in `googleLogin()` when new user is created; note text below Google button informs user |
| **Existing (grandfathered) user views settings** | Consent history is empty; `consentStatus.allAccepted` may be `false` but no action is forced; empty state message shown |
| **Terms API returns content in wrong locale** | Frontend requests with user's locale from `accept-language` header; API defaults to `en` if locale param missing |
| **Markdown content contains XSS** | Content is authored by developers (stored in repo), not user-generated; render with a sanitizing markdown library (e.g., `marked` with DOMPurify or `svelte-markdown`) |
| **Rate limiting on consent endpoint** | Relies on existing global rate limiting if configured; idempotency prevents abuse (duplicate records not created) |
| **Migration fails or runs on empty DB** | Migration is idempotent -- checks if terms already exist before inserting; `down()` removes only seeded records |
