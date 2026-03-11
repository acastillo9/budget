# Phase 5a — Write API Tests (TDD: Write Only)

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<SPEC-NAME>/`

---

## Critical TDD Rule

**DO NOT run tests.** Implementation does not exist yet. Write test files only.
Tests define the contract that the implementation (Phase 6a) must satisfy.

---

## Prompt Template

```
Write comprehensive E2E test files for the API — DO NOT run them.

1. Read .claude/orchestrator/<SPEC-NAME>/phase-3-design.md for API endpoint specs and the Test Strategy section
2. Invoke the budget-test-api skill
3. Read budget-api/CLAUDE.md for testing conventions and commands

Write E2E test files covering:
- All new endpoints — happy path + error cases for each
- Authentication/authorization scenarios (missing token, wrong role, expired token)
- Input validation (invalid DTOs, missing required fields, type mismatches)
- Business logic edge cases (as specified in the design's Test Strategy)
- Database state verification (correct data persisted after operations)

IMPORTANT: DO NOT run the tests. The implementation does not exist yet.
These tests define the contract that Phase 6a must implement against.

Write a manifest to: .claude/orchestrator/<SPEC-NAME>/phase-5a-tests-api.md

Format:
# API Tests (TDD): <Feature>

## Test Files
- <path> — <N test cases, description of what they verify>

## Test Inventory
| Test File | Test Name | Verifies |
|-----------|-----------|----------|
| <path> | <test name> | <what the test checks> |

## Coverage Notes
- Endpoints covered: N
- Auth scenarios: N
- Validation cases: N
- Edge cases: N
- Total test cases: N

Return a 1-line summary: "Wrote N API test cases across M files (not yet run)"
```
