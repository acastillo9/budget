# Skills Analysis: Terms of Service, Privacy Policy & User Consent System

## Skill Usage Summary

| Skill | Phase(s) | Effectiveness | Notes |
|-------|----------|---------------|-------|
| `epic-orchestrator` | All | High | Successfully coordinated 7 phases end-to-end with file-based handoff. STATUS.md tracking worked well. |
| `budget-api` | 2 (Design), 4a (Impl) | High | Entity, DTO, controller, service, and module patterns all followed correctly. The `@Exclude()`/`@Expose()` DTO pattern was applied properly. |
| `budget-ui` | 2 (Design), 4b (Impl) | High | Server loader, form action, proxy route, schema, and i18n patterns all applied correctly. |
| `budget-test-api` | 5a (API Tests) | High | 43 tests written following the template. Test helpers (`createTestApp`, `getAuthToken`, `clearDatabase`, `createActiveUser`) all used correctly. |
| `budget-test-ui` | 5b (UI Tests) | High | 35 tests with POM pattern, fixture-based auth, and unauthenticated test file naming convention all followed. |
| `budget-mermaid-docs` | 3 (Docs) | High | 3 diagrams created (class, sequence, ER) following file naming and structure conventions. |
| `code-review` | 6 (Review) | High | Found 3 critical, 8 warnings, 6 suggestions across 37 files. Severity tiers and format matched skill spec exactly. |
| `svelte-code-writer` | 4b (Impl) | Medium | Referenced by orchestrator for frontend phase, but no evidence of CLI tool usage (`@sveltejs/mcp` commands). Subagent likely relied on `budget-ui` skill patterns instead. |
| `frontend-design` | 4b (Impl) | Low | Referenced in orchestrator phase overview for 4b, but the legal content pages and settings section are functional/informational components, not design-intensive. The skill's focus on bold aesthetics was not relevant here. |
| `web-design-guidelines` | — | Not Used | No UI audit was triggered. Could have caught the `{@html}` XSS concern and the missing locale parameter on legal pages earlier. |

## Identified Gaps

### Gap 1: No guidance for public/unauthenticated routes on the backend

The `budget-api` skill's controller pattern assumes all routes are authenticated with `@ApiBearerAuth('JWT')` and workspace-scoped with `@Roles(...)`. The Terms controller needed `@Public()` decorators on two endpoints and had no workspace scoping at all. The subagent had to deviate from the skill pattern to handle this. Phase 4a noted the deviation explicitly: "TermsModule does not import SharedModule" and "Controller route ordering: `/consent/status` and `/consent/history` declared before `/:id`."

**Suggested update:** Add a "Public Endpoint Pattern" section to `budget-api` SKILL.md showing how to use `@Public()`, omit `@ApiBearerAuth`, and handle route ordering when mixing public and authenticated endpoints in the same controller.

### Gap 2: No guidance for non-workspace-scoped entities

The `budget-api` skill states: "All queries filter by `workspace: workspaceId` for data isolation." The Terms feature has entities (`TermsVersion`, `UserConsent`) that are not workspace-scoped -- they are global (terms versions) or user-scoped (consent records). The subagent had to figure out the correct query patterns without skill guidance.

**Suggested update:** Add a note in the `budget-api` skill's Service Pattern section acknowledging that some entities (global config, user-level settings, legal records) are not workspace-scoped, and show the alternative query pattern filtering by `user` only or no user filter at all.

### Gap 3: No guidance for modifying existing modules (cross-module integration)

The epic required modifying `AuthModule` and `AuthService` to inject `TermsService` and call `recordBulkConsent()` after registration. The `budget-api` skill only shows how to create new modules from scratch, not how to integrate a new module's service into an existing module. The subagent had to figure out the import/inject/fire-and-forget pattern independently.

**Suggested update:** Add a "Cross-Module Integration Pattern" section to `budget-api` SKILL.md showing how to import a new module into an existing one, inject its service, and call it (including the non-blocking fire-and-forget pattern with try/catch + logger).

### Gap 4: No guidance for Zod schema + superforms FormData edge cases

Phase 5b (UI Tests) uncovered a critical bug: `z.literal(true)` does not work with superforms' HTML FormData submission because bits-ui Checkbox renders as a `<button>`, not an `<input type="checkbox">`. The fix required changing to `z.boolean().refine()` and adding a hidden input. This was a significant time sink that a skill could have prevented.

**Suggested update:** Add a "FormData Edge Cases" section to `budget-ui` SKILL.md documenting that bits-ui Checkbox is button-based and requires a hidden `<input>` bridge for superforms FormData. Include the `z.boolean().refine()` pattern as the correct approach for boolean checkbox fields.

### Gap 5: No guidance for rendering markdown content in Svelte

The legal pages needed to render API-returned markdown as HTML. The subagent used `{@html content}` directly, which the code review flagged as a latent XSS vector. There is no skill guidance on sanitized HTML rendering in Svelte components.

**Suggested update:** Add an "HTML Content Rendering" note to `budget-ui` SKILL.md covering when `{@html}` is acceptable (developer-authored content) vs. when DOMPurify sanitization is required (user-generated content), and recommend documenting the trust assumption inline.

### Gap 6: No migration writing guidance

Phase 4a created a database migration (`20260305120000-seed-terms-versions.js`) to seed initial terms versions. Neither the `budget-api` skill nor any other skill provides patterns for writing idempotent MongoDB migrations (checking for existing records, reading files, handling up/down). The subagent had to infer the pattern from the migration file naming convention alone.

