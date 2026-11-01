# Realistic Seed Data Design

## Intent

Expand the local development seed into a realistic learning environment for Student and Teacher flows while preserving rows already present in PostgreSQL.

## Goals

- Keep current demo accounts and their current progress unchanged.
- Add eight active Students, one Teacher, one Class, and source learning data using stable IDs.
- Provide three Class profiles: generally strong results, rule-detectable learning concerns, and insufficient learning data.
- Include varied assessment histories, current/completed/archived plans, task completion, overdue and near-due tasks, and Students without plans.
- Let existing backend rules derive metrics and Teacher AI inputs from AssessmentResult and StudyTask records.

## Non-goals

- No schema, API, AI-result, frontend, or baseline changes.
- No hardcoded aggregate metrics or AI analysis output.
- No reset, truncate, delete, or update of existing learning data or user progress.

## Approaches

1. **Update existing fixtures:** simple, but reruns overwrite existing progress and account fields; rejected because PostgreSQL already contains user data.
2. **Insert-only fixed-ID fixtures:** create missing records and skip conflicts, preserving all existing rows; selected because it is idempotent and does not reset progress.
3. **Separate fixture command/database:** stronger isolation, but adds a second workflow and is unnecessary for the requested local seed.

## Selected design

Convert seed writes to create-if-absent behavior (Prisma `createMany` with `skipDuplicates` or equivalent empty-update upserts). Keep the existing two Students, Teacher, two Classes, Course, Topics, and their rows intact. Add eight Students, a second Teacher, and a third Class. Keep all added assessment results, plans, tasks, memberships, and feedback on stable IDs so repeated runs add no duplicates.

Assign the new Students across the existing Classes and the new Class. Seed multiple UTC assessment attempts across several weeks for selected Students, with increasing and decreasing scores. Leave some Students without assessment data and/or plans. Build plans with source tasks whose statuses and due dates naturally produce completion, overdue, near-due, and progress-warning cases under existing backend rules. Do not store precomputed analytics or AI output.

Only create plans and tasks for newly added Students; do not add tasks to existing plans because that would change existing progress. Preserve current Class teacher assignments and existing memberships. Reuse the current MVP Course and Topic records.

## Constraints and verification

- Respect BR-016, BR-017, BR-018, BR-024 through BR-027, BR-031, BR-033 and the DB-DD-006 one-current-plan constraint.
- Run the seed twice without deleting or resetting data; compare the seeded record counts/IDs and inspect Student, Teacher, Class, AssessmentResult, StudyPlan, and StudyTask records in PostgreSQL.
- Run relevant API tests and seed lint/type checks; report any verification not run.

## Builder decisions

- New Student accounts use the existing `SEED_PASSWORD` mechanism and stable `.example.test` emails.
- The new Teacher owns the third Class so both Teacher accounts have a Class context; existing Class assignments stay unchanged.
- New timestamps are UTC instants derived from one seed-time reference so the initial sample has current, near-due, and overdue tasks; reruns do not update them.
- Existing duplicate IDs or unique keys are left untouched, even if their values differ from this design.
