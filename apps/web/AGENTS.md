# apps/web/AGENTS.md — Frontend Rules

## 1. Scope
These instructions apply to `apps/web/`.
They extend the root `AGENTS.md` and must not override frozen baseline, Architecture, API Specification, Wireframe, or approved ADRs.

## 2. Frontend Responsibilities
Use Next.js + TypeScript for the browser application.
Use Tailwind CSS for styling, TanStack Query for server state, and React Hook Form for forms.
Frontend is responsible for routing, rendering, user interaction, loading/empty/error states, API calls, and local display formatting.

Frontend is not authoritative for:
- authentication or authorization decisions;
- business validation;
- metrics, counts, or calculations;
- state transitions;
- persistence;
- AI eligibility;
- business-rule enforcement.

## 3. API Boundary
Business data must come from the NestJS REST API.
Use the frozen API contract and base path `/api/v1`.
Read the API base URL from `NEXT_PUBLIC_API_BASE_URL`.
Do not access PostgreSQL directly.
Do not call the AI Runtime directly.
Do not create a default Next.js BFF/API proxy only to forward business requests.

Protected business-data fetching is client-side through the shared API client and TanStack Query unless an approved ADR changes the topology.
Attach the Bearer access token through the API client, not ad-hoc in components.
Follow the approved JWT/sessionStorage decision.
On logout, clear token, local user state, and relevant query cache.

## 4. State and Forms
Use TanStack Query for remote/server state.
Use component state or React Hook Form for local interaction/form state.
Use URL/search params when filter state has navigation meaning.
Do not add Redux, Zustand, or another global state library without a demonstrated need and approved technical decision.

Frontend validation is for UX only.
Backend validation remains authoritative.
Never duplicate complex business rules in React components.

## 5. UI and Design System
Follow `docs/architecture/Global UI Design System — Editorial Tech.md`.
Reuse existing components before introducing new variants.

Core visual direction:
- warm cream background;
- deep violet text/borders;
- butter yellow accent;
- deep teal contrast;
- square geometry;
- thin borders;
- spacious editorial layout;
- flat visual language.

Do not introduce:
- gradients;
- glassmorphism;
- neumorphism;
- soft large shadows;
- rounded-card defaults;
- excessive pill UI;
- random colors;
- generic Bootstrap-like dashboard styling.

Keep system data and AI-generated data visually distinguishable.
Use established AI components/states for AI workflows where applicable.

## 6. Screen Behavior
Use UI Sitemap for routes/navigation and Wireframe Specification for screen behavior/state/action.
Do not create new actor-facing screens, actions, or flows unless approved through Proposal Mode.
Implement loading, empty, validation, business-ineligible, and AI-error states according to the relevant wireframe/API behavior.
Do not collapse `INSUFFICIENT_DATA`, business ineligibility, validation errors, and provider/runtime failures into one generic AI error.

API timestamps are ISO 8601/UTC.
Convert timestamps to the user's local browser/device time only for display.

## 7. Security
Menu visibility and route guards are UX, not authorization.
Never rely on frontend role checks as the security boundary.
Never expose database credentials, JWT secrets, AI secrets, or backend-only configuration.
Never place bearer tokens in URLs, DOM content, error messages, or logs.
Avoid rendering untrusted HTML.

## 8. Code Organization
Prefer feature-oriented code under `src/features/`.
Keep reusable visual components under the existing component structure.
Keep API/auth/query/date utilities under focused `lib/` modules.
Do not create `packages/ui` only for theoretical reuse; keep UI components in `apps/web` until a real second consumer exists.
Avoid unrelated refactors while implementing a screen or flow.

## 9. Frontend Verification
For changed frontend behavior, add/update Vitest + Testing Library tests where useful.
Cover important loading, empty, error, form, role-specific, and AI/system-data distinction behavior.
Run relevant checks, then applicable root quality gates.
Run Playwright for critical user-flow changes when the test exists.
Never claim UI behavior is complete from visual inspection alone.

## 10. Escalation
If a requested UI change conflicts with Sitemap, Wireframe, API, Business Rules, or SRS:
- do not silently implement it;
- identify affected Screen/UC/FR/BR/API references;
- use root Proposal Mode;
- wait for an approved change before changing frozen behavior.