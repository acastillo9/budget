# Phase 2 — Spec Refinement

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<SPEC-NAME>/`

---

## Prompt Template

```
Refine the retrieved specification by analyzing it against the codebase.

1. Read .claude/orchestrator/<SPEC-NAME>/phase-1-spec.md for the raw spec
2. Invoke the budget-api skill and read budget-api/CLAUDE.md
3. Invoke the budget-ui skill and read budget-ui/CLAUDE.md
4. Explore the existing codebase to understand current patterns:
   - Existing API modules, controllers, services, entities
   - Existing UI pages, components, routes, stores
   - Shared types, utilities, and conventions

Analyze the spec for:
- **Missing acceptance criteria** — requirements without clear pass/fail conditions
- **Ambiguous requirements** — vague language, undefined terms, unclear scope
- **Technical feasibility** — conflicts with existing architecture or conventions
- **Missing edge cases** — error states, empty states, concurrent access, limits
- **i18n gaps** — text that needs translation keys (en + es)
- **Data model gaps** — missing fields, relationships, or validation rules
- **Security considerations** — auth requirements, input validation, data exposure

Write the refined spec to: .claude/orchestrator/<SPEC-NAME>/phase-2-refined-spec.md

Format:

# Refined Spec: <Title>

## Overview
<Original overview preserved>

## Requirements
<Original requirements preserved, each annotated with [OK] or [REFINED]>

## Acceptance Criteria
<Original criteria preserved + new criteria marked with [ADDED]>

## Constraints
<Original constraints preserved + new constraints marked with [ADDED]>

## Refinements

### Gaps Identified
- <Gap description> — <Impact> — <Proposed resolution>

### Improvements Proposed
- <Improvement> — <Rationale> — Marked with [ADDED] in sections above

### Codebase Context
- <Relevant existing pattern> — <How it affects this spec>

### i18n Requirements
- <Translation key> — en: "<English>" / es: "<Spanish>"

Return a 1-line summary: "Refined spec: N gaps identified, M improvements proposed"
```
