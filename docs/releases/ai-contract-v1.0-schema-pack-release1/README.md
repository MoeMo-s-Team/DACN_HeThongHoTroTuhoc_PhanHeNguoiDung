# AI Contract v1.0 Schema Pack — Release 1

**APPROVED / NORMATIVE downstream companion.**  
**Artifact:** `AI_Contract_v1.0_schema_pack_release1.zip`  
**Release date:** 2026-10-28  
**Approval:** Project Owner, explicit approval in this project session; approver name not supplied.  
**Status boundary:** This release does not authorize Phase 1D.2 implementation or deployment.

Release 1 is a newly identified artifact, not a recovery or relabeling of `AI_Contract_v1.0_schema_pack_rev4.zip`. The original Rev.4 archive was not supplied. This release is based on the checksum-verified AI Contract v1.0, R3/CR-002, the approved decision matrix, Erratum 1 and CR-003.

## Contents

- `AI_Contract_v1.0_schema_pack_release1.zip`: exactly 15 Draft 2020-12 JSON Schemas, schemas only.
- `schemas/`: source copies for the exact archive bytes; release `$id` namespace is `urn:dacn:ai-contract:v1.0:schema-pack-release1:`; no candidate markers.
- `fixtures/`, `tests/validate.cjs`: release-specific Ajv2020/Ajv 8, `ajv-formats`, fixture and registry validation.
- `scripts/package.py`: deterministic archive/checksum generator.
- `SHA256SUMS`: hashes for release documents, source schemas, fixtures, scripts, runner, archive and archive sidecar.
- `AI_Contract_v1.0_Erratum_1_approved.md`, `CR-003_AI_Runtime_Output_Error_Policy_approved.md`.
- `TRACEABILITY.md`: schema-to-contract/R3 mapping and approved nested input mappings.
- Approved decision record: `docs/proposals/technical/AI-Contract-Candidate1-decision-matrix.md`.
- Governance authority: `docs/governance/Document_Governance_and_Traceability_Index_v1.3.md`.
- `VALIDATION_REPORT.md`: release verification evidence and review status.

The request envelope still contains no `promptVersion`. The archive records schema structure only; NestJS semantic validation, correlation/reference validation, preflight capacity, logging and retries remain as specified by Erratum 1, CR-003 and CR-002.
