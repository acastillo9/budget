# Phase 6 — Code Review

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<EPIC-KEY>/`

---

## Prompt Template

```
Review all code generated in phases 4a, 4b, 5a, and 5b.

1. Read .claude/orchestrator/<EPIC-KEY>/phase-4a-impl-api.md for backend file list
2. Read .claude/orchestrator/<EPIC-KEY>/phase-4b-impl-ui.md for frontend file list
3. Read .claude/orchestrator/<EPIC-KEY>/phase-5a-tests-api.md for API test file list
4. Read .claude/orchestrator/<EPIC-KEY>/phase-5b-tests-ui.md for UI test file list
5. Invoke the code-review skill
6. Read and review every file listed in the manifests

Apply the full code-review checklist:
- Conventions (per CLAUDE.md and subproject CLAUDE.md)
- Code quality (readability, DRY, complexity)
- Security (OWASP top 10, auth, injection)
- Error handling
- TypeScript type safety
- i18n completeness
- Reuse of existing utilities

Write findings to: .claude/orchestrator/<EPIC-KEY>/phase-6-review.md

Format:
# Code Review: <Feature>

## Critical
- **[file:line]** *(Category)* — Description. **Fix:** Recommended change.

## Warning
- **[file:line]** *(Category)* — Description. **Fix:** Recommended change.

## Suggestion
- **[file:line]** *(Category)* — Description. **Fix:** Recommended change.

## Summary
- Critical: N | Warning: N | Suggestion: N
- Files reviewed: N

Return a 1-line summary: "Review: C critical, W warnings, S suggestions across N files"
```
