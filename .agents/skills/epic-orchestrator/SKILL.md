---
name: epic-orchestrator
description: >
  Orchestrate end-to-end feature development from a Jira epic. Drives a 7-phase
  lifecycle (epic retrieval, design, documentation, implementation, testing, code
  review, skill gap analysis) by coordinating specialized subagents through
  file-based message passing. Does not implement anything itself — only dispatches
  and tracks. Use when Claude needs to: (1) Implement a full Jira epic end-to-end,
  (2) Orchestrate a multi-phase feature development workflow, or (3) Coordinate
  multiple skills for a large feature. Triggers on: "orchestrate epic X",
  "implement epic BUD-XX", "drive epic to completion", "/epic-orchestrator".
---

# Epic Orchestrator

Coordinate a 7-phase feature development lifecycle from a Jira epic key. Dispatch
specialized subagents for each phase. Never implement code directly.

## Token Efficiency Contract

- **Never read** phase output files — only read/write `STATUS.md`
- Each subagent returns a **1-line status** string
- Subagents write detailed output to their phase file; the next subagent reads it directly
- Context grows at O(phases), not O(content)

## Workspace Setup

On receiving an epic key (e.g., `BUD-42`), create the workspace:

```
.claude/orchestrator/BUD-42/
  STATUS.md
```

Initialize `STATUS.md` with:

```markdown
# BUD-42 — Orchestration Status

| # | Phase | Status | Summary |
|---|-------|--------|---------|
| 1 | Epic Retrieval | pending | — |
| 2 | Analyze & Design | pending | — |
| 3 | Documentation | pending | — |
| 4a | Backend Impl | pending | — |
| 4b | Frontend Impl | pending | — |
| 5a | API Tests | pending | — |
| 5b | UI Tests | pending | — |
| 6 | Code Review | pending | — |
| 7 | Skills Analysis | pending | — |
```

## Phase Overview

| # | Phase | Skills Used | Reads | Writes | Prompt Template |
|---|-------|-------------|-------|--------|-----------------|
| 1 | Epic Retrieval | Atlassian MCP | Epic key | phase-1-epic.md | [phase-1-epic-retrieval.md](references/phase-1-epic-retrieval.md) |
| 2 | Analyze & Design | budget-api, budget-ui | phase-1 + codebase | phase-2-design.md | [phase-2-design.md](references/phase-2-design.md) |
| 3 | Documentation | budget-mermaid-docs | phase-2 | phase-3-docs.md | [phase-3-documentation.md](references/phase-3-documentation.md) |
| 4a | Backend Impl | budget-api | phase-2 | phase-4a-impl-api.md | [phase-4a-backend-impl.md](references/phase-4a-backend-impl.md) |
| 4b | Frontend Impl | budget-ui, svelte-code-writer, frontend-design | phase-2 | phase-4b-impl-ui.md | [phase-4b-frontend-impl.md](references/phase-4b-frontend-impl.md) |
| 5a | API Tests | budget-test-api | phase-2 + phase-4a | phase-5a-tests-api.md | [phase-5a-api-tests.md](references/phase-5a-api-tests.md) |
| 5b | UI Tests | budget-test-ui | phase-2 + phase-4b | phase-5b-tests-ui.md | [phase-5b-ui-tests.md](references/phase-5b-ui-tests.md) |
| 6 | Code Review | code-review | phase-4a/4b + phase-5a/5b | phase-6-review.md | [phase-6-code-review.md](references/phase-6-code-review.md) |
| 7 | Skills Analysis | — | All phase files + AGENTS.md | phase-7-skills.md | [phase-7-skills-analysis.md](references/phase-7-skills-analysis.md) |

## Execution Rules

1. Run phases **sequentially** (1 → 2 → checkpoint → 3 → 4a/4b parallel → 5a/5b parallel → 6 → checkpoint → 7)
2. Phases 4a/4b may run in **parallel**. Same for 5a/5b.
3. After each subagent returns, update `STATUS.md` with the 1-line summary.
4. Before dispatching each phase, read its prompt template from `references/phase-<N>-<name>.md`.
5. Implementation subagents (4a/4b) **must** run lint/check and include pass/fail results in their phase output.
6. Test subagents (5a/5b) **must** report failures explicitly — never skip or suppress failing tests.
7. All subagents **must** note deviations from skill patterns with rationale in their phase output.

## User Checkpoints

### After Phase 2 (Design)

Pause and present the user with:

> **Design checkpoint.** Phase 2 produced a design document at `.claude/orchestrator/<EPIC>/phase-2-design.md`.
> Options: (1) Approve and continue, (2) Reject with feedback, (3) View design doc

If rejected, re-run Phase 2 with the user's feedback appended to the subagent prompt.

### After Phase 6 (Code Review)

Pause and present the user with the 1-line review summary from `STATUS.md`, then:

> **Review checkpoint.** Options: (1) Apply critical fixes, (2) Commit as-is, (3) View full review

If "apply critical fixes," dispatch a fix subagent with the review findings.

## Forbidden Actions

- **Do not** read any `phase-*.md` file from the orchestrator conversation
- **Do not** write code, tests, or diagrams directly — always delegate to a subagent
- **Do not** invoke skills directly — subagents invoke their own skills
- **Do not** skip checkpoints

## Subagent Prompt Templates

Each phase has its own prompt template file in `references/`. Before dispatching a phase,
read only the relevant file — see the "Prompt Template" column in the Phase Overview table.
