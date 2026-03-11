# Phase 1 — Spec Retrieval

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<SPEC-NAME>/`

---

## Prompt Template

```
Retrieve the feature specification and normalize it into a standard format.

Auto-detect the input source:
- If the input starts with "http" or is purely numeric → Confluence page
- Otherwise → local file path

### Confluence Source

1. Call getAccessibleAtlassianResources to get the cloudId
2. Call getConfluencePage with the page ID (extract from URL if needed), using contentFormat: "markdown"
3. Extract the page content

### Local File Source

1. Read the file at the provided path

### Normalize Output

Write the spec to: .claude/orchestrator/<SPEC-NAME>/phase-1-spec.md

Format the output as:

# Spec: <Title>

## Source
<Confluence page URL/ID or local file path>

## Overview
<High-level summary of the feature — extract or synthesize from spec content>

## Requirements
<Numbered list of functional requirements — extract from spec>

## Acceptance Criteria
<Bulleted list of acceptance criteria — extract from spec or mark as "[NOT PROVIDED]">

## Constraints
<Any technical constraints, dependencies, or limitations mentioned>

## Raw Content
<Full original content preserved verbatim for reference>

Return a 1-line summary: "Retrieved spec '<title>' from <source> (N sections, M requirements)"
```
