---
name: dacn-development-workflow
description: Use when starting a DACN repository task that may involve feature work, frontend or UI work, debugging, refactoring, implementation planning, executing an approved plan, review, or completion claims.
---

# DACN Development Workflow

## Core Rule

Route the task to the required skill **before exploration, planning, editing, or proposing fixes**. Repository `AGENTS.md` and frozen baseline rules remain authoritative.

## Routing

| Task condition                                                                                          | Required skill                                                                                                                |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| New feature, new behavior, architecture/design choice, or unclear implementation request                | `superpowers:brainstorming`                                                                                                   |
| Frontend/UI design, component, page, interaction, responsive, accessibility, styling, or UI review work | Use `ui-ux-pro-max`; if the UI work is new or changes behavior/design, use `superpowers:brainstorming` first                  |
| Approved design/spec exists and implementation needs multiple steps                                     | `superpowers:writing-plans`                                                                                                   |
| A plan has been created and is ready for execution                                                      | Run the **Plan Review Gate**; fix and re-review until the current plan is `Approved`                                          |
| Bug, failing test, build failure, or unexpected behavior                                                | `superpowers:systematic-debugging`                                                                                            |
| Feature, bugfix, or refactor implementation                                                             | `superpowers:test-driven-development` before production code                                                                  |
| An approved plan file actually exists and its current content passed the Plan Review Gate               | `superpowers:subagent-driven-development` when suitable and multi-agent is available; otherwise `superpowers:executing-plans` |
| Major completed change or before merge                                                                  | `superpowers:requesting-code-review`                                                                                          |
| Before any claim that work is complete, fixed, passing, or ready                                        | `superpowers:verification-before-completion`                                                                                  |

## Ordering

For new work:

`brainstorming` → human-approved design → `writing-plans` → **Plan Review Gate** → approved plan → execution → review → verification.

For frontend/UI work whose design is not yet approved:

`brainstorming` → `ui-ux-pro-max` → human-approved UI design → `writing-plans` → **Plan Review Gate** → TDD → implementation → review → verification.

For frontend/UI implementation from an already-approved design:

`ui-ux-pro-max` → `writing-plans` when needed → **Plan Review Gate when a plan is created** → TDD → implementation → review → verification.

For bugs:

`systematic-debugging` → root cause → `test-driven-development` → review when significant → verification.

## Plan Review Gate

Whenever `superpowers:writing-plans` creates or materially revises an implementation plan, the plan must be reviewed **before** invoking `superpowers:subagent-driven-development` or `superpowers:executing-plans`.

Review the current plan against its approved design/spec, repository `AGENTS.md`, frozen baseline rules, relevant architecture/API/UI/database decisions, and the actual repository structure when available. The review must check that the plan is complete, internally consistent, executable in the stated order, properly scoped, and does not silently invent product behavior.

Use this loop:

1. review the current plan;
2. if issues are found, return concrete findings to the parent/writer;
3. the parent/writer edits the plan to resolve them;
4. review the revised plan again;
5. repeat until the current plan receives an `Approved` verdict;
6. only then continue to plan execution.

The gate is **fail-closed**. A plan that is missing, only partially reviewed, still has unresolved issues, or was materially changed after approval must not be executed. Material changes invalidate the previous verdict and require another review.

When multi-agent/subagent capability is available, the review must use a fresh `reviewer` subagent governed by root `AGENTS.md`: `gpt-6-sol` with `medium` reasoning and read-only behavior. The reviewer must not edit or approve its own authored work. If subagents are unavailable, Codex may perform the review itself using the same gate and must not skip the fix-and-review loop.

If the review cannot reach `Approved`, report the task as `BLOCKED` instead of bypassing the gate.

## Subagent Delegation

Subagent model routing is controlled by root `AGENTS.md` and must be preserved throughout this workflow.

- Independent review work uses the `reviewer` role: `gpt-6-sol`, `medium`, read-only. This includes the Plan Review Gate, significant code review, architecture/baseline consistency review, and review of another agent's implementation.
- Delegated work that creates, fixes, refactors, or otherwise modifies code/config/tests/migrations uses the `implementer` role: `gpt-6-luna`, `high`.
- Review findings that require code changes return to an `implementer`; the reviewer does not patch its own findings.
- Do not silently substitute another subagent model or reasoning effort. If the required role is unavailable, use parent execution only where this workflow already permits a non-subagent fallback; otherwise report `BLOCKED`.

