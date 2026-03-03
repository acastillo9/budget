# Phase 5a — API Tests

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<EPIC-KEY>/`

---

## Prompt Template

```
Write E2E tests for the backend implementation.

1. Read .claude/orchestrator/<EPIC-KEY>/phase-2-design.md for the design
2. Read .claude/orchestrator/<EPIC-KEY>/phase-4a-impl-api.md for the file manifest
3. Invoke the budget-test-api skill
4. Read the implemented source files listed in phase-4a-impl-api.md

Write comprehensive E2E tests covering:
- All new endpoints (happy path + error cases)
- Authentication/authorization scenarios
- Input validation (invalid DTOs, missing fields)
- Business logic edge cases
- Database state verification

Run the tests: cd budget-api && npm run test:e2e
Fix any failures.

Write results to: .claude/orchestrator/<EPIC-KEY>/phase-5a-tests-api.md

Format:
# API Test Results: <Feature>

## Test Files
- <path> — <N tests, description>

## Results
- Total: N tests
- Passed: N
- Failed: N
- <failure details if any>

Return a 1-line summary: "N API tests: P passed, F failed"
```
