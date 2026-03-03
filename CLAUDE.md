# CLAUDE.md — Budget Monorepo

This file provides shared context to Claude Code across the entire monorepo.

## Monorepo Structure

| Subproject | Path | Tech Stack |
|---|---|---|
| **budget-api** | `budget-api/` | NestJS, TypeScript, MongoDB (Mongoose) |
| **budget-ui** | `budget-ui/` | SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS v4 |

npm workspaces manage both subprojects from root `package.json`.

## Root Commands

| Task | Command |
|---|---|
| Start API (dev) | `npm run start:api:dev` |
| Start UI (dev) | `npm run start:ui:dev` |
| Install all deps | `npm install` |

For subproject-specific commands (build, test, lint, etc.), see:
- `budget-api/CLAUDE.md` — backend commands and architecture
- `budget-ui/CLAUDE.md` — frontend commands and architecture

## Conventions

- **Language:** TypeScript everywhere
- **Package manager:** npm (workspaces)
- **i18n:** English (en) and Spanish (es) in both projects
- **Environment variables:** `.env` files per subproject (never committed). API URL for the UI is configured via `API_URL` (server-side only).
- **Auth:** JWT tokens (httpOnly cookies on frontend, Bearer token on backend). `JwtAuthGuard` is global in the API — use `@Public()` for unauthenticated routes.

## AI Skill Routing

See `AGENTS.md` at the repo root for the full skill inventory and routing guide.

### Skill Management

- **Always read `AGENTS.md` before creating or modifying skills.** It defines the skill directory structure and routing.
- Skills source of truth: `.agents/skills/`. Symlinks in `.claude/skills/` and `.cursor/skills/` point to `.agents/skills/`.
- When creating a new skill, use `--path .agents/skills` (not `.claude/skills`), then create symlinks in both `.claude/skills/` and `.cursor/skills/`.
- After creating a skill, update `AGENTS.md` with the new skill in the inventory table, routing guide, and auto-invoke table if applicable.
