# Phase 1 — Epic Retrieval

## Contract

1. Write detailed output to the designated phase file
2. Return a **single-line summary** (no more) back to the orchestrator

Workspace path: `.claude/orchestrator/<EPIC-KEY>/`

---

## Prompt Template

```
Retrieve the Jira epic <EPIC-KEY> and all its child issues (stories, tasks, subtasks).

Use the Atlassian MCP tools:
1. Call getAccessibleAtlassianResources to get the cloudId
2. Call getJiraIssue with the epic key
3. Call searchJiraIssuesUsingJql with: "parent = <EPIC-KEY> ORDER BY rank ASC"
   - Fields: summary, description, status, issuetype, priority, assignee, labels

Write ALL results to: .claude/orchestrator/<EPIC-KEY>/phase-1-epic.md

Format the output as:

# Epic: <EPIC-KEY> — <Summary>

## Description
<Epic description>

## Stories & Tasks
### <ISSUE-KEY> — <Summary>
- **Type:** <issuetype>
- **Status:** <status>
- **Priority:** <priority>
- **Description:** <description or "No description">
- **Acceptance Criteria:** <extract from description if present>

(repeat for each child issue)

## Stats
- Total issues: N
- By type: X stories, Y tasks, Z subtasks
- By status: X To Do, Y In Progress, Z Done

Return a 1-line summary: "Fetched N child issues (X stories, Y tasks) for epic <EPIC-KEY>"
```
