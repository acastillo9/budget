---
name: spec-orchestrator
description: >
  Orchestrate spec-driven TDD feature development from a specification document
  (Confluence page or local .md file). Drives an 11-phase lifecycle (spec retrieval,
  spec refinement, design, documentation, test writing, implementation, test running,
  code review, skills analysis) by coordinating specialized subagents through
  file-based message passing. Does not implement anything itself — only dispatches
  and tracks. Use when Claude needs to: (1) Implement a feature from a specification
  document, (2) Orchestrate TDD-driven multi-phase feature development, or
  (3) Coordinate multiple skills for a large feature using test-first methodology.
  Triggers on: "orchestrate spec [path-or-url]", "implement spec", "drive spec
  to completion", "/spec-orchestrator".
---

# Spec Orchestrator

Coordinate an 11-phase TDD feature development lifecycle from a specification document.
Dispatch specialized subagents for each phase. Never implement code directly.

## Token Efficiency Contract

- **Never read** phase output files — only read/write `STATUS.md`
- Each subagent returns a **1-line status** string
- Subagents write detailed output to their phase file; the next subagent reads it directly
- Context grows at O(phases), not O(content)

## Input Detection

The user provides a spec source. Auto-detect:
- **Confluence**: input starts with `http` or is purely numeric → Confluence page
- **Local file**: anything else → local file path (`.md` or other)

## Workspace Setup

Derive `<SPEC-NAME>` from the spec title (kebab-case, max 40 chars). Create:

```
.claude/orchestrator/<SPEC-NAME>/
  STATUS.md
```

Initialize `STATUS.md` with:

```markdown
# <SPEC-NAME> — Orchestration Status

| # | Phase | Status | Summary |
|---|-------|--------|---------|
| 1 | Spec Retrieval | pending | — |
| 2 | Spec Refinement | pending | — |
| 3 | Technical Design | pending | — |
| 4 | Documentation | pending | — |
| 5a | Write API Tests | pending | — |
| 5b | Write UI Tests | pending | — |
| 6a | Backend Impl | pending | — |
| 6b | Frontend Impl | pending | — |
| 7 | Run Tests & Fix | pending | — |
| 8 | Code Review | pending | — |
| 9 | Skills Analysis | pending | — |
```

## Phase Overview

| # | Phase | Skills Used | Reads | Writes | Prompt Template |
|---|-------|-------------|-------|--------|-----------------|
| 1 | Spec Retrieval | Atlassian MCP / Read | Confluence page or local .md | phase-1-spec.md | [phase-1-spec-retrieval.md](references/phase-1-spec-retrieval.md) |
| 2 | Spec Refinement | budget-api, budget-ui | phase-1 + codebase | phase-2-refined-spec.md | [phase-2-spec-refinement.md](references/phase-2-spec-refinement.md) |
| 3 | Technical Design | budget-api, budget-ui | phase-2 + codebase | phase-3-design.md | [phase-3-design.md](references/phase-3-design.md) |
| 4 | Documentation | budget-mermaid-docs | phase-3 | phase-4-docs.md | [phase-4-documentation.md](references/phase-4-documentation.md) |
| 5a | Write API Tests | budget-test-api | phase-3 | phase-5a-tests-api.md + test files | [phase-5a-api-tests.md](references/phase-5a-api-tests.md) |
| 5b | Write UI Tests | budget-test-ui | phase-3 | phase-5b-tests-ui.md + test files | [phase-5b-ui-tests.md](references/phase-5b-ui-tests.md) |
| 6a | Backend Impl | budget-api | phase-3 + phase-5a + test files | phase-6a-impl-api.md | [phase-6a-backend-impl.md](references/phase-6a-backend-impl.md) |
| 6b | Frontend Impl | budget-ui, svelte-code-writer, frontend-design | phase-3 + phase-5b + test files | phase-6b-impl-ui.md | [phase-6b-frontend-impl.md](references/phase-6b-frontend-impl.md) |
| 7 | Run Tests & Fix | budget-test-api, budget-test-ui | phase-5a/5b + phase-6a/6b + files | phase-7-test-results.md | [phase-7-test-run.md](references/phase-7-test-run.md) |
| 8 | Code Review | code-review | phase-5 + phase-6 + phase-7 files | phase-8-review.md | [phase-8-code-review.md](references/phase-8-code-review.md) |
| 9 | Skills Analysis | — | All phase files + AGENTS.md | phase-9-skills.md | [phase-9-skills-analysis.md](references/phase-9-skills-analysis.md) |

## Execution Rules

1. Run phases **sequentially**: 1 → 2 → CP → 3 → CP → 4 → 5a∥5b → 6a∥6b → 7 → 8 → CP → 9
2. Phases 5a/5b run in **parallel**. Same for 6a/6b.
3. After each subagent returns, update `STATUS.md` with the 1-line summary.
4. Before dispatching each phase, read its prompt template from `references/`.
5. Test-writing subagents (5a/5b) **must NOT run tests** — implementation doesn't exist yet.
6. Implementation subagents (6a/6b) **must** run lint/check but **must NOT run tests**.
7. Phase 7 subagent runs all tests and applies fix cycles (up to 3 attempts).
8. All subagents **must** note deviations from skill patterns with rationale.

## User Checkpoints

### After Phase 2 (Spec Refinement)

Pause and present:

> **Spec refinement checkpoint.** Phase 2 produced a refined spec at `.claude/orchestrator/<SPEC-NAME>/phase-2-refined-spec.md`.
> Options: (1) Approve and continue, (2) Reject with feedback, (3) View refined spec

If rejected, re-run Phase 2 with the user's feedback appended to the subagent prompt.

### After Phase 3 (Technical Design)

Pause and present:

> **Design checkpoint.** Phase 3 produced a design document at `.claude/orchestrator/<SPEC-NAME>/phase-3-design.md`.
> Options: (1) Approve and continue, (2) Reject with feedback, (3) View design doc

If rejected, re-run Phase 3 with the user's feedback appended to the subagent prompt.

### After Phase 8 (Code Review)

Pause and present the 1-line review summary from `STATUS.md`, then:

> **Review checkpoint.** Options: (1) Apply critical fixes, (2) Commit as-is, (3) View full review

If "apply critical fixes," dispatch a fix subagent with the review findings.

## Forbidden Actions

- **Do not** read any `phase-*.md` file from the orchestrator conversation
- **Do not** write code, tests, or diagrams directly — always delegate to a subagent
- **Do not** invoke skills directly — subagents invoke their own skills
- **Do not** skip checkpoints
- **Do not** run tests directly — Phase 7 subagent handles that

## Subagent Prompt Templates

Each phase has its own prompt template file in `references/`. Before dispatching a phase,
read only the relevant file — see the "Prompt Template" column in the Phase Overview table.
