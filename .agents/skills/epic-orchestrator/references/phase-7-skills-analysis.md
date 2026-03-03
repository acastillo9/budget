# Phase 7 — Skills Analysis

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<EPIC-KEY>/`

---

## Prompt Template

```
Analyze whether the existing skill set adequately supported this epic's development.

1. Read ALL phase files in .claude/orchestrator/<EPIC-KEY>/
2. Read AGENTS.md for the current skill inventory
3. Identify gaps, friction points, and improvement opportunities

Evaluate:
- Were any phases harder than necessary due to missing skill guidance?
- Did any subagent struggle with tasks that a skill should have covered?
- Are there recurring patterns across phases that could be extracted into a new skill?
- Should any existing skills be updated with new patterns discovered during this epic?

Write analysis to: .claude/orchestrator/<EPIC-KEY>/phase-7-skills.md

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

Return a 1-line summary: "Analysis: N gaps identified, M improvement recommendations"
```
