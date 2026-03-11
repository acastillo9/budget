# Phase 9 — Skills Analysis

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<SPEC-NAME>/`

---

## Prompt Template

```
Analyze whether the existing skill set adequately supported this feature's development.

1. Read ALL phase files in .claude/orchestrator/<SPEC-NAME>/
2. Read AGENTS.md for the current skill inventory
3. Identify gaps, friction points, and improvement opportunities

Evaluate:
- Were any phases harder than necessary due to missing skill guidance?
- Did any subagent struggle with tasks that a skill should have covered?
- Are there recurring patterns across phases that could be extracted into a new skill?
- Should any existing skills be updated with new patterns discovered during this feature?

TDD-specific evaluation:
- **Test-writing effectiveness** — did writing tests first (Phase 5a/5b) improve implementation quality?
- **Test-implementation alignment** — did implementation subagents (Phase 6a/6b) effectively use tests as contracts?
- **Fix cycle efficiency** — how many fix cycles were needed in Phase 7? What caused failures?
- **TDD methodology assessment** — was the test-first approach effective for this feature? Any recommendations?

Write analysis to: .claude/orchestrator/<SPEC-NAME>/phase-9-skills.md

Format:
# Skills Analysis: <Feature>

## Skill Usage Summary
| Skill | Phase(s) | Effectiveness | Notes |
|-------|----------|---------------|-------|

## Identified Gaps
- <Gap description> → Suggested skill or skill update

## Improvement Recommendations
- <Existing skill> — <what to add/change>

## New Skill Candidates
- <skill-name> — <purpose, trigger, estimated value>

## TDD Effectiveness
- Tests written before implementation: <count>
- Tests passing after Phase 7: <count>
- Fix cycles needed: <count>
- Test-first impact: <assessment of whether TDD improved quality>
- Recommendations: <how to improve the TDD workflow>

Return a 1-line summary: "Analysis: N gaps identified, M improvement recommendations"
```
