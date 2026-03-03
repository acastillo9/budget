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
### Frontend work (files under `budget-ui/`)

1. Read `budget-ui/CLAUDE.md` for architecture, commands, and conventions.
2. Use these skills:
   - **[svelte-code-writer](.agents/skills/svelte-code-writer/SKILL.md)** — write/edit Svelte 5 components (always use for `.svelte` files)
   - **[frontend-design](.agents/skills/frontend-design/SKILL.md)** — create polished UI components and pages
   - **[web-design-guidelines](.agents/skills/web-design-guidelines/SKILL.md)** — audit UI for accessibility and design compliance

### Cross-cutting work

Read both `budget-api/CLAUDE.md` and `budget-ui/CLAUDE.md`. Use skills from both sections as needed.

### General skills (any context)

- **[find-skills](.agents/skills/find-skills/SKILL.md)** — discover and install new skills
- **[skill-creator](.agents/skills/skill-creator/SKILL.md)** — create or update skills

---

## Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Trigger | Skill | Examples |
|---|---|---|
| Creating, editing, or analyzing any `.svelte`, `.svelte.ts`, or `.svelte.js` file | `svelte-code-writer` | "edit the Header component", "create a new Svelte page", "analyze this .svelte file" |
| Building or styling web UI components, pages, or layouts | `frontend-design` | "build a dashboard", "create a landing page", "style this component", "beautify the UI" |
| Reviewing UI for accessibility, design quality, or UX compliance | `web-design-guidelines` | "review my UI", "check accessibility", "audit design", "review UX", "check against best practices" |
| Looking for new capabilities or asking about available skills | `find-skills` | "how do I do X", "find a skill for X", "is there a skill that can…" |
| Creating a new skill or updating an existing one | `skill-creator` | "create a skill for…", "update the svelte skill" |

---

## Skill Inventory

| Skill | Description | Applies To |
|---|---|---|
| [`find-skills`](.agents/skills/find-skills/SKILL.md) | Discover and install agent skills | Both |
| [`frontend-design`](.agents/skills/frontend-design/SKILL.md) | Create distinctive, production-grade frontend interfaces | Frontend |
| [`skill-creator`](.agents/skills/skill-creator/SKILL.md) | Guide for creating or updating skills | Both |
| [`svelte-code-writer`](.agents/skills/svelte-code-writer/SKILL.md) | Svelte 5 documentation lookup and code analysis | Frontend |
| [`web-design-guidelines`](.agents/skills/web-design-guidelines/SKILL.md) | Review UI code for Web Interface Guidelines compliance | Frontend |

---

## Conventions

- **Language:** TypeScript in both projects
- **Package manager:** npm with workspaces
- **i18n:** English (en) and Spanish (es)
- **Environment variables:** `.env` files per subproject, never committed
