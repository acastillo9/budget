# Skills Analysis: Receipt & Document Attachments for Transactions

## Skill Usage Summary

| Skill | Phase(s) | Effectiveness | Notes |
|-------|----------|---------------|-------|
| `epic-orchestrator` | All | High | Successfully coordinated 7 phases with file-based handoffs. STATUS.md tracking worked well. |
| `budget-api` | 2 (Design), 4a (Backend Impl) | Medium | Covered standard CRUD patterns well but lacked guidance for file upload (Multer/multipart), external service integration (S3), and provider override patterns for testing. |
| `budget-ui` | 2 (Design), 4b (Frontend Impl) | Medium | Covered page/component/proxy patterns well. No guidance on client-side file handling, multipart proxy forwarding, or drag-and-drop interaction patterns. |
| `budget-mermaid-docs` | 3 (Docs) | High | Produced 3 diagrams (class, sequence, ER) without issues. |
| `budget-test-api` | 5a (API Tests) | Medium | Template and helpers were useful. Subagent had to create a custom `createTestAppWithMockedS3` function outside the standard `createTestApp()` pattern because the skill provides no guidance on mocking/overriding external service providers. |
| `budget-test-ui` | 5b (UI Tests) | Medium | POM pattern and test structure followed conventions. No guidance on testing file inputs, drag-and-drop, or mocking API responses for upload flows. |
| `code-review` | 6 (Review) | High | Detected 3 critical issues (session/transaction consistency, ObjectId casting, filename sanitization), 8 warnings, and 7 suggestions across 22 files. Thorough and well-structured. |
| `svelte-code-writer` | 4b (Frontend Impl) | Low-Medium | Referenced for Svelte 5 syntax but offered no patterns for file input handling, FormData construction, or progressive enhancement with file uploads. |
| `frontend-design` | 4b (Frontend Impl) | Low | Drag-and-drop upload zones and thumbnail previews are common UI patterns that this skill could have provided guidance on but did not. |

## Identified Gaps

### 1. File Upload / Multipart Handling (API)
The `budget-api` skill covers standard JSON CRUD patterns but has no guidance for:
- `@UseInterceptors(FileInterceptor('file'))` with Multer configuration
- `fileFilter` and `limits` options for validation
- Multipart/form-data endpoint patterns
- The code review found that MIME type validation was duplicated between controller and service because there was no canonical pattern to follow.

**Suggested action:** Update `budget-api` skill with a "File Upload Pattern" section.

### 2. External Service Integration (API)
No skill covers integrating with external services (AWS S3, email providers, payment gateways). The subagent had to design the `S3Service` wrapper from scratch. The code review found missing `configService.getOrThrow()` usage, suggesting the subagent lacked guidance on config validation for external services.

**Suggested action:** Update `budget-api` skill with an "External Service Wrapper Pattern" section, or create a dedicated skill.

### 3. Provider Mocking in E2E Tests (API)
The `budget-test-api` skill provides `createTestApp()` and seed helpers but no guidance on:
- `overrideProvider()` for mocking external services (S3, email, etc.)
- Creating custom test app factories when the standard one is insufficient
- The code review noted that the test's custom factory duplicated global pipe/interceptor setup, diverging from the standard factory.

**Suggested action:** Update `budget-test-api` skill with a "Mocking External Providers" section showing `overrideProvider()` patterns.

### 4. Multipart Proxy Forwarding (UI)
The `budget-ui` skill's API proxy pattern only covers JSON `Content-Type` forwarding. The attachments feature required forwarding raw multipart/form-data bodies through SvelteKit proxy routes, which is a fundamentally different pattern (no `JSON.stringify`, pass-through body and content-type). No skill covered this.

**Suggested action:** Update `budget-ui` skill with a "Multipart Proxy Route Pattern" section.

### 5. Client-Side File Handling (UI)
No skill covers:
- File input binding and drag-and-drop patterns in Svelte 5
- Client-side file validation (size, type) before upload
- FormData construction and fetch-based upload from Svelte components
- Upload progress/loading state management

**Suggested action:** Update `budget-ui` or `svelte-code-writer` skill with file handling patterns.

### 6. Cascade Delete Pattern (API)
The `budget-api` skill's service pattern mentions `// Cascade deletes here if needed` in a comment but provides no concrete pattern for:
- Injecting and calling another module's service for cascade operations
- Passing `session` to cross-service delete calls for transactional consistency
- The code review's top critical issue was exactly this: `removeAllByTransaction()` not receiving the session parameter.

