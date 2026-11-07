# Phase 2B — R3 Baseline Alignment Report

**Ngày:** 2026-11-07
**Kết quả:** **APPLIED — VERIFIED**
**R3 source:** `c8807f24ec66a2465521533878d54541762018a9` (`docs(baseline): adopt R3 CR-002 freeze`)
**Scope:** Approved file-level synchronization from official Git releases. No whole-commit cherry-pick, business code, database, or commit. Pre-existing worktree deletions and untracked recovery/report files were preserved.

## 1. Kết luận

R3 is the approved authority for this checkout: Freeze Record v1.2 declares `DACN-REQ-UC-BL-2026-10-26-R3` FROZEN and CR-002 v1.0 APPROVED. The verified release commit was synchronized file-by-file. The official 12-entry manifest is preserved byte-for-byte; ten absent manifest artifacts and the separately released AI Contract v1.0 were restored after SHA-256 verification. Two existing matching R3 artifacts were retained.

The approved disposition keeps unchanged Use Case Diagram, UI Sitemap and Database Design active under `docs/baseline/`, and preserves exact R2 release artifacts under `docs/archive/R2/`. The separately released Contract v1.0 is active under `docs/baseline/` and is verified by its release SHA, outside the official R3 manifest's 12 entries. The current Design System bytes remain at the old baseline path and are also present at the R3 `docs/architecture/` path. Superseded active R2 files were retired only after exact archive copies were created.

Root and backend authority references are aligned to R3; the active baseline and Contract citations in the AI Design Spec and Plan now use API v1.5. No approved ADR contents were changed. Task 1 is PASS for contract and authority reconciliation. Fresh read-only Plan Review Gate approved the revised plan on 2026-11-07; Task 2 still requires explicit implementation authorization.

## 2. Source and checksum verification

The R3 commit, its manifest, freeze record, README, CR-002, and related release docs were read directly from Git. SHA-256 was recomputed over all 12 baseline file blobs named by the R3 manifest. Every value matched the manifest. The existing `SRS_v1.6_baseline_final.md` and `System_Architecture_and_Technology_Stack_v1.1_baseline.md` also match their R3 source hashes byte-for-byte.

| R3 manifest entry | Official SHA-256 | Active checkout |
|---|---|---|
| `Activity_Diagram_3_AI_Main_Flows_v1.3_baseline_final.md` | `05581349727ef5c179b84c8002beafabef7586c5ede24d0cd67e9feb3e82ad0b` | Missing; v1.2 remains active |
| `API_Specification_v1.5_baseline_final.md` | `6f827569190d098d139d657013dc8276460fd13b84eda5068146a4759fb13f27` | Missing; v1.4 remains active |
| `Business_Rules_v1.4_baseline_rev1.md` | `7f7c7b69da7e58573de934ecc3f1bbeab0e6229e8fdc4b8f9a5f415efffb84ed` | Missing; v1.3 remains active |
| `Change_Request_CR-002_AI_Input_Capacity_and_Runtime_Failure_Semantics_v1.0_approved.md` | `ce30a96830db58fc190e61cb39e1b108a39d51334fca39afba589d2749ae128a` | Missing |
| `Cross_Document_Audit_CR-002_v1.0.md` | `27aaeb026b92ceaae556ad8a7cabe4295115640545a8fec6f717c8cf0dd99857` | Missing |
| `Document_Governance_and_Traceability_Index_v1.2.md` | `0e8a465d622fb0fa0732ac0b1e57df76fb7f6c0ac9723e5eafabd33f29d0d59d` | Missing |
| `README_R3_CR002.md` | `0a9d9dfdabcd16f1dd0056ebc62711451e5c8a7d7f571aabd8d372df61fa3208` | Missing |
| `Requirements_UseCase_Baseline_Freeze_Record_v1.2.md` | `779e5492352eb53428bb57da2c0ec9ed59e9fad468361171dcbf46b24c8d0231` | Missing; v1.1 remains active |
| `SRS_v1.6_baseline_final.md` | `2dd242b93bb33e88fe477552ffba349e7fe730f9dbe8dc7f4326919bf9da96a8` | Present; exact hash match |
| `System_Architecture_and_Technology_Stack_v1.1_baseline.md` | `193b290d3afdba8543c516e6ece928fd389bc46e7c62772b81cb23a7182d4749` | Present; exact hash match |
| `Use_Case_Specification_v1.2_baseline_rev1.md` | `dabc9317482b97511ebddfd0047153bd9edc6c53fb50452cda187f1539d43753` | Missing; v1.1 remains active |
| `Wireframe_Screen_Specification_v1.1_baseline_final.md` | `b0b709c3527bbc70167443852d03a3ea9892daa7d2538902c780cadbc03bdf28` | Missing; v1.0 remains active |

