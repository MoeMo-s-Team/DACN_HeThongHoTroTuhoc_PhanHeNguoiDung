# AI Contract v1.0 Schema Pack Release 1 — Validation Report

**Artifact status:** APPROVED / NORMATIVE downstream companion  
**Approval date:** 2026-10-28  
**Owner approval:** Explicit approval in this project session; approver name not supplied.  
**Phase 1D.2:** BLOCKED pending separate authorization. This report does not claim implementation or deployment readiness.

## Artifact identity

- Archive: `AI_Contract_v1.0_schema_pack_release1.zip`
- Exactly 15 JSON Schema Draft 2020-12 files; schemas only in archive.
- Release namespace: `urn:dacn:ai-contract:v1.0:schema-pack-release1:`.
- Request envelope omits `promptVersion`; runtime success metadata contains it.
- SHA-256: `a28743c94b871b8b9346dea552f092ce184c288db8ff613c6ea07cc864144620`.
- Source basis: checksum-verified AI Contract v1.0, R3/CR-002 and owner-approved decision records. Original released Rev.4 was not supplied; this artifact is not Rev.4.

## Verification

| Check | Result | Evidence |
|---|---|---|
| Release-specific Ajv runner | PASS | `node docs/releases/ai-contract-v1.0-schema-pack-release1/tests/validate.cjs` → `15 schemas compiled; 94 valid/invalid, registry, format, and contract assertions passed.` |
| Candidate regression runner | PASS | `pnpm test:ai-schema-candidate` → 15 schemas, 94 assertions passed. Candidate 1 remains unchanged. |
| `pnpm verify:baseline` | PASS | All 13 frozen manifest entries reported `OK`; manifest itself was not edited by this release. |
| ZIP integrity and exact inventory | PASS | `unzip -t` reported no errors; archive contains exactly 15 entries. |
| Archive/source byte comparison | PASS | All 15 member names and bytes exactly match `schemas/*.schema.json`. |
| SHA-256 sidecar | PASS | `sha256sum -c AI_Contract_v1.0_schema_pack_release1.zip.sha256` reported `OK`; digest matches above. |
| Release `SHA256SUMS` | PASS | Generated and verified with `sha256sum -c`; covers all 57 release files except the manifest itself. |
| Frozen-file preservation | PASS | AI Contract `44c6bc2f0f6d01a6590d216237d4eb7b5ffc02a0783ffe6fd271178a4c8d4056`; CR-002 `ce30a96830db58fc190e61cb39e1b108a39d51334fca39afba589d2749ae128a`; Governance Index v1.2 `0e8a465d622fb0fa0732ac0b1e57df76fb7f6c0ac9723e5eafabd33f29d0d59d`; Freeze Record `779e5492352eb53428bb57da2c0ec9ed59e9fad468361171dcbf46b24c8d0231`; baseline manifest `cfd8cd619e38d80c40d57ee7845c85e0a0b31532ad1cdf2c36d27971f7abebd2`. |
| `git diff --check` | PASS | Exit code 0. |
| Independent review of exact release | PASS | Read-only reviewer found no remaining blocking findings; see review disposition below. |

## Contract and governance trace

- Erratum 1 approves: no wire `request.promptVersion`; registry/profile/config binding; Stage 2 receives backend-computed `count`; post-dispatch runtime prompt mismatch → `502 AI_RUNTIME_FAILURE`, one FAILED log, no retry; whitespace-only required output → `502 AI_INCOMPLETE_DATA`, one FAILED log, no retry.
- CR-003 supplements CR-002 XAI-002; existing endpoints, error envelope, `AIRequestLog` fields and one-terminal-log-per-started-attempt semantics remain unchanged.
- Governance Index v1.3 is a new versioned file outside `docs/baseline/`. Existing frozen baseline files and manifest remain unchanged. Release checksums are in this directory's `SHA256SUMS`.

## Independent review

Read-only independent review of the exact release archive, 15 schemas, fixtures/runner, 57-file checksum manifest, approved CR-003/Erratum 1, traceability, governance v1.3, TP-001, decision record and AGENTS found no remaining blocking findings. Reviewer confirmed byte-identical archive/source schemas, 94 passing Ajv2020 assertions, no request `promptVersion`, and consistent post-dispatch FAILED-log/no-retry mappings. No runtime/Phase 1D.2 implementation was reviewed or performed.

## Readiness boundary

Release 1 is an approved schema companion. Runtime implementation of the approved classifications is not included. Phase 1D.2 and deployment still require separate authorization and their own implementation/configuration/capacity verification.
