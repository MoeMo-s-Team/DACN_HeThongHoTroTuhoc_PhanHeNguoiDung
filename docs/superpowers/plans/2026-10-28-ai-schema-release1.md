# AI Schema Pack Release 1 Plan

## Outcome

Publish the owner-approved Candidate 1 decisions as a distinct normative release without overwriting the candidate archive, AI Contract v1.0 source, R3, or CR-002. Do not implement Phase 1D.2.

## Approved scope

- Owner approved the decision matrix, TP-001 recommendations, contract erratum recommendations, CR draft recommendations, and official release on 2026-10-28.
- Record the authority as Project Owner (explicit approval in conversation; no name supplied).
- Assign next CR ID `CR-003`; assign AI Contract v1.0 Erratum 1; assign schema artifact `AI_Contract_v1.0_schema_pack_release1.zip` with namespace `urn:dacn:ai-contract:v1.0:schema-pack-release1:`. Do not identify it as recovered Rev.4.

## Steps

1. Convert approved proposal copies to issued records: CR-003 and AI Contract v1.0 Erratum 1; mark TP-001 and decision record approved with date/authority.
2. Create a release copy of all 15 schemas with release1 `$id` namespace and without candidate markers; retain Candidate 1 untouched.
3. Package only 15 schemas, create SHA-256 sidecar, and provide a release-specific validation runner/fixtures/report outside the ZIP.
4. Run Ajv 8/Ajv2020 tests, fixture assertions, ZIP integrity, exact archive/source byte comparison, and SHA checks.
5. Add a versioned Governance Index v1.3 outside `docs/baseline/` that records CR-003, Erratum 1, and release1 as approved authorities. Keep every existing frozen baseline file and `BASELINE_MANIFEST.sha256` unchanged. Create a release-specific SHA-256 manifest. Update root AGENTS.md governance and schema-pack reference to the approved versioned artifacts.
6. Update Release Checklist by checking only gates satisfied by this release. Mark incorporation into frozen `BASELINE_MANIFEST.sha256` as N/A/deferred with the release-specific manifest evidence; leave Phase 1D.2 and deployment gates pending.
7. Run baseline verification, candidate regression, release runner, archive/checksum/source comparisons, and diff checks. Capture frozen source hashes before/after where files must remain unchanged.
8. Obtain independent read-only review of the exact release archive, governance delta, and approval records; fix in-scope release issues and rerun affected gates.

## Boundaries

No public API shape changes, wire fields, runtime code, business implementation, or Phase 1D.2. The approved CR/erratum specify classifications and logs; they are records only in this phase. Preserve AI Contract v1.0, CR-002, all frozen R3 files, `BASELINE_MANIFEST.sha256`, and the original Candidate 1 byte-for-byte. Do not edit/auto-update frozen artifacts; owner approval authorizes a new versioned release outside the frozen baseline only.