## Frontend UI Authority

When using `ui-ux-pro-max`, the following remain higher authority:

1. frozen requirements and business rules;
2. API Specification;
3. UI Sitemap;
4. Wireframe Screen Specification;
5. Global UI Design System;
6. System Architecture;
7. `apps/web/AGENTS.md`.

Use `ui-ux-pro-max` to refine accessibility, responsive behavior, component composition, interaction quality, spacing, implementation patterns, and UI review.

Do not let it replace approved routes, screen behavior, permissions, API behavior, navigation, design tokens, or the project's visual language.

Do not create or persist a competing design system as a new project source of truth unless the task explicitly goes through the project's design-governance process.

## Repository Gates

Before implementation, apply root/scoped `AGENTS.md` traceability and Proposal Mode.

If execution is based on a written plan, confirm that the exact plan file exists and that its **current content** has passed the Plan Review Gate with verdict `Approved`.

A Superpowers or third-party skill never authorizes changing frozen baseline behavior.

If a required plan, source tree, test setup, approved decision, or required plan-review verdict is missing, report the blocker. Do not invent the artifact, scaffold unrelated code, silently choose product behavior, or bypass plan review just to continue the workflow.

## Red Flags

Stop and route correctly if you are:

- exploring feature implementation before invoking `brainstorming`;
- doing frontend/UI design or review without considering `ui-ux-pro-max`;
- allowing `ui-ux-pro-max` to override Wireframe or the Global UI Design System;
- proposing a bug fix before `systematic-debugging`;
- writing production code before TDD;
- executing a plan that was not found and confirmed;
- executing a plan whose current content has not passed the Plan Review Gate;
- continuing execution after materially changing an approved plan without reviewing it again;
- using a review subagent other than `reviewer` (`gpt-6-sol`, `medium`) when the reviewer role is available;
- using a code-modifying subagent other than `implementer` (`gpt-6-luna`, `high`) when the implementer role is available;
- allowing an implementation subagent to independently approve its own work;
- claiming success without fresh verification evidence.


## Completion Report

After finishing a task and completing `superpowers:verification-before-completion`, provide the user with a **Completion Report**.

The report should explain the result in natural language so that the user can understand what was requested, what changed, how the result was verified, and which files matter for future development.

Use the following structure:

### 1. Assigned Work

Briefly restate the task that was assigned.

Do not copy the full user prompt. Summarize the intended outcome in clear, natural language.

### 2. Summary

Summarize the most important completed outcomes in a few concise points.

Focus on the final result rather than narrating every implementation step.

### 3. Work Performed

Explain the important work that was actually completed.

When relevant, distinguish between:

- newly created files;
- modified existing files;
- added dependencies or configuration;
- important structural or behavioral changes.

For each important change, explain naturally:

- what the file or change is for;
- what was added or changed;
- why it was necessary for the assigned task.

Do not dump the full `git diff`, and do not list every minor or generated file unless it is useful for understanding the work.

### 4. Verification

Explain how the result was verified.

Only mark a command or check as `PASS` if it was actually executed successfully during the current task.

Use clear statuses such as:

```text
PASS
FAIL
NOT RUN
BLOCKED
```

When useful, include the actual verification commands and their results.

If a check could not be run, state that explicitly and explain why.

Never infer or assume that a verification step would pass.

### 5. Important Files for Developers

Identify the most important files that a developer should understand after this task.

For each file, briefly explain:

- its role;
- what changed or why it matters;
- when a developer is likely to work with it again.

This is not a complete changed-file list. Prefer the small set of files that are most important for understanding, maintaining, debugging, or extending the completed work.

Do not prioritize generated files unless they are directly relevant to future development.

### 6. Remaining Issues

Report any remaining:

- errors;
- blockers;
- incomplete work;
- technical debt;
- TODOs;
- deferred decisions;
- known limitations.

If there are no meaningful remaining issues within the scope of the task, state that clearly.

### Completion Report Rules

The report must:

- use natural, developer-friendly language;
- be concise but sufficient for another developer to continue the work;
- describe only work that was actually performed;
- distinguish verified facts from assumptions;
- never claim completion when required verification or acceptance criteria are still failing;
- avoid replacing useful explanations with raw file lists or command output.

Default format:

```markdown
## Completion Report

### Assigned Work
...

### Summary
...

### Work Performed
...

### Verification
...

### Important Files for Developers
...

### Remaining Issues
...
```
