# Phase 8 — Code Review

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<SPEC-NAME>/`

---

## Prompt Template

```
Review all code generated in phases 5a, 5b, 6a, 6b, and 7.

1. Read .claude/orchestrator/<SPEC-NAME>/phase-5a-tests-api.md for API test file list
2. Read .claude/orchestrator/<SPEC-NAME>/phase-5b-tests-ui.md for UI test file list
3. Read .claude/orchestrator/<SPEC-NAME>/phase-6a-impl-api.md for backend file list
4. Read .claude/orchestrator/<SPEC-NAME>/phase-6b-impl-ui.md for frontend file list
5. Read .claude/orchestrator/<SPEC-NAME>/phase-7-test-results.md for test results
6. Invoke the code-review skill
7. Read and review every file listed in the manifests

Apply the full code-review checklist:
- Conventions (per CLAUDE.md and subproject CLAUDE.md)
- Code quality (readability, DRY, complexity)
- Security (OWASP top 10, auth, injection)
- Error handling
- TypeScript type safety
- i18n completeness
- Reuse of existing utilities

Additional TDD-specific checks:
- **Test coverage adequacy** — do tests cover all meaningful scenarios from the design?
- **Test quality** — do tests verify meaningful behavior (not just existence checks)?
- **Implementation-test alignment** — does implementation satisfy test expectations without bypassing them?
- **No test weakening** — were any test assertions weakened or removed during Phase 7 fix cycles?

Write findings to: .claude/orchestrator/<SPEC-NAME>/phase-8-review.md

Format:
# Code Review: <Feature>

## Critical
- **[file:line]** *(Category)* — Description. **Fix:** Recommended change.

## Warning
- **[file:line]** *(Category)* — Description. **Fix:** Recommended change.

## Suggestion
- **[file:line]** *(Category)* — Description. **Fix:** Recommended change.

## Pre-existing Issues
Issues found during review that predate this feature (not introduced by the current work):
- **[file:line]** — Description. *(Pre-existing — not caused by this feature.)*

## TDD Assessment
- Test coverage: <adequate / gaps identified>
- Test quality: <high / medium / low — rationale>
- Implementation-test alignment: <strong / weak — rationale>
- Tests weakened during fix cycles: <yes (details) / no>

## Summary
- Critical: N | Warning: N | Suggestion: N
- Pre-existing: N
- Files reviewed: N

Return a 1-line summary: "Review: C critical, W warnings, S suggestions across N files"
```