Authority evidence:

- `Requirements_UseCase_Baseline_Freeze_Record_v1.2.md`: R3 frozen under CR-002; R1/R2 are retained for traceability, not overwritten.
- `README_R3_CR002.md`: revised artifacts, unchanged authorities, and separate AI schema companion are explicitly enumerated.
- `Document_Governance_and_Traceability_Index_v1.2.md`: R3 version map and authority order.
- `Cross_Document_Audit_CR-002_v1.0.md`: PASS record for public error/capacity semantics and R3 references.
- `CR-002 v1.0`: approved `422 AI_INPUT_TOO_LARGE`, `502 AI_RUNTIME_FAILURE`, fail-closed capacity binding, no truncation, and pre-/post-dispatch log rules.

## 3. Pre-sync checkout snapshot and impact

This section records the state captured before the approved synchronization; the “Safe file-level synchronization” section and verification record below describe the applied result.

### 3.1 Baseline files

| Current path/state | R3 disposition | Safe action after approval |
|---|---|---|
| `docs/baseline/SRS_v1.6_baseline_final.md` | R3 revised authority; exact bytes already match | Keep; no rewrite |
| `docs/baseline/System_Architecture_and_Technology_Stack_v1.1_baseline.md` | R3 revised authority; exact bytes already match | Keep; no rewrite |
| `docs/baseline/API_Specification_v1.4_baseline_final.md` | R2 superseded by v1.5 | Archive the exact R2 source under `docs/archive/R2/`; add the exact R3 v1.5 source at the active path |
| `docs/baseline/Business_Rules_v1.3_baseline_rev1.md` | R2 superseded by v1.4 | Archive R2 source; add exact R3 v1.4 source |
| `docs/baseline/Use_Case_Specification_v1.1_baseline_rev1.md` | R2 superseded by v1.2 | Archive R2 source; add exact R3 v1.2 source |
| `docs/baseline/Activity_Diagram_3_AI_Main_Flows_v1.2_baseline_final.md` | R2 superseded by v1.3 | Archive R2 source; add exact R3 v1.3 source |
| `docs/baseline/Wireframe_Screen_Specification_v1.0_baseline_final.md` | R2 superseded by v1.1 | Archive R2 source; add exact R3 v1.1 source |
| `docs/baseline/Requirements_UseCase_Baseline_Freeze_Record_v1.1.md` | R2 freeze record; superseded by R3 v1.2 | Archive R2 record; add exact R3 v1.2 record |
| `docs/baseline/Use_Case_Diagram_he_thong_ho_tro_tu_hoc_AI_v1.4_baseline_rev1.md` | Listed unchanged by R3 README/freeze | Keep active; preserve an exact historical R2 copy in archive |
| `docs/baseline/UI_Sitemap_v1.1_baseline.md` | Listed unchanged by R3 README/freeze | Keep active; preserve an exact historical R2 copy in archive |
| `docs/baseline/Database_Design_v1.0_baseline_final.md` | Listed unchanged by R3 README/freeze | Keep active; preserve an exact historical R2 copy in archive |
| `docs/baseline/BASELINE_MANIFEST.sha256` | Current 14-entry mixed manifest (R2 docs, SRS v1.6, Architecture v1.0 and v1.1); not the R3 release manifest | Replace only after resolving checksum coverage in §5; do not edit or regenerate now |
| `docs/baseline/AI_Contract_v1.0_baseline_final.md` | R3 README calls it an unchanged downstream authority; official source is at release commit `e9a44818c077faf7b7809ac9e4efa3280ba88ed4`, SHA-256 `44c6bc2f0f6d01a6590d216237d4eb7b5ffc02a0783ffe6fd271178a4c8d4056` | Active path is absent; after approval, materialize exact official source. Do not promote recovery text or Candidate 1 |
| `docs/baseline/Sequence_Diagram_Core_Flows_v1.0_baseline_final.md` | R2-only; R3 commit archives it | Archive exact R2 source; do not list as active R3 authority |
| `docs/baseline/Global UI Design System — Editorial Tech.md` | Not in R3 manifest; R3 AGENTS points to `docs/architecture/Global UI Design System — Editorial Tech.md`; current active location is under `docs/baseline/` | Decide canonical architecture path; retain original bytes/history and remove from baseline checksum coverage only under approved manifest policy |

The official R3 commit has `docs/archive/R2/` with the 14 R2-era files and `R2_BASELINE_MANIFEST.sha256`. That directory is absent in the active worktree. After approval, use those exact release-tree bytes for archival rather than rebuilding old files from memory. Retain the active copies of R3-declared unchanged authorities; the R3 README describes them as active, even though the R3 commit tree places their copies only in the archive directory.

### 3.2 Guidance and downstream references