**Suggested action:** Update `budget-api` skill's service pattern with a concrete cascade delete example including session propagation.

### 7. Response DTO Field Exclusion (API)
The code review found that `AttachmentDto` leaked internal fields (`s3Key`, `transaction`, `user`, `workspace`) because `@Exclude()`/`@Expose()` were not properly applied. The `budget-api` skill documents the `@Exclude()`/`@Expose()` pattern but only for `_id` and `__v`. The subagent missed applying it to domain-sensitive fields.

**Suggested action:** Update `budget-api` DTO pattern to emphasize excluding all internal/sensitive fields, not just Mongoose internals.

### 8. Lint/Check Execution Failures
Both phase 4a and 4b report that lint/check commands were not run due to shell execution restrictions. Phase 5b also could not execute its tests. This is an orchestration-level gap -- subagents should be instructed to always attempt lint/check and report failures rather than skipping entirely.

**Suggested action:** Update `epic-orchestrator` phase prompts to mandate lint/check execution attempts.

## Improvement Recommendations

### Existing Skills

1. **`budget-api`** -- Add sections for: (a) File Upload Controller Pattern with Multer `FileInterceptor`, `fileFilter`, and `limits`; (b) External Service Wrapper Pattern showing config validation with `getOrThrow()` and proper error handling; (c) Cascade Delete Pattern with session propagation across services; (d) Emphasize `@Exclude()` on all non-public fields in response DTOs (not just `_id`/`__v`).

2. **`budget-test-api`** -- Add section for: Mocking External Providers showing `moduleRef.overrideProvider(S3Service).useValue(mockS3)` pattern integrated with the existing `createTestApp()` factory. Add `seedAttachment()` to the db.helper inventory now that attachments exist.

3. **`budget-ui`** -- Add sections for: (a) Multipart Proxy Route Pattern showing raw body forwarding without JSON serialization; (b) Client-side File Upload Pattern with FormData, fetch, and loading state management; (c) Drag-and-drop file input component pattern.

4. **`budget-test-ui`** -- Add section for: Testing file inputs with Playwright (`page.setInputFiles()`), testing drag-and-drop interactions, and mocking API responses for upload flows.

5. **`code-review`** -- Add checklist item for: "External service configuration validation (env vars checked at startup, not at first use)".

6. **`epic-orchestrator`** -- Update phase 4a/4b/5a/5b prompts to: (a) Mandate lint/check execution and report results; (b) Require subagents to note when they deviate from skill patterns and why.

## New Skill Candidates

1. **`file-upload`** -- Cross-cutting skill for file upload patterns spanning both API (Multer, S3, validation) and UI (drag-and-drop, FormData, proxy forwarding, progress tracking). **Trigger:** "add file upload", "upload feature", "attach files". **Estimated value:** Medium-High. This epic would have benefited significantly, and any future file-handling feature (profile pictures, document management, CSV import) would reuse these patterns. However, updating `budget-api` and `budget-ui` with dedicated sections may be sufficient if file upload features are infrequent.

2. **`aws-integration`** -- Patterns for AWS service integration (S3, SES, SNS, etc.) including config validation, client wrapper services, presigned URLs, error handling, and local development with LocalStack. **Trigger:** "integrate with AWS", "add S3", "add SES". **Estimated value:** Medium. Only valuable if additional AWS services are planned. For now, adding an external service pattern to `budget-api` is more pragmatic.

3. **`data-migration`** -- Patterns for MongoDB schema migrations, index creation, data backfill scripts, and rollback procedures. The design called for a compound index migration (step 13) but no skill covers migration patterns beyond the file naming convention. **Trigger:** "create migration", "add index", "data migration". **Estimated value:** Low-Medium. Migrations are infrequent but error-prone.

## Summary Statistics

- **Skills used:** 9 of 12 available (75%)
- **Skills not used:** `find-skills`, `skill-creator`, `web-design-guidelines`
- **Effectiveness breakdown:** 3 High, 5 Medium, 1 Low-Medium
- **Gaps identified:** 8
- **Improvement recommendations:** 6 (existing skill updates)
- **New skill candidates:** 3 (1 medium-high value, 1 medium, 1 low-medium)
