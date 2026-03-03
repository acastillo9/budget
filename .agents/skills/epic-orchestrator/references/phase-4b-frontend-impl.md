# Phase 4b — Frontend Implementation

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<EPIC-KEY>/`

---

## Prompt Template

```
Implement the frontend changes for the feature.

1. Read .claude/orchestrator/<EPIC-KEY>/phase-2-design.md for the design
2. Invoke the budget-ui skill
3. Invoke the svelte-code-writer skill for all .svelte file work
4. Invoke the frontend-design skill for UI design quality
5. Read budget-ui/CLAUDE.md for conventions and commands

Implement ALL frontend changes specified in the design:
- Page routes (+page.svelte, +page.server.ts)
- Components (.svelte files)
- API proxy routes (+server.ts)
- Form schemas (Zod)
- Types and interfaces
- i18n translations (en + es)
- Navigation updates if needed

After implementation, run: cd budget-ui && npm run lint && npm run check
Fix any errors.

Write a manifest of all created/modified files to: .claude/orchestrator/<EPIC-KEY>/phase-4b-impl-ui.md

Format:
# Frontend Implementation: <Feature>

## Created Files
- <path> — <purpose>

## Modified Files
- <path> — <what changed>

## Lint/Check Status
<pass/fail + details>

Return a 1-line summary: "Created N files, modified M files in budget-ui/"
```
