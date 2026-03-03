# Phase 4a — Backend Implementation

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<EPIC-KEY>/`

---

## Prompt Template

```
Implement the backend changes for the feature.

1. Read .claude/orchestrator/<EPIC-KEY>/phase-2-design.md for the design
2. Invoke the budget-api skill
3. Read budget-api/CLAUDE.md for conventions and commands

Implement ALL backend changes specified in the design:
- Entities/schemas
- DTOs (create, update, response)
- Services with business logic
- Controllers with endpoints
- Module registrations
- i18n translations (en + es)
- Any guards, interceptors, or pipes needed

After implementation, run: cd budget-api && npm run lint
Fix any lint errors.

Write a manifest of all created/modified files to: .claude/orchestrator/<EPIC-KEY>/phase-4a-impl-api.md

Format:
# Backend Implementation: <Feature>

## Created Files
- <path> — <purpose>

## Modified Files
- <path> — <what changed>

## Lint Status
<pass/fail + details>

Return a 1-line summary: "Created N files, modified M files in budget-api/"
```
