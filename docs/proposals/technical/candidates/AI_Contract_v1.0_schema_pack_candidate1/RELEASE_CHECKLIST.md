# Candidate 1 Release Checklist

**Candidate 1 status: CANDIDATE — NOT APPROVED (preserved as reviewed source).**  
**Successor:** `docs/releases/ai-contract-v1.0-schema-pack-release1/`, approved 2026-10-28. This checklist records the successor release; it does not change Candidate 1's identity.

Complete only after owner decisions and approvals. Record evidence links, actor, and date beside each checked item.

## Approval authority and decisions

- [x] Project Owner explicitly approved the full decision/release set on 2026-10-28; name not supplied.
- [x] Decision matrix approved: `docs/proposals/technical/AI-Contract-Candidate1-decision-matrix.md`.
- [x] TP-001 approved; status/date recorded in the proposal.
- [x] AI Contract v1.0 Erratum 1 approved and issued in the Release 1 directory.
- [x] Observable error policy approved as CR-003; existing error envelope confirmed.
- [x] Nested mapping and Stage 2 projection approved as written.
- [ ] Phase 1D.2 authorization separately recorded; this checklist is not authorization.

## Artifact identity and schema IDs

- [ ] Original Rev.4 was unavailable; therefore Release 1 is explicitly a new independent artifact, never identified as recovered Rev.4.
- [x] Artifact identity: `AI_Contract_v1.0_schema_pack_release1.zip`, release date 2026-10-28.
- [x] Release namespace `urn:dacn:ai-contract:v1.0:schema-pack-release1:`; IDs unique and registry compiles.
- [x] Release copy has no candidate markers; Candidate 1 remains preserved and unchanged.
- [x] Exact 15-file inventory and release SHA-256 recorded in `SHA256SUMS` and `VALIDATION_REPORT.md`.

## Technical validation

- [x] Release-specific runner uses Ajv 8/Ajv2020 and `ajv-formats`; candidate-only assertions were updated for the approved release identity.
- [x] All 15 schemas compile; valid/invalid/edge/semantic fixtures pass, including required/type/enum/unknown/date-time/`$ref` and contract regression cases.
- [x] `unzip -t` passes; archive contains exactly the approved schema inventory.
- [x] Archive member names and bytes match the 15 release source schemas exactly.
- [x] Release SHA-256 sidecar and `SHA256SUMS` verify.
- [x] Request envelope contains no `promptVersion`; no public API shape or business implementation changes bundled.
- [x] Independent review of exact Release 1 bytes and governance update found no blocking findings; see Release 1 `VALIDATION_REPORT.md`.

## Governance and release records

- [x] Added versioned Governance Index v1.3 outside `docs/baseline/`; existing frozen index v1.2 is unchanged.
- [x] Existing `BASELINE_MANIFEST.sha256` intentionally unchanged; release-specific `SHA256SUMS` records this release.
- [x] Updated `AGENTS.md` to reference the approved versioned governance/schema artifacts while preserving frozen-baseline safeguards.
- [x] Published archive, hashes, inventory, validation report, approval records and traceability under `docs/releases/ai-contract-v1.0-schema-pack-release1/`.
- [x] `pnpm verify:baseline` passes against the unchanged frozen manifest.
- [ ] Phase 1D.2 remains blocked pending separate authorization; deployment gates not assessed here.