**Suggested update:** Add a "Migration Pattern" section to `budget-api` SKILL.md showing the idempotent seed migration structure (check-before-insert, proper `up()`/`down()` methods, reading content files from the repo).

### Gap 7: No guidance for locale-aware server-side data fetching in SvelteKit

The code review found that `/terms` and `/privacy` page loaders fetch from the API without passing the user's locale. The `budget-ui` skill's server load pattern does not mention extracting locale from `event.request.headers` or passing it as a query parameter to the API. This is a recurring need for any i18n-aware feature.

**Suggested update:** Add a "Locale-Aware Fetching" note to the `budget-ui` skill's Server Load Pattern showing how to extract locale from `event.request.headers.get('accept-language')` and pass it to the API.

## Improvement Recommendations

### `budget-api` SKILL.md

1. **Add Public Endpoint Pattern** -- Show controller with mixed `@Public()` and authenticated endpoints, including route declaration ordering to prevent param conflicts (specific routes before generic `:id` routes).
2. **Add Non-Workspace Entity Note** -- Document that global or user-scoped entities skip the `workspace: workspaceId` filter in queries.
3. **Add Cross-Module Integration Pattern** -- Show how to import Module B into Module A, inject Service B, and call it with non-blocking fire-and-forget (try/catch + logger.error).
4. **Add Migration Pattern** -- Show idempotent seed migration structure with `up()`/`down()`, check-before-insert, and file reading.
5. **Add error type-narrowing note** -- The code review found `catch(error)` blocks accessing `error.message` without type-narrowing. Add a note in the Service Pattern showing `const msg = error instanceof Error ? error.message : String(error)`.

### `budget-ui` SKILL.md

1. **Add FormData Edge Cases** -- Document bits-ui Checkbox + superforms hidden input bridge pattern and `z.boolean().refine()` for boolean checkbox fields.
2. **Add HTML Content Rendering** -- Document `{@html}` usage policy and sanitization requirements.
3. **Add Locale-Aware Fetching** -- Show how to extract locale from request headers in `+page.server.ts` and pass to API calls.
4. **Add Parallel Data Fetching** -- The code review noted sequential fetches in the workspaces loader. Add a note recommending `Promise.allSettled()` for independent API calls in server loaders.

### `budget-test-ui` SKILL.md

1. **Add hydration timing note** -- Phase 5b discovered that bits-ui components require `waitForLoadState('networkidle')` before interaction due to Svelte hydration timing. Add this as a rule or gotcha.
2. **Add hidden input testing pattern** -- Document how to test checkbox states that rely on hidden inputs for FormData bridging.

### `code-review` SKILL.md

1. **Add i18n accent/diacritic check** -- The review caught missing accent marks in Spanish translations. Add "Verify diacritical marks in non-English translations" to the i18n review checklist item.
2. **Add proxy route error handling check** -- The review found that proxy routes assume JSON error responses. Add "Verify proxy routes handle non-JSON error responses" to the error handling checklist.

### `epic-orchestrator` SKILL.md

1. **Add pre-existing bug documentation** -- Phase 6 found a pre-existing i18n key typo (`tooManyRequest` vs `tooManyRequests`). The orchestrator has no mechanism for tracking pre-existing bugs found during review vs. bugs introduced by the epic. Consider adding a "Pre-existing Issues" section to the review phase output format.

## New Skill Candidates

### `budget-api-migration`
- **Purpose:** Guide writing idempotent MongoDB migrations (seed data, schema changes, data transformations) for the budget-api project.
- **Trigger:** "create a migration", "seed data for...", "write a migration to..."
- **Estimated Value:** Medium. Migrations are infrequent but error-prone. The ECS-53 epic needed one, and future epics with new entities will also need them. Prevents re-discovery of idempotency patterns each time.
- **Alternative:** Could be a section in `budget-api` SKILL.md rather than a standalone skill, given the low frequency.

### `budget-legal-content`
- **Purpose:** Guide writing and updating legal documents (ToS, Privacy Policy) stored as markdown in the repo, with bilingual support and versioning.
- **Trigger:** "update the privacy policy", "add a new legal document", "create terms of service"
- **Estimated Value:** Low. Legal content updates are rare. Not worth a dedicated skill -- a section in `budget-api` SKILL.md or project documentation would suffice.

### `budget-ui-public-pages`
- **Purpose:** Guide creating public (unauthenticated) SvelteKit pages under the `(auth)` route group, including server loaders that fetch without auth tokens and proper SEO/meta tag handling.
- **Trigger:** "create a public page", "add an unauthenticated page"
- **Estimated Value:** Low-Medium. Public pages are uncommon in this app (only signin, signup, forgot-password, and now terms/privacy). The pattern is simple enough to document as a note in `budget-ui` SKILL.md.
- **Alternative:** Add a "Public Page Pattern" section to `budget-ui` SKILL.md instead of a standalone skill.

### `budget-cross-module-integration`
- **Purpose:** Guide integrating a new module's functionality into an existing module (import, inject, call patterns including fire-and-forget).
- **Trigger:** "integrate module X with module Y", "call service X from service Y"
- **Estimated Value:** Medium. Cross-module integration is a recurring pattern as the app grows. However, it is simple enough to document as a section in `budget-api` SKILL.md.
- **Alternative:** Add to `budget-api` SKILL.md rather than creating a standalone skill.

**Recommendation:** None of the new skill candidates warrant standalone skills. All identified gaps are better addressed by updating the existing `budget-api` and `budget-ui` skills with new sections. This keeps the skill inventory focused and avoids fragmentation.