| Path | Finding | Proposed treatment |
|---|---|---|
| `AGENTS.md` | Authority order still names SRS v1.5, API v1.4, BR v1.3, UCS v1.1, Activity v1.2, Wireframe v1.0 and Architecture v1.0; no R3 freeze/index path | After approval, surgically update the authority/version list and archival rule from the official R3 AGENTS source. Preserve all unrelated local implementation rules; do not wholesale replace the file |
| `apps/api/AGENTS.md` | Public API authority still points at API v1.4 | Change the reference to v1.5 after approval; preserve other backend rules |
| `docs/decisions/ADR-CONTRACT-001 — OpenAPI-Generated Shared API Contracts.md` | Approved decision references API v1.4 and Architecture v1.0 | Review whether references are historical context or require an approved revision; do not silently edit an approved ADR |
| `docs/decisions/ADR_AUTH_001_Authentication_Architecture_Decision_v1.0_accepted.md` | R3 lists it as unchanged, but its source references are API v1.4 and Architecture v1.0 | Keep decision behavior unchanged; get governance direction on stale source labels before any edit |
| `docs/baseline/Use_Case_Diagram...v1.4.md`, `UI_Sitemap_v1.1.md` | Declared unchanged by R3, but internal source-reference tables mention R2 document versions | Preserve frozen bytes; do not edit as part of synchronization. R3 Governance Index/Frozen record must establish their active interpretation |
| `docs/superpowers/specs/2026-11-07-ai-foundation-design.md`, `docs/superpowers/plans/2026-11-07-ai-foundation-implementation.md` | Correctly describe the present mismatch and block implementation | Update their gate/status and citations only after approved sync; because plan content would materially change, obtain fresh Plan Review Gate approval |
| `docs/proposals/technical/current-implementation-audit-2026-11-07.md` and earlier Superpowers plans | Point-in-time evidence from before R3 alignment | Preserve as historical reports/plans; do not retroactively rewrite findings |

Search also found R2 citations in superseded baseline documents. Keep those documents byte-identical in the R2 archive; they are historical evidence, not current implementation guidance.

## 4. Applied file-level synchronization

1. Confirmed the approved disposition and captured the pre-change Git status. The existing root-level manifest and Candidate ZIP deletions, recovery files, and reports were left untouched.
2. Verified all 12 manifest source blobs from R3 commit `c8807f24ec66a2465521533878d54541762018a9`, all archive sources, and the Contract source hash before writing. Checked destinations for collisions and checked superseded tracked files were clean.
3. Added ten missing R3 manifest artifacts, kept exact existing SRS/Architecture bytes, and installed the official manifest bytes. Archived 14 exact R2 artifacts and removed nine superseded active-path R2 files after archive copies existed.
4. Restored Contract v1.0 from its official release, kept unchanged authorities active, and copied the unchanged Design System to the canonical architecture path while preserving its prior path.
5. Updated root/backend authority references and the AI Design Spec, Plan and governance reports. Left approved ADR contents unchanged. Adjusted `verify:baseline` to run the official full-path manifest from repository root.
6. Ran post-sync checksum and whitespace checks. No cherry-pick or commit was performed.

## 5. Approved dispositions applied

1. **R3 adoption:** R3 Freeze Record v1.2 governs this active checkout.
2. **Manifest scope:** retain the exact official 12-entry R3 release manifest. Unchanged authorities and Contract v1.0 are verified against their own source releases; do not append locally computed hashes.
3. **Unchanged authority locations:** unchanged Use Case Diagram, UI Sitemap and Database Design remain under `docs/baseline/`; exact R2 copies are in `docs/archive/R2/`. AI Contract v1.0 is restored under `docs/baseline/` from its separate release.
4. **Design System path:** retain the original bytes at `docs/baseline/` and add the identical source at `docs/architecture/`.
5. **Instruction/decision references:** update root and backend authority refs; preserve approved ADR bytes unchanged and treat their old source labels as historical context.

## 6. AI Contract, API mapping, and plan impact

- R3 API v1.5 adds `AI_RUNTIME_FAILURE` and `AI_INPUT_TOO_LARGE`; the active API now contains these mappings and matches AI Contract v1.0.
- CR-002 and the R3 Cross-Document Audit bind fail-closed capacity behavior: valid bound profile + complete input over budget → `422 AI_INPUT_TOO_LARGE`, no dispatch/log; missing or mismatched profile → `502 AI_RUNTIME_FAILURE`, no dispatch/log; no truncation/chunking.
- AI Contract v1.0, Schema Pack Release 1, Errata and the six task keys remain unchanged. Task 1’s checked E5/E6 mapping and terminal log behavior must still follow the approved Contract/Erratum releases. R3 sync does not resolve the AIRequestLog terminal-insert failure policy, CR-005/ADR-AI-001 release state, or CPU capacity evidence.
- The Design Spec and Plan now state that Task 1 passed authority reconciliation. Their material updates require fresh read-only Plan Review before implementation.
- No Student AI end-to-end task is unlocked merely by applying R3. Task 2 requires Task 1 PASS and explicit implementation authorization. Runtime/Ollama/Student inference still require formally released CR-005/ADR-AI-001 and a valid target profile; Task 5/dispatch still require the terminal-log failure disposition.

