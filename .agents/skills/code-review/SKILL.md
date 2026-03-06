---
name: code-review
description: >
  Review code that was previously generated or modified for quality, conventions,
  security, and correctness. Acts as a quality gate after code generation — detects
  which subproject (budget-api/ or budget-ui/) changes belong to, applies appropriate
  patterns and conventions, and presents findings organized by severity. Use when
  Claude needs to: (1) Review generated or modified code, (2) Check code quality
  after a generation workflow, (3) Audit changes for security, conventions, or
  correctness, or (4) Provide a second-pass review before committing. Triggers on:
  "review the code", "check what was generated", "review changes", "code review",
  or at the end of code generation workflows.
---

# Code Review

## 1. Detect Changes

Run these commands to identify all changed files:

```bash
# Unstaged and untracked
git status --short

# Staged changes
git diff --staged --name-only

# Uncommitted changes (diff content for analysis)
git diff
git diff --staged
```

Read every changed file fully. Do not skip files or rely on diff hunks alone — review full file context.

## 2. Load Subproject Context

Based on changed file paths:

- Files under `budget-api/` → invoke the `budget-api` skill and read `budget-api/CLAUDE.md`
- Files under `budget-ui/` → invoke the `budget-ui` skill and read `budget-ui/CLAUDE.md`
- Files in both → invoke both skills

Rely on the subproject skills for specific patterns and conventions. Do not duplicate their guidance.

## 3. Review Checklist

Evaluate each changed file against these categories:

| # | Category | What to check |
|---|---|---|
| 1 | **Conventions** | Naming, file structure, module organization per CLAUDE.md and subproject CLAUDE.md |
| 2 | **Code quality** | Readability, DRY, unnecessary complexity, over-engineering, dead code |
| 3 | **Security** | OWASP top 10, injection risks, auth issues, exposed secrets, missing guards |
| 4 | **Error handling** | Proper error propagation, edge cases, missing try/catch, unhandled promises |
| 5 | **TypeScript** | Type safety, null checks, proper generics, `any` usage, missing types |
| 6 | **i18n** | Both `en` and `es` translations present where UI text was added/changed |
| 7 | **Reuse** | Existing utilities, helpers, or shared code that could replace new code |
| 8 | **External config** | `ConfigService.getOrThrow()` in constructor for mandatory env vars, not `get()` at first use |
| 9 | **Transaction consistency** | Cascade operations use DB session propagation; external resource cleanup deferred to post-commit |
| 10 | **I18nContext safety** | `I18nContext.current()` returns `null` outside HTTP request scope (cron jobs, event handlers) — verify code uses `?.lang \|\| 'en'` fallback |

## 4. Present Findings

Group findings by severity. Use this exact format:

```
## Code Review Results

### Critical
- **[file:line]** *(Category)* — Description. **Fix:** Recommended change.

### Warning
- **[file:line]** *(Category)* — Description. **Fix:** Recommended change.

### Suggestion
- **[file:line]** *(Category)* — Description. **Fix:** Recommended change.

### Summary
- Critical: N | Warning: N | Suggestion: N
- Files reviewed: N
```

Omit empty severity sections. If no findings, state: "No issues found — code looks good."

## 5. Offer to Apply

After presenting findings, ask:

> Would you like me to apply these improvements?

If the user agrees, apply the fixes. If they select specific items, apply only those.
