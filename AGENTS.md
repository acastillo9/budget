# AGENTS.md — Skill Routing Guide

## Project Overview

This is a **monorepo** with two subprojects managed by npm workspaces:

| Subproject | Path | Tech Stack | Context File |
|---|---|---|---|
| **budget-api** | `budget-api/` | NestJS, TypeScript, MongoDB (Mongoose) | `budget-api/CLAUDE.md` |
| **budget-ui** | `budget-ui/` | SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS v4 | `budget-ui/CLAUDE.md` |

All skills live in `.agents/skills/` (single source of truth). Symlinks in `.claude/skills/` and `.cursor/skills/` point back to `.agents/skills/`.

---

## Routing Guide

### Backend work (files under `budget-api/`)

1. Read `budget-api/CLAUDE.md` for architecture, commands, and conventions.
2. Use these skills:
   - **[budget-api](.agents/skills/budget-api/SKILL.md)** — contextualized patterns for NestJS controllers, services, entities, DTOs, modules, and E2E tests
   - **[budget-test-api](.agents/skills/budget-test-api/SKILL.md)** — write E2E tests for the budget-api backend
   - **[budget-mermaid-docs](.agents/skills/budget-mermaid-docs/SKILL.md)** — create Mermaid diagrams (class, sequence, flowchart, ER, state) in `budget-api/docs/`

### Frontend work (files under `budget-ui/`)

1. Read `budget-ui/CLAUDE.md` for architecture, commands, and conventions.
2. Use these skills:
   - **[budget-ui](.agents/skills/budget-ui/SKILL.md)** — contextualized patterns for SvelteKit pages, components, server loaders, form actions, API proxy routes, schemas, and types
   - **[budget-test-ui](.agents/skills/budget-test-ui/SKILL.md)** — write E2E Playwright tests for the budget-ui frontend
   - **[svelte-code-writer](.agents/skills/svelte-code-writer/SKILL.md)** — write/edit Svelte 5 components (always use for `.svelte` files)
   - **[frontend-design](.agents/skills/frontend-design/SKILL.md)** — create polished UI components and pages
   - **[web-design-guidelines](.agents/skills/web-design-guidelines/SKILL.md)** — audit UI for accessibility and design compliance

### Cross-cutting work

Read both `budget-api/CLAUDE.md` and `budget-ui/CLAUDE.md`. Use skills from both sections as needed.

### Spec-driven orchestration

- **[spec-orchestrator](.agents/skills/spec-orchestrator/SKILL.md)** — orchestrate spec-driven TDD feature development from a specification document (Confluence page or local .md file) through 11 phases (spec retrieval, refinement, design, docs, test writing, implementation, test running, review, skills analysis). Use for full feature workflows, not individual tasks.

### General skills (any context)

- **[code-review](.agents/skills/code-review/SKILL.md)** — review generated code for quality, conventions, security, and correctness
- **[find-skills](.agents/skills/find-skills/SKILL.md)** — discover and install new skills
- **[skill-creator](.agents/skills/skill-creator/SKILL.md)** — create or update skills

---

## Skill Inventory

| Skill | Description | Applies To |
|---|---|---|
| [`budget-api`](.agents/skills/budget-api/SKILL.md) | Contextualized patterns for NestJS backend | Backend |
| [`budget-test-api`](.agents/skills/budget-test-api/SKILL.md) | Write E2E tests for the budget-api NestJS backend | Backend |
| [`budget-mermaid-docs`](.agents/skills/budget-mermaid-docs/SKILL.md) | Create Mermaid diagrams for software documentation | Backend |
| [`budget-ui`](.agents/skills/budget-ui/SKILL.md) | Contextualized patterns for SvelteKit frontend | Frontend |
| [`budget-test-ui`](.agents/skills/budget-test-ui/SKILL.md) | Write E2E Playwright tests for the budget-ui frontend | Frontend |
| [`code-review`](.agents/skills/code-review/SKILL.md) | Review generated code for quality, conventions, security, and correctness | Both |
| [`spec-orchestrator`](.agents/skills/spec-orchestrator/SKILL.md) | Orchestrate spec-driven TDD feature development from a specification document (11-phase lifecycle) | Both |
| [`find-skills`](.agents/skills/find-skills/SKILL.md) | Discover and install agent skills | Both |
| [`frontend-design`](.agents/skills/frontend-design/SKILL.md) | Create distinctive, production-grade frontend interfaces | Frontend |
| [`skill-creator`](.agents/skills/skill-creator/SKILL.md) | Guide for creating or updating skills | Both |
| [`svelte-code-writer`](.agents/skills/svelte-code-writer/SKILL.md) | Svelte 5 documentation lookup and code analysis | Frontend |
| [`web-design-guidelines`](.agents/skills/web-design-guidelines/SKILL.md) | Review UI code for Web Interface Guidelines compliance | Frontend |

---

## Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Trigger | Skill | Examples |
|---|---|---|
| Creating, editing, or reviewing code inside `budget-api/` | `budget-api` | "add an endpoint", "create a service", "fix an API bug", "write an E2E test" |
| Writing or reviewing E2E tests in `budget-api/test/` | `budget-test-api` | "write E2E tests for accounts", "create tests for the new feature" |
| Writing or reviewing E2E tests in `budget-ui/e2e/` | `budget-test-ui` | "write Playwright tests for the accounts page", "create E2E tests for the UI" |
| Creating or updating diagrams in `budget-api/docs/`, or documenting/designing a feature with diagrams | `budget-mermaid-docs` | "create a diagram for...", "document this module", "design the data model for..." |
| Creating, editing, or reviewing code inside `budget-ui/` | `budget-ui` | "add a page", "create a form", "fix a UI bug", "add an API proxy route" |
| Creating, editing, or analyzing any `.svelte`, `.svelte.ts`, or `.svelte.js` file | `svelte-code-writer` | "edit the Header component", "create a new Svelte page", "analyze this .svelte file" |
| Building or styling web UI components, pages, or layouts | `frontend-design` | "build a dashboard", "create a landing page", "style this component", "beautify the UI" |
| Reviewing UI for accessibility, design quality, or UX compliance | `web-design-guidelines` | "review my UI", "check accessibility", "audit design", "review UX", "check against best practices" |
| Reviewing generated code, checking code quality, or at end of code generation workflow | `code-review` | "review the code", "check what was generated", "review changes", "code review" |
| Looking for new capabilities or asking about available skills | `find-skills` | "how do I do X", "find a skill for X", "is there a skill that can…" |
| Creating a new skill or updating an existing one | `skill-creator` | "create a skill for…", "update the svelte skill" |
| Orchestrating spec-driven feature development from a specification document | `spec-orchestrator` | "orchestrate spec ./spec.md", "implement this spec", "drive spec to completion" |

---

## Conventions

- **Language:** TypeScript in both projects
- **Package manager:** npm with workspaces
- **i18n:** English (en) and Spanish (es)
- **Environment variables:** `.env` files per subproject, never committed
