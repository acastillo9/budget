---
name: nestjs-mermaid-architect
description: >
  Generate Mermaid class diagrams for NestJS API projects. Two modes:
  (1) Reverse Engineering — analyze existing NestJS codebase to discover entities, properties,
  and relationships, then produce a Mermaid classDiagram of current architecture;
  (2) Design — design new features or modules as Mermaid class diagrams modeling proposed
  entities and their integration with existing code. Both modes can combine.
  Triggers: "generate class diagram", "diagram my API", "reverse engineer", "analyze
  architecture", "map entities", "show me the entities", "visualize my models", "create
  Mermaid diagram", designing new features ("design entities for X", "plan data model for Y",
  "add a new module for X"), or extending existing architecture ("how would X fit into the
  current model"). Also triggers on NestJS codebase documentation or entity visualization.
---

# NestJS Mermaid Architect

Generate Mermaid class diagrams from NestJS codebases (reverse engineering) or for new features (design mode).

## Mode Detection

Determine mode from user intent:

| User Intent | Mode |
|---|---|
| References existing code, asks to analyze/document/visualize what's built | **Reverse Engineering** |
| Describes a new feature, module, or capability to build | **Design** |
| Wants both (e.g., "show me what I have and design X on top") | **Combined** — reverse engineer first, then design |
| Ambiguous | Ask the user to clarify |

## Output Format

- Save all diagrams in the `docs/` directory at the project root (create if needed)
- File naming: `class-diagram.<scope>.md`
  - `class-diagram.full.md` — complete application diagram
  - `class-diagram.<module-name>-module.md` — specific module subset
  - `class-diagram.<feature>-design.md` — proposed new feature (use `-design` suffix)
- File content: Markdown heading as title, then Mermaid diagram in a ` ```mermaid ` fenced code block
- This format renders natively in Obsidian and GitHub

## Reverse Engineering Mode

Read [references/reverse-engineering.md](references/reverse-engineering.md) for detailed entity discovery strategies, property extraction rules, relationship inference, and diagram organization patterns.

### Steps

1. **Discover project structure** — Scan `src/` for module files (`*.module.ts`), entity directories, and NestJS patterns
2. **Detect ORM** — Check for Mongoose (`@Schema`), TypeORM (`@Entity`), Prisma (`schema.prisma`), MikroORM, or plain TS
3. **Locate entities** — Find all entity/schema/model files using glob patterns: `**/*.entity.ts`, `**/*.schema.ts`, `**/entities/**/*.ts`, `prisma/schema.prisma`
4. **Extract properties** — Read each entity file; extract property names, types, modifiers, decorators
5. **Extract enums** — Find `*.enum.ts` files; extract enum names and values
6. **Infer relationships** — Analyze references between entities (ObjectId refs, decorator-based, type-based)
7. **Check base classes** — Identify shared base schemas; inline inherited properties (timestamps, etc.)
8. **Generate diagram** — Produce valid Mermaid `classDiagram` grouped by module with section separators
9. **Save and summarize** — Write to `docs/class-diagram.<scope>.md`; report entity count, key relationships, assumptions

### Mermaid classDiagram Structure

```
classDiagram

    %% <Module Name> Module
    class EntityName {
        +Type propertyName
        ...
    }

    %% Enumerations
    class EnumName {
        <<enumeration>>
        VALUE_ONE
        VALUE_TWO
    }

    %% Relationships
    EntityA "1" --> "*" EntityB : label
```

Rules:
- Access modifiers: `+` public (default), `-` private, `#` protected
- Enums use `<<enumeration>>` stereotype
- Subdocuments/embedded types use composition: `*--`
- Self-references shown with labeled arrows
- Relationship labels use verb phrases (e.g., `owns`, `contains`, `classifies`)
- Cardinality: `"1" --> "1"`, `"1" --> "*"`, `"*" --> "*"`, with `<|--` for inheritance

### Scale Handling

If >30 entities, ask user: full diagram or per-module subsets. Per-module diagrams include the module's entities + referenced entities from other modules (minimal properties). Name: `class-diagram.<module>-module.md`.

## Design Mode

Read [references/design-mode.md](references/design-mode.md) for pattern detection, existing vs new entity differentiation, and design decision documentation guidance.

### Steps

1. **Understand requirement** — Gather feature name, domain concepts, constraints, MVP scope
2. **Analyze existing codebase** (if available) — Detect ORM, naming conventions, base classes, shared types, user isolation patterns
3. **Propose entity design** — New entities following existing patterns, new enums, relationships, integration points
4. **Generate diagram** — Existing entities shown with key properties only (context), new entities with full properties
5. **Save and summarize** — Write to `docs/class-diagram.<feature>-design.md`; explain proposed entities, design decisions, integration points, open questions

### Differentiation in Diagram

- `%% Existing entities (context)` — Show only `id` + relevant properties
- `%% New entities (proposed)` — Show full property definitions
- `%% New enumerations` — New enums for the proposed feature

## Combined Mode

1. Run full Reverse Engineering → save as `docs/class-diagram.full.md`
2. Run Design Mode using the result as foundation → save as `docs/class-diagram.<feature>-design.md`

## Edge Cases

- **Multiple ORMs**: Handle each accordingly, note in summary
- **Circular relationships**: Represent correctly, avoid infinite loops
- **Abstract/base entities**: Show inheritance with `<|--` only for meaningful domain concepts; inline audit fields
- **Embedded types / subdocuments**: Show as separate classes with composition (`*--`)
- **No entities found**: Inform user, suggest where to look
- **Virtual/computed types** (e.g., DTOs generated on-the-fly): Include with a `%% Virtual (not persisted)` comment if they represent meaningful domain concepts
- **Design without codebase**: Ask about conventions, use sensible defaults, note assumptions
- **Iterative design**: Support updating existing diagram files across multiple turns
