# TP-001 — Preserve Fractional Study Availability Minutes

**Status:** DRAFT  
**Created:** 2026-11-10  
**Author:** Codex  
**Related Task:** Phase 2B Student StudyPlan Generation → Apply

## 1. Context

The active contract accepts any positive `availableHoursPerWeek` and normalizes it exactly as `availableMinutesPerWeek = availableHoursPerWeek × 60`. The frozen Prisma model stores `StudyPlan.availableMinutesPerWeek` as `Int`. Valid inputs such as `1.3333` hours therefore produce `79.998` minutes, which PostgreSQL `INTEGER` cannot persist without changing the value.

## 2. Baseline / Architecture References

- `UC-STU-003`, `UC-STU-005`, `UC-STU-006`
- `FR-STU-003`, `FR-STU-005`, `FR-STU-006`
- `BR-037`
- API: `API-STU-CONTEXT-001`, `API-STU-PLAN-001`, `API-STU-PLAN-002`
- Data: `DATA-REQ-005`
- Database design: `docs/baseline/Database_Design_v1.0_baseline_final.md`
- Prisma: `apps/api/prisma/schema.prisma`, `StudyPlan.availableMinutesPerWeek`

## 3. Constraint

Keep the exact hour-to-minute conversion, API number semantics, AI input, and Student confirmation flow. Do not round or reject contract-valid positive inputs without a separately approved change request. Frozen baseline remains read-only.

## 4. Problem

StudyPlan preview can preserve fractional minutes, but Apply currently cannot safely persist them into the frozen integer column. Rounding changes BR-037's normalized value and can turn small positive values into zero; rejecting them would also narrow the frozen API behavior. This edge must be resolved before claiming Apply works for every valid positive input.

## 5. Options Considered

### Option A — Store normalized minutes as a fixed-precision decimal

Change the persistence column to a precision-bounded decimal, migrate existing integer values exactly, and convert Prisma Decimal to JSON number at API boundaries.

**Advantages**
- Preserves existing API and business behavior.
- Preserves exact positive sub-minute values.

**Disadvantages**
- Requires a schema migration and updates to DTO/service conversions and tests.
- Precision/scale must be selected and verified against AI schema and UI expectations.

### Option B — Restrict available hours to whole-minute increments

Require `availableHoursPerWeek × 60` to be an integer.

**Advantages**
- Keeps the current integer database column.

**Disadvantages**
- Changes the accepted request range and requires an approved change request to BR-037/API-STU-CONTEXT-001.

## 6. Recommended Option

**Recommendation:** Option A, subject to review and approval.

It preserves the frozen observable behavior. Choose decimal precision/scale only after checking the maximum accepted hours, existing schema conventions, and serialization path.

## 7. Implementation Impact

- Frontend: no API behavior change; confirm displayed minutes preserve the numeric value.
- Backend: update Prisma field type, map decimal values to/from API numbers, and validate migration compatibility.
- Database: add a reversible integer-to-decimal migration; preserve existing values exactly.
- AI: confirm input schema accepts the selected decimal precision without rounding.
- Tests: add sub-minute and repeating-decimal cases across validate → generate → preview → apply → current-plan readback, including migration verification.
- Configuration/Deployment: deploy migration before API code that writes decimal values.

## 8. Verification Required

- [ ] Frozen behavior/API remains unchanged.
- [ ] Migration preserves all existing StudyPlan minute values exactly.
- [ ] Fractional positive hours remain positive and round-trip through PostgreSQL.
- [ ] API/OpenAPI contract and AI input schema remain compatible.
- [ ] Relevant tests and baseline hash check pass.

## 9. Decision

**Decision:** PENDING HUMAN REVIEW
