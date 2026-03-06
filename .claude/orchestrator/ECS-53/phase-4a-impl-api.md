# Backend Implementation: Terms of Service, Privacy Policy & User Consent System

## Created Files

- `budget-api/src/terms/entities/terms-type.enum.ts` — Enum for legal document types (TOS, PRIVACY_POLICY)
- `budget-api/src/terms/entities/terms-locale.enum.ts` — Enum for supported locales (EN, ES)
- `budget-api/src/terms/entities/terms-version.entity.ts` — Mongoose schema for versioned legal documents with compound indexes
- `budget-api/src/terms/entities/user-consent.entity.ts` — Mongoose schema for user consent records with unique constraint on user+termsVersion
- `budget-api/src/terms/dto/active-terms-query.dto.ts` — Query DTO with optional locale param (defaults to EN)
- `budget-api/src/terms/dto/terms-version.dto.ts` — Response DTO for terms version with @Exclude/@Expose pattern
- `budget-api/src/terms/dto/record-consent.dto.ts` — Input DTO for recording consent with @IsMongoId validation
- `budget-api/src/terms/dto/user-consent.dto.ts` — Response DTO for consent records with nested TermsVersionDto
- `budget-api/src/terms/dto/consent-status.dto.ts` — Response DTO with allAccepted boolean, pending and accepted lists
- `budget-api/src/terms/terms.service.ts` — Service with getActiveTerms, getTermsById, recordConsent (idempotent upsert), recordBulkConsent, getConsentStatus, getConsentHistory
- `budget-api/src/terms/terms.controller.ts` — Controller with 5 endpoints: GET /terms/active (@Public), GET /terms/:id (@Public), POST /terms/consent (JWT), GET /terms/consent/status (JWT), GET /terms/consent/history (JWT)
- `budget-api/src/terms/terms.module.ts` — Module registering both schemas, exporting TermsService
- `budget-api/src/terms/content/terms-of-service.en.md` — English Terms of Service markdown content
- `budget-api/src/terms/content/terms-of-service.es.md` — Spanish Terms of Service markdown content
- `budget-api/src/terms/content/privacy-policy.en.md` — English Privacy Policy markdown content
- `budget-api/src/terms/content/privacy-policy.es.md` — Spanish Privacy Policy markdown content
- `budget-api/src/i18n/en/terms.json` — English i18n translations for terms module
- `budget-api/src/i18n/es/terms.json` — Spanish i18n translations for terms module
- `budget-api/migrations/20260305120000-seed-terms-versions.js` — Idempotent migration to seed 4 initial terms versions (TOS en/es, Privacy Policy en/es) from markdown files

## Modified Files

- `budget-api/src/app.module.ts` — Added TermsModule import to AppModule
- `budget-api/src/auth/auth.module.ts` — Added TermsModule import to AuthModule
- `budget-api/src/auth/auth.service.ts` — Injected TermsService; added ipAddress/userAgent params to registerByEmail and googleLogin; added private recordConsentAfterRegistration helper that calls recordBulkConsent non-blocking (fire-and-forget with catch+log); called after successful new-user registration in both email and Google flows
- `budget-api/src/auth/auth.controller.ts` — Added @Req() to register() to extract req.ip and req.headers['user-agent']; passed IP and user-agent through to authService.registerByEmail() and authService.googleLogin()

## Lint Status

```
> budget-api@0.0.1 lint
> eslint "{src,apps,libs,test}/**/*.ts" --fix

(no errors or warnings)
```

Lint passes cleanly.

## Deviations

- **TermsModule does not import SharedModule** — The design did not specify SharedModule (which provides DbTransactionService). The TermsService does not need multi-document transactions since consent recording uses idempotent upsert (`findOneAndUpdate` with `$setOnInsert` and `upsert: true`), so DbTransactionService is not required.
- **Controller route ordering: `/consent/status` and `/consent/history` declared before `/:id`** — NestJS matches routes top-to-bottom. If `/:id` were declared first, requests to `/consent/status` and `/consent/history` would incorrectly match the `:id` param. The controller places the specific `consent/*` routes before the generic `/:id` route to prevent this conflict.
- **No `consent-history.dto.ts` as a separate file** — The design listed a `consent-history.dto.ts` in the file structure but the response type is simply `UserConsentDto[]`, so a separate file is unnecessary. The controller returns `Promise<UserConsentDto[]>` directly.
- **Response DTOs use `@Exclude()`/`@Expose()` pattern** — The design showed DTOs without these decorators, but the budget-api skill pattern requires class-level `@Exclude()` with `@Expose()` on public fields for proper serialization via the global `ClassSerializerInterceptor`. This matches the existing codebase convention.
