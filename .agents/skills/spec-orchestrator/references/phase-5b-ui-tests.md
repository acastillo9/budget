# Phase 5b — Write UI Tests (TDD: Write Only)

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<SPEC-NAME>/`

---

## Critical TDD Rule

**DO NOT run tests.** Implementation does not exist yet. Write test files only.
Tests define the contract that the implementation (Phase 6b) must satisfy.

---

## Prompt Template

```
Write comprehensive E2E Playwright test files for the UI — DO NOT run them.

1. Read .claude/orchestrator/<SPEC-NAME>/phase-3-design.md for UI specs and the Test Strategy section
2. Invoke the budget-test-ui skill
3. Read budget-ui/CLAUDE.md for testing conventions and commands

Write E2E Playwright test files covering:
- Page navigation and rendering (routes load correctly, correct content displayed)
- Form submissions (valid data, invalid data, field validation messages)
- User interactions (click, type, select, drag, keyboard navigation)
- API integration (data loads from server, form submissions reach API)
- Responsive behavior if applicable (mobile, tablet, desktop viewports)

IMPORTANT: DO NOT run the tests. The implementation does not exist yet.
These tests define the contract that Phase 6b must implement against.

Write a manifest to: .claude/orchestrator/<SPEC-NAME>/phase-5b-tests-ui.md

Format:
# UI Tests (TDD): <Feature>

## Test Files
- <path> — <N test cases, description of what they verify>

## Test Inventory
| Test File | Test Name | Verifies |
|-----------|-----------|----------|
| <path> | <test name> | <what the test checks> |

## Coverage Notes
- Pages covered: N
- Form scenarios: N
- Interaction cases: N
- Integration cases: N
- Total test cases: N

Return a 1-line summary: "Wrote N UI test cases across M files (not yet run)"
```
