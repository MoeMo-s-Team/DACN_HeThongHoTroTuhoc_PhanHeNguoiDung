# ai/AGENTS.md — AI Runtime Rules

## 1. Scope
These instructions apply to `ai/`.
They extend the root `AGENTS.md` and must not override frozen baseline, Architecture, API Specification, Business Rules, or an approved AI Contract.

## 2. Role of AI
AI is a supporting external component, not the system's source of truth.
The supported path is:

`Frontend → NestJS → AI Gateway → AI Runtime`

Never implement:
- Frontend → AI Runtime;
- AI Runtime → PostgreSQL;
- AI Runtime → direct business mutation.

The backend owns business eligibility, exact metrics, authorization, validation, persistence, and state transitions.

## 3. Runtime Boundary
The MVP AI Runtime is self-managed and runs on Google Colab.
Communicate with NestJS through HTTP/HTTPS JSON.
Runtime URLs and secrets are configuration, not business logic.
Do not hard-code a temporary Colab URL into notebooks, contracts, or application logic.
Do not require the frontend to know AI credentials.

## 4. Input Rules
Accept only the data explicitly supplied by the backend contract.
Do not fetch additional business data from PostgreSQL.
Do not infer missing authoritative values that the backend should calculate.
Minimize input data and never require passwords, password hashes, bearer tokens, database credentials, or unrelated sensitive fields.

If required data is insufficient according to the approved contract/baseline, return the defined insufficient-data result rather than fabricating content.

## 5. Output Rules
Return structured output only.
Output must conform to the approved AI Contract/schema when available.
Backend validation remains mandatory even when the runtime believes the output is valid.

Do not:
- return authoritative metrics that the backend can calculate exactly;
- invent database/resource identifiers;
- invent enum/reference values outside the contract;
- create hidden business rules in prompt text;
- imply that an AI suggestion was already applied.

Important recommendations remain human-in-the-loop where baseline requires confirmation.

## 6. Open AI Design Items
Do not choose the final AI model, prompt structure, output schema, or schema-validation technology as if they were frozen unless the approved AI Contract/ADR has decided them.
If these items are still open, treat them as technical design work and use Proposal Mode where a decision is needed.
A model change is acceptable only when it preserves the approved external contract and business behavior.

## 7. Failure Semantics
An external AI attempt must respect the configured timeout; the baseline architecture sets a maximum of 60 seconds per external attempt.
Distinguish runtime/network failure from:
- insufficient data;
- business ineligibility;
- validation failure;
- invalid/empty structured output.

Do not mutate or persist business state from the AI runtime.
A failed, timed-out, malformed, or invalid AI result must be safe for the backend to reject without damaging existing business data.

## 8. Logging and Privacy
Do not log secrets, bearer tokens, passwords, password hashes, or database credentials.
Do not persist full raw prompts/responses by default.
Keep logs useful for technical debugging without creating a shadow business data store.
Any AI request-log semantics visible to the application are owned by the backend baseline, not by the notebook/runtime.

## 9. Notebook and Contract Discipline
Keep notebooks focused on model/inference/runtime concerns.
Keep reusable request/response schemas or examples under the approved AI contract location when established.
Do not duplicate backend business calculations inside notebooks merely to make demos easier.
Separate mock/fake AI behavior from real inference and never present a fake response as real model inference.

## 10. Verification
Test AI runtime behavior against representative valid and invalid contract payloads.
Cover at least:
- valid structured response;
- insufficient input where applicable;
- malformed/invalid output;
- timeout/provider failure behavior at the integration boundary;
- enum/reference/schema violations once the AI Contract defines them.

Real Colab integration may be unavailable during local development; use mocks/fakes for technical contract testing where appropriate, then verify the real runtime before an AI-dependent demo.

## 11. Escalation
If an AI implementation request would change business behavior, authorization, exact calculations, human-confirmation requirements, API semantics, or allow AI direct data mutation:
- do not implement it;
- identify affected AI/UC/FR/BR/API references;
- use root Proposal Mode;
- wait for an approved upstream change.