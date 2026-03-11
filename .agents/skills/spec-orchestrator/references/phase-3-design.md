# Phase 3 — Technical Design

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<SPEC-NAME>/`

---

## Prompt Template

```
Design the implementation for the refined specification. You have access to the full codebase.

1. Read .claude/orchestrator/<SPEC-NAME>/phase-2-refined-spec.md for the refined spec
2. Invoke the budget-api skill and read budget-api/CLAUDE.md
3. Invoke the budget-ui skill and read budget-ui/CLAUDE.md
4. Explore the existing codebase to understand current patterns:
   - Existing API modules, controllers, services, entities
   - Existing UI pages, components, routes, stores
   - Shared types, utilities, and conventions

Produce a design document and write it to: .claude/orchestrator/<SPEC-NAME>/phase-3-design.md

The design document MUST include:

# Design: <Feature Title>

## Overview
<1-paragraph summary of the feature and how it maps to existing architecture>

## API Changes
### New/Modified Modules
- Module name, purpose, file paths
### Endpoints
| Method | Path | Description | Auth | Request DTO | Response DTO |
### Entities/Schemas
- Field-level schema definitions for new or modified MongoDB documents
### Services
- Service methods with input/output types and business logic summary

## UI Changes
### New/Modified Routes
- Route path, page component, server loader, form actions
### Components
- Component name, purpose, props interface, events
### API Proxy Routes
- Proxy route path, upstream API endpoint
### State Management
- Stores, derived state, reactive declarations

## Data Flow
- End-to-end flow from UI action → API proxy → backend endpoint → DB → response

## Implementation Order
- Numbered list of implementation steps (backend first, then frontend)
- Dependencies between steps noted

## Test Strategy
- **API tests**: list what should be tested per endpoint (happy path, error cases, auth, validation, edge cases)
- **UI tests**: list what should be tested per page/component (navigation, forms, interactions, integration)
- This section feeds directly into Phase 5a/5b — be specific about test scenarios

## i18n Keys
- List of new translation keys needed (en + es)

## Edge Cases & Validation
- Input validation rules
- Error scenarios and how they are handled

Return a 1-line summary: "Designed N API endpoints, M UI pages, L components for <feature>"
```
