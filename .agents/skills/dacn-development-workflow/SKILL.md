---
name: dacn-development-workflow
description: Use when starting a DACN repository task that may involve feature work, debugging, refactoring, implementation planning, executing an approved plan, review, or completion claims.
---

# DACN Development Workflow

## Core Rule

Route the task to the required Superpowers skill **before exploration, planning, editing, or proposing fixes**. Repository `AGENTS.md` and frozen baseline rules remain authoritative.

## Routing

| Task condition                                                                                                  | Required skill                                                                                                                |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| New feature, new behavior, UI/component creation, architecture/design choice, or unclear implementation request | `superpowers:brainstorming`                                                                                                   |
| Approved design/spec exists and implementation needs multiple steps                                             | `superpowers:writing-plans`                                                                                                   |
| Bug, failing test, build failure, or unexpected behavior                                                        | `superpowers:systematic-debugging`                                                                                            |
| Feature, bugfix, or refactor implementation                                                                     | `superpowers:test-driven-development` before production code                                                                  |
| An approved plan file actually exists                                                                           | `superpowers:subagent-driven-development` when suitable and multi-agent is available; otherwise `superpowers:executing-plans` |
| Major completed change or before merge                                                                          | `superpowers:requesting-code-review`                                                                                          |
| Before any claim that work is complete, fixed, passing, or ready                                                | `superpowers:verification-before-completion`                                                                                  |

## Ordering

For new work:

`brainstorming` → human-approved design → `writing-plans` → approved plan → execution → review → verification.

For bugs:

`systematic-debugging` → root cause → `test-driven-development` → review when significant → verification.

## Repository Gates

Before implementation, apply root/scoped `AGENTS.md` traceability and Proposal Mode.

A Superpowers skill never authorizes changing frozen baseline behavior.

If a required plan, source tree, test setup, or approved decision is missing, report the blocker. Do not invent the artifact, scaffold unrelated code, or silently choose product behavior just to continue the workflow.

## Red Flags

Stop and route correctly if you are:

- exploring feature implementation before invoking `brainstorming`;
- proposing a bug fix before `systematic-debugging`;
- writing production code before TDD;
- executing a plan that was not found and confirmed;
- claiming success without fresh verification evidence.
