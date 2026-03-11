# Phase 7 — Run Tests & Fix (TDD Green Phase)

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<SPEC-NAME>/`

---

## Purpose

This is the TDD "green" phase. Tests were written in Phase 5a/5b before implementation.
Implementation was written in Phase 6a/6b to satisfy those tests. Now run all tests
and fix any failures through iterative fix-and-rerun cycles.

---

## Prompt Template

```
Run all tests and fix failures. This is the TDD green phase.

1. Read .claude/orchestrator/<SPEC-NAME>/phase-5a-tests-api.md for API test file locations
2. Read .claude/orchestrator/<SPEC-NAME>/phase-5b-tests-ui.md for UI test file locations
3. Read .claude/orchestrator/<SPEC-NAME>/phase-6a-impl-api.md for backend implementation file locations
4. Read .claude/orchestrator/<SPEC-NAME>/phase-6b-impl-ui.md for frontend implementation file locations

Run API tests:
  cd budget-api && npm run test:e2e

Run UI tests:
  cd budget-ui && npx playwright test

If there are failures:
1. Analyze the error messages and stack traces
2. Read the failing test files and the implementation files they test
3. Fix the implementation code (or fix the test if the test has a bug — but prefer fixing implementation)
4. Re-run the failing tests
5. Repeat up to 3 fix-and-rerun cycles total

Rules:
- Never skip or suppress failing tests
- Never delete or comment out test assertions to make them pass
- Prefer fixing implementation over fixing tests (tests are the contract)
- If a test has a genuine bug (wrong assertion, incorrect expectation), fix the test and document why
- After 3 cycles, report remaining failures as unresolved

Write results to: .claude/orchestrator/<SPEC-NAME>/phase-7-test-results.md

Format:
# Test Results (TDD Green Phase): <Feature>

## API Tests
- Command: cd budget-api && npm run test:e2e
- Total: N | Passed: P | Failed: F

### Results by File
| Test File | Tests | Passed | Failed |
|-----------|-------|--------|--------|

### Failures (if any)
- <test name> — <error message summary>

## UI Tests
- Command: cd budget-ui && npx playwright test
- Total: N | Passed: P | Failed: F

### Results by File
| Test File | Tests | Passed | Failed |
|-----------|-------|--------|--------|

### Failures (if any)
- <test name> — <error message summary>

## Fix Log
| Cycle | What Failed | What Was Fixed | File Changed | Result |
|-------|-------------|----------------|--------------|--------|

## Unresolved Failures
- <test name> — <error message and what was tried> (or "None")

Return a 1-line summary: "Tests: A API (P passed, F failed), B UI (P passed, F failed) after N fix cycles"
```
