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
| Bug, failing test, build failure, or unexpected behavior                                                | `superpowers:systematic-debugging`                                                                                            |
| Feature, bugfix, or refactor implementation                                                             | `superpowers:test-driven-development` before production code                                                                  |
| An approved plan file actually exists                                                                   | `superpowers:subagent-driven-development` when suitable and multi-agent is available; otherwise `superpowers:executing-plans` |
| Major completed change or before merge                                                                  | `superpowers:requesting-code-review`                                                                                          |
| Before any claim that work is complete, fixed, passing, or ready                                        | `superpowers:verification-before-completion`                                                                                  |

## Ordering

For new work:

`brainstorming` → human-approved design → `writing-plans` → approved plan → execution → review → verification.

For frontend/UI work whose design is not yet approved:

`brainstorming` → `ui-ux-pro-max` → human-approved UI design → `writing-plans` → TDD → implementation → review → verification.

For frontend/UI implementation from an already-approved design:

`ui-ux-pro-max` → `writing-plans` when needed → TDD → implementation → review → verification.

For bugs:

`systematic-debugging` → root cause → `test-driven-development` → review when significant → verification.

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

A Superpowers or third-party skill never authorizes changing frozen baseline behavior.

If a required plan, source tree, test setup, or approved decision is missing, report the blocker. Do not invent the artifact, scaffold unrelated code, or silently choose product behavior just to continue the workflow.

## Red Flags

Stop and route correctly if you are:

- exploring feature implementation before invoking `brainstorming`;
- doing frontend/UI design or review without considering `ui-ux-pro-max`;
- allowing `ui-ux-pro-max` to override Wireframe or the Global UI Design System;
- proposing a bug fix before `systematic-debugging`;
- writing production code before TDD;
- executing a plan that was not found and confirmed;
- claiming success without fresh verification evidence.
