# C2 Mock Panel Trade Study: Swagger vs In-App

## Context
Lower environments do not have a live C2 system, but the app still needs realistic integration testing for:
- bases ingest
- squadrons ingest
- aircraft ingest
- happy-path and sad-path behavior

## Options Evaluated
1. Add the mock/stub test surface to Swagger
2. Add the mock/stub test surface directly in the application UI

## Decision Criteria
- workflow fidelity for operator-like testing
- support for multi-entity chained scenarios (base -> squadron -> aircraft)
- quality of sad-path validation (missing fields, conflicts, bad enums)
- engineering effort and maintenance overhead
- discoverability for QA and developers
- governance and contract visibility

## Comparison
| Criterion | Swagger-Integrated Mocking | In-App Mock Panel |
|---|---|---|
| API contract clarity | Strong. Native OpenAPI examples and schema checks. | Medium. Needs separate contract references. |
| Workflow realism | Limited. Endpoint-by-endpoint testing only. | Strong. End-to-end entity flow and UI behavior in one run. |
| Sad-path depth | Medium. Good for status code validation. | Strong. Better for chained failure handling and operator-facing states. |
| User adoption | Medium. Mostly developer-centric. | Strong. QA, integration testers, and operators can all use it. |
| Maintenance cost | Low to medium. Swagger updates plus mock examples. | Medium. UI + fixture/test logic upkeep. |
| Regression signal quality | Medium. Contract-focused only. | Strong. Captures UX, orchestration, and data-state regressions. |
| Setup in lower envs | Simple. If Swagger is already deployed. | Simple once shipped in app; no external docs tooling needed. |

## Findings
- Swagger is best for contract-level verification and quick endpoint probing.
- Swagger is weak for validating full workflows where one ingest affects downstream UI/state.
- The target problem (no live C2 in lower envs) is primarily a workflow and behavior problem, not only a schema problem.
- Therefore, an in-app panel provides materially better test value for the requested base/squadron/aircraft scenarios.

## Recommendation
Use a **hybrid model**, with the **in-app panel as primary**:
1. In-app panel for operational validation:
- run happy/sad suites
- observe app behavior and state transitions
- validate chained entity logic
2. Swagger for API contract governance:
- maintain canonical examples
- verify request/response schema compatibility
- expose endpoint-level troubleshooting surface

## Suggested Implementation Split
- In-app:
  - scenario matrix (happy/sad)
  - fixture profile switcher (offline, contract-replay, degraded link)
  - run history with pass/warn/fail
- Swagger:
  - canonical payload examples for bases/squadrons/aircraft
  - explicit error responses for known sad paths
  - contract drift notes for lower-environment mocks

## Final Decision
If choosing one location only, choose **in-app** for this use case.  
If resources allow both, use **in-app for behavior testing** and **Swagger for contract discipline**.
