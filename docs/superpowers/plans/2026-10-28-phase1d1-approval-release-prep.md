# Phase 1D.1 Approval & Release Preparation Plan

## Outcome and boundaries

Prepare a reviewable DRAFT decision dossier for Candidate 1. Preserve all frozen files, the baseline manifest, public API/business behavior, and candidate schema behavior unless an in-scope review finding requires a correction. Do not approve or release any artifact and do not implement Phase 1D.2.

## Current evidence to verify

- AI Contract v1.0, R3/CR-002, TP-001, and all Candidate 1 schemas/fixtures/runner/reports.
- Candidate-only technical checks, baseline verification, archive integrity, SHA-256, and frozen-file hashes.
- Governance documents do not currently identify a named approver; record this as TBD rather than infer authority.

## Changes

1. Add a DRAFT decision matrix for five open questions: Stage 2 count, request prompt binding, runtime metadata mismatch, whitespace-only required output, and nested input mappings. Separate technical clarifications from observable changes needing upstream CR and AI Contract erratum.
2. Add a DRAFT AI Contract erratum covering AI-DD-011/§6.3 prompt binding, §13.1 Stage 2 projection, §7.1 whitespace mapping, and §6.4 runtime prompt mismatch. Mark each as a proposal requiring approval; preserve no-new-wire-field policy unless the owner decides otherwise.
3. Add a DRAFT upstream Change Request for the two proposed observable error classifications, preserving the existing public API shape and AIRequestLog attempt semantics. Do not assign an official CR number. State affected UC/FR/BR/API/Screen IDs, current/proposed behavior, and implementation impact in each proposal per AGENTS §3.
4. Update TP-001 and Candidate 1 README, TRACEABILITY, and VALIDATION_REPORT with links, current decisions, assumptions, review status, and actual verification evidence.
5. Add a Release Checklist with approval authority, artifact identity/version, `$id` namespace, candidate markers, tests, archive/hash, traceability, comparison with released Rev.4 if supplied, governance index, manifest, and AGENTS.md follow-up gates.
6. Run final read-only independent review of the dossier and all 15 schemas/fixtures. Fix only in-scope candidate/dossier findings; regenerate ZIP/checksum only if schema bytes change.

## Verification

Run `pnpm test:ai-schema-candidate`, `pnpm verify:baseline`, `unzip -t`, 15-schema archive inventory, SHA-256 sidecar check, and `git diff --check`. Record exact current results. Do not reuse historical workspace gate results as current PASS evidence. Confirm frozen AI Contract and manifest hashes are unchanged by this work.

## Completion report

Report files changed, verification evidence, independent review findings/disposition, approval decisions still open, and separate status for owner approval readiness versus Phase 1D.2 readiness. Expected status: dossier READY FOR OWNER APPROVAL; Phase 1D.2 remains BLOCKED until approvals and normative release gates are satisfied.
