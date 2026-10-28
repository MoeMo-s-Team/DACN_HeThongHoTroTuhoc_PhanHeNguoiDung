# AI Contract v1.0 Schema Pack Release 1 — Traceability

**Status: APPROVED / NORMATIVE downstream companion.** Owner approval: 2026-10-28. This traceability applies to Release 1, not recovered Rev.4.

## Source mapping

| Schema | Contract source | Scope |
|---|---|---|
| `inference-request-envelope.schema.json` | §§6.3, 7 | Generic request fields and open `input` payload; task input is a separate validation step. No `promptVersion` property. |
| `inference-success-envelope.schema.json` | §§6.4, 6.4.1, 7 | Generic success fields, open `output`, runtime metadata. Correlation values are semantically compared with request. |
| `inference-error-envelope.schema.json` | §§6.5–6.6 | Generic runtime error envelope and declared error-code enum. |
| `student-learning-analysis.input.schema.json` | §8.2 | Goal, assessment data, optional progress context. |
| `student-learning-analysis.output.schema.json` | §§8.3–8.4 | Strengths, areas, priority topics, reasons; references and uniqueness are NestJS semantic checks. |
| `student-study-plan-generation.input.schema.json` | §§9.1–9.2 | Goal, available time, planning window, assessments, topics, optional analysis context. |
| `student-study-plan-generation.output.schema.json` | §§9.3–9.4 | Plan title and tasks; nonempty tasks, references, minutes positivity and date-window checks are semantic. |
| `student-study-plan-adjustment.input.schema.json` | §§10.1–10.2 | Current plan/task/progress context; detailed input shape is under-specified. |
| `student-study-plan-adjustment.output.schema.json` | §§10.2–10.3 | Proposed change fields; references, uniqueness, change presence, positive minutes and date-window checks are semantic. |
| `teacher-class-analysis.input.schema.json` | §§11.1–11.2 | Minimized class/student metrics; detailed nested input shape is under-specified. |
| `teacher-class-analysis.output.schema.json` | §§11.2–11.3, 22 | Analysis/recommendations; `studentIds.minItems=1` explicit; IDs and uniqueness are semantic. |
| `admin-feedback-grouping-stage1.input.schema.json` | §§12.1–12.2 | Feedback ID, official tag, rating, content. |
| `admin-feedback-grouping-stage1.output.schema.json` | §§12.2–12.3 | Issue groups; feedback membership/deduplication and empty-group removal are backend semantics. |
| `admin-feedback-summary-stage2.input.schema.json` | §§12.3, 13.1–13.2; API R3 Admin analysis flow/example | Feedback dataset, authoritative totals/statistics, backend-processed groups including computed `count` (approved projection under Erratum 1). |
| `admin-feedback-summary-stage2.output.schema.json` | §§13.2–13.3 | Summary, free-form priority areas and recommendations. |

## Approved nested input mappings

The contract names all 15 schemas but does not fully define several nested input records. Release 1 uses the approved shapes below. The contract leaves some nested input members implicit; the owner accepted these mappings as documented here and in the decision matrix:

| Schema/property | Release 1 shape | Basis/approval |
|---|---|---|
| Student assessment record | `topicId`, `topicName`, numeric `score`, `classification` enum | Request example §6.3; classification values follow the R3/API vocabulary. Exact numeric bounds are not added. |
| Student learning optional inputs | `goal` and `progress` may be omitted or null; only `assessments` is schema-required | Contract §§8.1–8.2 and §18.2 say missing goal does not prevent inference; ProgressView fields follow API §4.6. |
| Study-plan `assessments` | Same assessment record | Reuses the §6.3 example; approved mapping. |
| Study-plan `topics` | `{topicId, topicName}` records | Topic IDs are needed for task references; names are present in the API domain. Exact runtime input record is not listed in §9.2. |
| Study-plan `learningAnalysisContext` | Optional or null; when present, uses FR-STU-004 API result shape including enriched `priorityTopics[].topicName` | Contract §9.1 calls this optional FR-STU-004 output; API §7.4 defines its response. |
| Learning `progress` | Optional or null ProgressView object: completed/total task counts, completion percentage, actual/expected progress, overdue count, slow-progress flag | AI Contract §8 only says progress is optional context; nested fields follow R3 API §4.6. The object is closed (`additionalProperties: false`). |
| Adjustment input | `plan`, `todoTasks`, numeric `actualProgress`, numeric `expectedProgress`, numeric overdue-task count, `goal`, `remainingMinutes` | Prompt/eligibility description in §10; numeric progress/count types follow R3 API §4.6. The owner-approved `plan`/`todoTasks` field names are the selected internal mapping; task item only carries `taskId`. |
| Teacher input | class identifiers/count/averages/rates, topic scores, attention students, progress warnings | Derived from §11.1 and R3 API §4.8. Topic metadata uses the API snapshot spelling `{id,name}`; average/rate fields permit null per §4.8. Detailed runtime input shape is an owner-approved mapping. |
| Feedback tag enum | `AI_PERFORMANCE`, `STUDY_PLAN`, `UI_UX`, `LEARNING_ANALYTICS`, `OTHER` | R3/API feedback vocabulary verified against the frozen API source. |
| Feedback rating bounds | integer 1–5 | R3/API rating domain; approved source trace. |
| Admin Stage 1 → backend → Stage 2 groups | Stage 1 output is `{title,summary,feedbackIds}` with no `count`; backend validates IDs, deduplicates in order, drops empty groups, then computes `count=feedbackIds.length`; Stage 2 receives `{title,summary,feedbackIds,count}` | Contract §12.3 explicitly places backend count calculation between attempts; §13.1 says Stage 2 receives validated groups but omits their field list. API R3 Admin flow and success example expose backend-computed `count` on returned groups. Release 1 includes required integer `count` in Stage 2 input based on that evidence; owner approved this internal projection through Erratum 1. |
| Admin Stage 2 feedback/tag-statistic keys | Reuses Stage 1 feedback record and FeedbackTag keys | §§12–13; counts are backend-authoritative. |
| IDs | strings; no format, pattern, or minimum length imposed | Opaque identifiers in examples; membership checks stay semantic. |

## Validation boundary

Draft 2020-12/Ajv validates JSON shape, required properties, JSON types, enums, `date-time`, and closed object properties. Every schema-defined business object uses `additionalProperties: false`; envelope `input`/`output` are object-typed but their members remain open until task-schema validation. NestJS remains responsible for request/response correlation; authorization and reference membership; uniqueness/deduplication; cross-field time windows; positive business quantities where specified; nonempty task/change minimum content; and `trim().length > 0`. Required text uses `minLength: 1` structurally, while whitespace-only rejection is semantic (§§4.9, 7.1, 18.2).

Contract §18.2 regression coverage: Stage 1 AI output that adds `issueGroups[].count` fails `additionalProperties:false`; Stage 2 input with `issueGroups: []` passes. Stage 2 `count` presence is tested at `/issueGroups/0` as a missing-required error when the backend projection omits it.

The request envelope intentionally omits `promptVersion`; Erratum 1 resolves AI-DD-011 through task registry/capacity profile binding without adding a wire field. The response's `runtime.promptVersion` is metadata and is not a correlation key.

Erratum 1 and CR-003 approve fail-closed handling when a correlated/schema-valid success reports `runtime.promptVersion` different from registry/profile: `502 AI_RUNTIME_FAILURE`, one FAILED `AIRequestLog` for the started attempt, no retry. Required output text blank after trim maps to `502 AI_INCOMPLETE_DATA` with one FAILED log after dispatch. These are approved policy records; this schema runner validates structure and records approved policy fixture metadata but does not implement runtime mapping.

R3 trace anchors are listed per task in AI Contract §§8–13: student learning (`UC-STU-004`, `FR-STU-004`, `BR-034/035/041`); plan generation (`UC-STU-005`, `FR-STU-005`, `BR-021/035/037`); adjustment (`UC-STU-009`, `FR-STU-009`, `BR-028/035/036`); teacher (`UC-TEA-005/006`, `FR-TEA-004/005/006`, `BR-007/018/026/035`); admin grouping (`UC-ADM-004`, `FR-ADM-004`, `BR-013/014/015/035/042/043`); admin summary (`UC-ADM-005`, `FR-ADM-005`, `BR-008/015/042/043`). Release 1 changes no public API shape. CR-003 and Erratum 1 are the approved policy authorities; this schema pack itself implements no runtime behavior.

CR-002 §2 XAI-001/XAI-002 and §3 remain in force: the schemas add no static `maxLength`/`maxItems` capacity workaround, dispatch behavior, or logging rule. The approved public error mappings are in CR-003/Erratum 1, not encoded as schema validation rules. Capacity/profile preflight and the `AIRequestLog` lifecycle remain NestJS responsibilities; Release 1 describes JSON structure at the existing internal runtime boundary.
