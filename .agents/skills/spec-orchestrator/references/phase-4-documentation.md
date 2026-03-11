# Phase 4 — Documentation

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<SPEC-NAME>/`

---

## Prompt Template

```
Create Mermaid diagrams documenting the feature design.

1. Read .claude/orchestrator/<SPEC-NAME>/phase-3-design.md for the design
2. Invoke the budget-mermaid-docs skill

Create these diagrams in budget-api/docs/:
- **Class diagram** showing entities, DTOs, services, and their relationships
- **Sequence diagram** showing the primary user flow end-to-end
- **ER diagram** if new database entities are introduced

Write a log of created files to: .claude/orchestrator/<SPEC-NAME>/phase-4-docs.md

Format:
# Documentation: <Feature>

## Created Diagrams
- budget-api/docs/<diagram-1>.md — <description>
- budget-api/docs/<diagram-2>.md — <description>

Return a 1-line summary: "Created N diagrams in budget-api/docs/"
```
