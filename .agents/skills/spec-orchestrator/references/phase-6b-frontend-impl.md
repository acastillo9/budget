# Phase 6b — Frontend Implementation (TDD: Satisfy Tests)

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<SPEC-NAME>/`

---

## Critical TDD Rule

**Read the test files first.** Tests written in Phase 5b define the contract.
Implementation must satisfy those tests. DO NOT run tests — Phase 7 handles that.

---

## Prompt Template

```
Implement the frontend changes to satisfy the pre-written tests.

1. Read .claude/orchestrator/<SPEC-NAME>/phase-3-design.md for the architecture
2. Read .claude/orchestrator/<SPEC-NAME>/phase-5b-tests-ui.md for the test manifest
3. Read the actual test files listed in phase-5b-tests-ui.md — understand what they expect
4. Invoke the budget-ui skill
5. Invoke the svelte-code-writer skill for all .svelte file work
6. Invoke the frontend-design skill for UI design quality
7. Read budget-ui/CLAUDE.md for conventions and commands

Implement ALL frontend changes specified in the design:
- Page routes (+page.svelte, +page.server.ts)
- Components (.svelte files)
- API proxy routes (+server.ts)
- Form schemas (Zod)
- Types and interfaces
- i18n translations (en + es)
- Navigation updates if needed

The implementation MUST satisfy the test expectations from Phase 5b:
- Routes and page structure must match what tests navigate to
- Form fields and selectors must match what tests interact with
- UI behavior must produce the outcomes tests verify
- API integration must work as tests expect

After implementation, run: cd budget-ui && npm run lint && npm run check
Fix any errors. You MUST include the full lint and check output in the phase file.

DO NOT run tests — Phase 7 will handle test execution.

If you deviate from any pattern in the budget-ui skill, document the deviation and rationale.

Write a manifest of all created/modified files to: .claude/orchestrator/<SPEC-NAME>/phase-6b-impl-ui.md

Format:
# Frontend Implementation (TDD): <Feature>

## Created Files
- <path> — <purpose>

## Modified Files
- <path> — <what changed>

## Test Alignment
- Tests read: <list of test files from phase-5b>
- Key expectations addressed: <brief summary of how implementation satisfies tests>

## Lint/Check Status
<full lint + check output — pass or fail with details>

## Deviations
- <deviation description> — <rationale> (or "None")

Return a 1-line summary: "Created N files, modified M files in budget-ui/ (tests pending)"
```
