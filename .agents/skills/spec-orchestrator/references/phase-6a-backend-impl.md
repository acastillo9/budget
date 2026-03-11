# Phase 6a — Backend Implementation (TDD: Satisfy Tests)

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<SPEC-NAME>/`

---

## Critical TDD Rule

**Read the test files first.** Tests written in Phase 5a define the contract.
Implementation must satisfy those tests. DO NOT run tests — Phase 7 handles that.

---

## Prompt Template

```
Implement the backend changes to satisfy the pre-written tests.

1. Read .claude/orchestrator/<SPEC-NAME>/phase-3-design.md for the architecture
2. Read .claude/orchestrator/<SPEC-NAME>/phase-5a-tests-api.md for the test manifest
3. Read the actual test files listed in phase-5a-tests-api.md — understand what they expect
4. Invoke the budget-api skill
5. Read budget-api/CLAUDE.md for conventions and commands

Implement ALL backend changes specified in the design:
- Entities/schemas
- DTOs (create, update, response)
- Services with business logic
- Controllers with endpoints
- Module registrations
- i18n translations (en + es)
- Any guards, interceptors, or pipes needed

The implementation MUST satisfy the test expectations from Phase 5a:
- Endpoint paths, methods, and response shapes must match what tests expect
- Validation rules must produce the error responses tests check for
- Business logic must produce the outcomes tests verify

After implementation, run: cd budget-api && npm run lint
Fix any lint errors. You MUST include the full lint output in the phase file.

DO NOT run tests — Phase 7 will handle test execution.

If you deviate from any pattern in the budget-api skill, document the deviation and rationale.

Write a manifest of all created/modified files to: .claude/orchestrator/<SPEC-NAME>/phase-6a-impl-api.md

Format:
# Backend Implementation (TDD): <Feature>

## Created Files
- <path> — <purpose>

## Modified Files
- <path> — <what changed>

## Test Alignment
- Tests read: <list of test files from phase-5a>
- Key expectations addressed: <brief summary of how implementation satisfies tests>

## Lint Status
<full lint output — pass or fail with details>

## Deviations
- <deviation description> — <rationale> (or "None")

Return a 1-line summary: "Created N files, modified M files in budget-api/ (tests pending)"
```
