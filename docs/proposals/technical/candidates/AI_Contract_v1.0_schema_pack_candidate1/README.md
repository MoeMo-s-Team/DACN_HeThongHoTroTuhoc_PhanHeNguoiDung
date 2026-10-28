# AI Contract v1.0 Schema Pack Candidate 1

**CANDIDATE — NOT APPROVED.** Candidate 1 is preserved as review history and is not normative. The separately identified and approved Release 1 is at `docs/releases/ai-contract-v1.0-schema-pack-release1/`; it is not recovered Rev.4. No artifact in this candidate folder authorizes Phase 1D.2.

## Contents

- `schemas/`: exactly the 15 schema filenames listed by AI Contract §20.
- `fixtures/valid/`, `fixtures/invalid/`: one accepted fixture per schema and negative cases with expected Ajv keyword/path.
- `fixtures/semantic-proposals.json`: a post-dispatch whitespace-only output case; Ajv must accept it, while proposed `AI_INCOMPLETE_DATA`/FAILED semantics remain pending approval.
- `tests/validate.cjs`: strict Ajv 8 `Ajv2020` registry compilation and executable fixture checks, with `ajv-formats`.
- `TRACEABILITY.md`: contract/R3 source map, validation boundary, and assumptions requiring approval.
- `VALIDATION_REPORT.md`: run evidence, archive digest, and outstanding decisions.
- `RELEASE_CHECKLIST.md`: approval and controlled release gates; no release is authorized now.
- Decision dossier: [`AI-Contract-Candidate1-decision-matrix.md`](../../AI-Contract-Candidate1-decision-matrix.md), [`AI-Contract-v1.0-erratum-draft-candidate1.md`](../../AI-Contract-v1.0-erratum-draft-candidate1.md), and [`CR-DRAFT-AI-RUNTIME-OUTPUT-ERROR-POLICY.md`](../../../change-requests/CR-DRAFT-AI-RUNTIME-OUTPUT-ERROR-POLICY.md).
- `AI_Contract_v1.0_schema_pack_candidate1.zip`: deterministic archive containing only the 15 schema files.

Run from repository root:

```sh
pnpm test:ai-schema-candidate
pnpm pack:ai-schema-candidate
```

The archive can be checked with `unzip -t` and its sidecar with `sha256sum -c` from this directory. Approval and release-owner sign-off are required before this candidate can be treated as normative. The reviewed governance index and freeze record do not name a release approver; `RELEASE_CHECKLIST.md` records this as `TBD by project owner`. Candidate verification is separate from owner approval. Phase 1D.2 remains blocked until required artifact and decision approvals are recorded.

For Admin, Stage 1 output omits `count`; the candidate Stage 2 input requires backend-computed `count` after validation, deduplication, and empty-group removal. AI Contract §13.1 does not explicitly enumerate that internal projection, so this candidate choice is traceable but still needs approval. The runner also verifies §18.2 cases: AI-supplied Stage 1 `count` fails closed-object validation, while Stage 2 accepts `issueGroups: []`. See `TRACEABILITY.md` and `VALIDATION_REPORT.md`.
