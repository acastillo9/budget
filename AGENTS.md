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
   - **[nestjs-e2e-test-gen](.agents/skills/nestjs-e2e-test-gen/SKILL.md)** — generate E2E tests with supertest
   - **[nestjs-mermaid-architect](.agents/skills/nestjs-mermaid-architect/SKILL.md)** — generate/design Mermaid class diagrams
   - **[nestjs-swagger-docs](.agents/skills/nestjs-swagger-docs/SKILL.md)** — add Swagger/OpenAPI decorators
   - **[code-review](.agents/skills/code-review/SKILL.md)** — review code changes

### Frontend work (files under `budget-ui/`)

1. Read `budget-ui/CLAUDE.md` for architecture, commands, and conventions.
2. Use these skills:
   - **[svelte-code-writer](.agents/skills/svelte-code-writer/SKILL.md)** — write/edit Svelte 5 components (always use for `.svelte` files)
   - **[frontend-design](.agents/skills/frontend-design/SKILL.md)** — create polished UI components and pages
   - **[playwright-e2e-testing](.agents/skills/playwright-e2e-testing/SKILL.md)** — create/run Playwright E2E tests
   - **[web-design-guidelines](.agents/skills/web-design-guidelines/SKILL.md)** — audit UI for accessibility and design compliance
   - **[code-review](.agents/skills/code-review/SKILL.md)** — review code changes

### Cross-cutting work

Read both `budget-api/CLAUDE.md` and `budget-ui/CLAUDE.md`. Use skills from both sections as needed.

### General skills (any context)

- **[find-skills](.agents/skills/find-skills/SKILL.md)** — discover and install new skills
- **[skill-creator](.agents/skills/skill-creator/SKILL.md)** — create or update skills

---

## Skill Inventory

| Skill | Description | Applies To |
|---|---|---|
| [`code-review`](.agents/skills/code-review/SKILL.md) | Senior buddy-style code review against project standards | Both |
| [`find-skills`](.agents/skills/find-skills/SKILL.md) | Discover and install agent skills | Both |
| [`frontend-design`](.agents/skills/frontend-design/SKILL.md) | Create distinctive, production-grade frontend interfaces | Frontend |
| [`nestjs-e2e-test-gen`](.agents/skills/nestjs-e2e-test-gen/SKILL.md) | Generate E2E tests for NestJS APIs using supertest | Backend |
| [`nestjs-mermaid-architect`](.agents/skills/nestjs-mermaid-architect/SKILL.md) | Generate Mermaid class diagrams (reverse-engineer or design) | Backend |
| [`nestjs-swagger-docs`](.agents/skills/nestjs-swagger-docs/SKILL.md) | Add Swagger/OpenAPI documentation to NestJS controllers/DTOs | Backend |
| [`playwright-e2e-testing`](.agents/skills/playwright-e2e-testing/SKILL.md) | Create and execute Playwright E2E tests for SvelteKit | Frontend |
| [`skill-creator`](.agents/skills/skill-creator/SKILL.md) | Guide for creating or updating skills | Both |
| [`svelte-code-writer`](.agents/skills/svelte-code-writer/SKILL.md) | Svelte 5 documentation lookup and code analysis | Frontend |
| [`web-design-guidelines`](.agents/skills/web-design-guidelines/SKILL.md) | Review UI code for Web Interface Guidelines compliance | Frontend |

---

## Conventions

- **Language:** TypeScript in both projects
- **Package manager:** npm with workspaces
- **i18n:** English (en) and Spanish (es)
- **Environment variables:** `.env` files per subproject, never committed