## 7. Post-sync verification commands

The commands were run from repository root after synchronization:

```bash
git status --short
git diff --check
sha256sum docs/baseline/SRS_v1.6_baseline_final.md docs/baseline/API_Specification_v1.5_baseline_final.md docs/baseline/Business_Rules_v1.4_baseline_rev1.md docs/baseline/Use_Case_Specification_v1.2_baseline_rev1.md docs/baseline/Activity_Diagram_3_AI_Main_Flows_v1.3_baseline_final.md docs/baseline/Wireframe_Screen_Specification_v1.1_baseline_final.md docs/baseline/System_Architecture_and_Technology_Stack_v1.1_baseline.md
(cd docs/baseline && sha256sum -c BASELINE_MANIFEST.sha256)
pnpm verify:baseline
rg -n "SRS_v1\.5|API_Specification_v1\.4|Business_Rules_v1\.3|Use_Case_Specification_v1\.1|Activity_Diagram_3_AI_Main_Flows_v1\.2|Wireframe_Screen_Specification_v1\.0|System_Architecture_and_Technology_Stack_v1\.0" AGENTS.md apps/api/AGENTS.md docs/decisions docs/superpowers/specs/2026-11-07-ai-foundation-design.md docs/superpowers/plans/2026-11-07-ai-foundation-implementation.md
git diff -- docs/baseline AGENTS.md apps/api/AGENTS.md docs/decisions docs/superpowers/specs/2026-11-07-ai-foundation-design.md docs/superpowers/plans/2026-11-07-ai-foundation-implementation.md
```

Expected: every R3 manifest entry verifies; the approved full-authority checksum policy is satisfied; `pnpm verify:baseline` passes; remaining old-version references are explicitly historical (R2 archive or unchanged approved ADR/document) rather than active implementation guidance. Inspect `git status` to confirm pre-existing deletions and untracked recovery/report files were preserved. Do not use `git checkout .`, `git clean`, a full cherry-pick, `migrate reset`, or any command that discards existing work.

## 8. Task 1 disposition

**Current Task 1: PASS for contract and authority reconciliation.** The R3 release source, 12 manifest hashes and separate Contract hash are verified; the active checkout and guidance are aligned. This does not approve CR-005, capacity profiles or AI inference.

The materially updated Implementation Plan requires a fresh read-only Plan Review Gate. Task 2 also requires explicit implementation authorization. Task 5/dependent dispatch remain blocked on terminal-log insert failure disposition; FastAPI/Ollama and Student live AI require formal CR-005/ADR-AI-001 release and a matching released capacity profile.

## 9. Applied file and verification record

- Restored the ten absent R3 manifest artifacts; retained the two already matching files. Replaced `docs/baseline/BASELINE_MANIFEST.sha256` byte-for-byte with the official 12-entry R3 manifest.
- Restored 14 official R2 archive files under `docs/archive/R2/`; retired nine superseded R2 files from active `docs/baseline/` after confirming the source paths were clean and exact archive copies existed. Unchanged authorities remain active.
- Restored AI Contract v1.0 from release commit `e9a44818c077faf7b7809ac9e4efa3280ba88ed4`, SHA-256 `44c6bc2f0f6d01a6590d216237d4eb7b5ffc02a0783ffe6fd271178a4c8d4056`.
- Kept the existing Design System file and added a byte-identical copy under `docs/architecture/`.
- Updated `AGENTS.md`, `apps/api/AGENTS.md`, the AI governance gate report, the Design Spec and Implementation Plan. Approved ADR content was not changed. Updated `package.json`'s `verify:baseline` command to read the official manifest from repository root, matching its full `docs/baseline/...` paths.
- **PASS:** all 12 R3 manifest entries via `pnpm verify:baseline`; all 13 entries in the R2 archive manifest; Contract SHA-256; byte identity for unchanged Diagram/Sitemap/Database Design and Design System files plus unchanged ADR-AUTH-001 (SHA-256 `d41c37bc4437d99531245197424c4763e78f671eef88385b91daddf6e3adae2c`); `git diff --check`; final newline/trailing-space scan across six edited text files; fresh read-only Plan Review Gate.
- **NOT RUN:** application, database, and AI runtime tests; no business code, database, or runtime was changed.
- Pre-existing root deletions and untracked recovery/report files remain untouched. No cherry-pick or commit was performed.
