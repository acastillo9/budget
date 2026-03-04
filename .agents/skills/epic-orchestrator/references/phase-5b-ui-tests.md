# Phase 5b — UI Tests

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<EPIC-KEY>/`

---

## Prompt Template

```
Write E2E Playwright tests for the frontend implementation.

1. Read .claude/orchestrator/<EPIC-KEY>/phase-2-design.md for the design
2. Read .claude/orchestrator/<EPIC-KEY>/phase-4b-impl-ui.md for the file manifest
3. Invoke the budget-test-ui skill
4. Read the implemented source files listed in phase-4b-impl-ui.md

Write E2E tests covering:
- Page navigation and rendering
- Form submissions (valid + invalid)
- User interactions (click, type, select)
- API integration (mocked or real)
- Responsive behavior if applicable

Run the tests: cd budget-ui && npx playwright test
Fix any failures. If tests still fail after 2 fix attempts, report them explicitly — never skip or suppress failing tests.

Write results to: .claude/orchestrator/<EPIC-KEY>/phase-5b-tests-ui.md

Format:
# UI Test Results: <Feature>

## Test Files
- <path> — <N tests, description>

## Results
- Total: N tests
- Passed: N
- Failed: N
- <failure details if any — include full error messages for failures>

## Unresolved Failures
- <test name> — <error message and what was tried> (or "None")

Return a 1-line summary: "N UI tests: P passed, F failed"
```
