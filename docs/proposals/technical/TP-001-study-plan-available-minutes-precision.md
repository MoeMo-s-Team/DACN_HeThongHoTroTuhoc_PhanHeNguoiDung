# TP-001 — Preserve Fractional Study Availability Minutes

**Status:** DRAFT  
**Created:** 2026-11-10  
**Updated:** 2026-11-13  
**Author:** Codex  
**Related Task:** Phase 2B Student StudyPlan Generation → Apply

## 1. Context

The active contract accepts positive `availableHoursPerWeek` and normalizes it as `availableMinutesPerWeek = availableHoursPerWeek × 60`. NestJS and the public API represent that value as a JavaScript `number`, while the current Prisma model stores `StudyPlan.availableMinutesPerWeek` as `Int`. For example, `1.3333` hours produces the JavaScript value `79.99799999999999`, which PostgreSQL `INTEGER` cannot persist without changing it.

## 2. Baseline / Architecture References

- `UC-STU-003`, `UC-STU-005`, `UC-STU-006`
- `FR-STU-003`, `FR-STU-005`, `FR-STU-006`
- `BR-037`
- API: `API-STU-CONTEXT-001`, `API-STU-PLAN-001`, `API-STU-PLAN-002`
- Data: `DATA-REQ-005`
- Database design: `docs/baseline/Database_Design_v1.0_baseline_final.md`
- Prisma: `apps/api/prisma/schema.prisma`, `StudyPlan.availableMinutesPerWeek`

## 3. Constraint

Keep the approved hours-to-minutes calculation, API number semantics, AI input, and Student confirmation flow. Do not round or reject contract-valid positive inputs without an approved change request. Frozen baseline remains read-only.

## 4. Problem

StudyPlan preview preserves fractional minutes, but Apply cannot persist them into the current integer column. Rounding changes the normalized value and can turn a small positive value into zero; rejecting it would narrow current request validation. This must be resolved before claiming Apply works for every positive finite input whose multiplication remains finite.

The API has no upper bound on positive hours. An extremely large but finite JavaScript number can overflow when multiplied by 60, producing `Infinity`, which cannot be represented in JSON. This is an existing edge outside the storage fix; this proposal does not add a cap or silently reject that input. If full support for such extreme inputs is required, it needs a separate Project Owner decision about request/business bounds or end-to-end decimal semantics.

## 5. Options Considered

### Option A — Store normalized minutes as PostgreSQL `DOUBLE PRECISION`

Change the database column from PostgreSQL `INTEGER` to `DOUBLE PRECISION`, use Prisma `Float`, and keep JavaScript `number` at API boundaries.

**Advantages**
- Preserves the same IEEE-754 value produced by the current JavaScript calculation when stored and read back.
- Does not introduce an undocumented decimal scale or rounding rule.
- Existing 32-bit integer values convert exactly to `DOUBLE PRECISION`.

**Disadvantages**
- Base-10 fractions are not necessarily mathematically exact in binary floating point; this preserves the API's existing numeric representation rather than promising exact decimal arithmetic.
- Requires a schema migration and PostgreSQL round-trip tests.
- A finite input whose multiplication by 60 overflows remains unresolved by this storage change.

### Option B — Restrict available hours to whole-minute increments

Require `availableHoursPerWeek × 60` to be an integer.

**Advantages**
- Keeps the current integer database column.

**Disadvantages**
- Changes accepted request values and requires an approved change request to `BR-037` / `API-STU-CONTEXT-001`.

## 6. Recommended Option

**Recommendation:** Option A, subject to Project Owner approval.

PostgreSQL `DOUBLE PRECISION` can preserve the binary JavaScript `number` value produced by the existing multiplication and return it to Prisma without a new scale or rounding step. This recommendation does not claim base-10 decimal exactness. Select this option only if that matches the required meaning of “exact minutes”; otherwise the owner must choose and approve different observable numeric semantics.

## 7. Implementation Impact

- Frontend: no API behavior change; keep displayed/returned minute values numeric.
- Backend: change the Prisma field to `Float`; do not round or convert through strings.
- Database: add a migration using `ALTER COLUMN ... TYPE DOUBLE PRECISION USING available_minutes_per_week::double precision` and preserve all existing integer values exactly.
- Migration rollback: casting back to `INTEGER` is safe only while all values are integral and in the PostgreSQL `INTEGER` range. After fractional rows are written, do not cast and discard them; retain the new column type with compatible code or restore a database backup.
- AI: confirm the existing input schema accepts the same finite numeric value; do not change contract schemas.
- Tests: cover `0.001` hours (0.06 minutes), `1.3333` hours, integer inputs, and a large finite input across validate → generate → preview → apply → current-plan readback. Assert PostgreSQL returns the same JavaScript number. Verify existing integer rows remain exact after migration. Add a characterization test for multiplication overflow without changing request behavior.
- Deployment: deploy the migration before API code that writes `Float` values.

## 8. Verification Required

- [ ] Frozen behavior/API and baseline hashes remain unchanged.
- [ ] Migration preserves every existing integer minute value exactly.
- [ ] Finite normalized values round-trip through PostgreSQL to the same JavaScript `number`.
- [ ] API/OpenAPI contract and AI input schema remain compatible.
- [ ] Rollback instructions avoid lossy integer casts after fractional values exist.
- [ ] Relevant tests, integration tests, build, and baseline hash check pass.

## 9. Decision

**Decision:** PENDING HUMAN REVIEW
