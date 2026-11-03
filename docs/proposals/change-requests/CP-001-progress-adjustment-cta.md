# CP-001 — Gate Progress AI Adjustment CTA Until SCR-STU-008 Exists

**Status:** APPROVED  
**Created:** 2026-11-03  
**Author:** Codex  
**Trigger:** FR-STU-008 implementation request

## 1. Summary

Keep the `Điều chỉnh bằng AI` CTA visible in the progress warning, but disable it while FR-STU-009 / SCR-STU-008 is not implemented, instead of navigating to a missing route.

## 2. Reason for Proposal

- [x] Implementation phát hiện conflict giữa requirement và nhu cầu mới.

The user requests that the progress CTA must not navigate to an error page when FR-STU-009 is unavailable. The frozen screen specification currently requires navigation to SCR-STU-008.

## 3. Affected Baseline

| Type | Reference | Current meaning |
|---|---|---|
| Use Case | `UC-STU-008` | Student monitors progress and may enter the AI adjustment flow. |
| Requirement | `FR-STU-008` | Progress page shows backend metrics and slow-progress warning. |
| Requirement | `FR-STU-009` | AI plan adjustment flow; excluded from this implementation request. |
| API | `API-STU-PROGRESS-001` | Read current Student progress; unchanged. |
| Screen | `SCR-STU-007`, `/sinh-vien/tien-do` | Warning includes AI adjustment CTA. |
| Screen | `SCR-STU-008`, `/sinh-vien/ke-hoach-hoc-tap/dieu-chinh` | Destination currently specified for that CTA. |

## 4. Current Baseline Behavior

SCR-STU-007 specifies that selecting `Điều chỉnh bằng AI` navigates to SCR-STU-008. SCR-STU-008 is the UC-STU-009 AI adjustment preview and accept/reject flow.

## 5. Proposed Behavior

When FR-STU-009 / SCR-STU-008 is not implemented, keep the CTA visible but disabled and do not navigate. Once SCR-STU-008 is implemented, the CTA can navigate to its specified route.

## 6. Why Existing Baseline Cannot Satisfy the Request

The frozen route is specified as a working entry point, while the requested implementation explicitly excludes FR-STU-009 and prohibits sending the Student to an error page. Hiding the CTA would also conflict with the request to include it. A disabled CTA changes observable interaction and needs baseline approval.

## 7. Impact Analysis

### Requirements / Use Cases

- `FR-STU-008`, `UC-STU-008`: progress warning remains visible.
- `FR-STU-009`, `UC-STU-009`: no implementation added; route availability determines CTA enablement in a later approved change.

### Business Rules

- No metric, permission, or calculation rule changes.

### API

- No API changes.

### UI / Wireframe

- `SCR-STU-007`: CTA remains visible but is non-interactive until SCR-STU-008 exists.
- `SCR-STU-008`: no screen or route is added by this proposal.

### Database

- No schema or persistence changes.

## 8. Implementation Impact

- Frontend: disabled state and accessible explanation on the progress warning CTA.
- Backend/API/AI/Database: none.
- Tests: verify visible disabled CTA does not navigate; retain navigation test when SCR-STU-008 is implemented.

## 9. Proposed Downstream Updates

- [ ] SRS
- [ ] Business Rules
- [ ] Use Case Diagram
- [ ] Use Case Specification
- [ ] Activity Diagram
- [ ] API Specification
- [ ] UI Sitemap
- [x] Wireframe Specification
- [ ] Architecture
- [ ] AI Contract
- [ ] Database Design
- [x] Test artifacts
- [ ] Khác

## 10. Implementation Decision

**Affected implementation status:** APPROVED FOR IMPLEMENTATION

The requesting user approved the proposed disabled CTA with an explanatory
message on 2026-11-03. Implement the visible disabled control and message;
keep it non-navigable until FR-STU-009 / SCR-STU-008 is implemented.

## 11. Decision

**Decision:** APPROVED

**Reviewer:** Requesting user (conversation approval)  
**Decision Date:** 2026-11-03  
**Notes:** `Điều chỉnh bằng AI` remains visible in the SCR-STU-007 warning, is disabled with an explanation that the feature is not yet available, and has no route behavior. FR-STU-009 is not implemented by CP-001.

