# Copilot Prompt Record

The following record is the prompt chain used for the implementation. The exact low-effort generation prompt was required by the assessment and its output is preserved unchanged in `src/projects/unreviewed/`. The Word submission must include authentic screenshots of at least four of these prompts with the Copilot mode indicator and response visible.

| # | Exact prompt | Feature/mode | Technique | Rationale |
|---|---|---|---|---|
| 1 | `Generate a Project model and a Project service with create, update status, get by team, and delete functions. Use a database.` | Chat, Ask | Specificity | Required baseline contractor generation; output was preserved unreviewed. |
| 2 | `Act as a security reviewer. Review #file:src/projects/unreviewed/service.ts for at least eight bugs or risks. Focus on tenant isolation, authorization, persistence, validation, and auditability. Do not edit files.` | Ask + #file | Role-based, constraint | Separate analysis from changes and establish a review baseline. |
| 3 | `Using @workspace and the project instructions, decompose the remediation into model, repository, service, controller, and tests. List contracts before proposing code.` | Ask + @workspace | Decomposition, constraint | Make layer boundaries and contracts explicit before implementation. |
| 4 | `Implement the notification and audit service in small diffs. Audit writes are create-only; every query must include orgId; fan out to every tenant-scoped project member. Add Jest tests for the six required assessment behaviors.` | Agent | Constraint, decomposition | Generate the feature while preserving the security invariants. |
| 5 | `/explain #file:src/notifications/service.ts and identify any business rule that needs human verification.` | Ask + `/explain` | Iterative refinement | Verify generated behavior instead of accepting it blindly. |
| 6 | `/tests #file:src/audit/service.ts covering date range, event type, immutable API surface, and cross-tenant rejection.` | Edit + `/tests` | Few-shot, specificity | Drive focused tests from concrete acceptance cases. |

## Post-Generation Corrections

| Copilot output | Problem found | Correction method | Result |
|---|---|---|---|
| Project state stored in a process-local array | Restarts lose data, concurrent instances diverge, and no tenant boundary exists. | Manual rewrite after Ask review | Prisma-backed project repository with `orgId` predicates. |
| `getByTeam(teamId)` filtered only by team | A team identifier alone is not authorization evidence and could expose another tenant. | Manual correction and focused test | `findByTeam(teamId, orgId)` requires both values. |
| Notification service returned sample user IDs | Notifications could be sent to unrelated users and did not represent real membership. | Edit/Agent follow-up | Repository-backed `ProjectMember` lookup with tenant filtering. |
| Notification fan-out excluded the actor without a membership source | The required recipient set could not be proven. | Manual contract clarification | Every project member is loaded, then only the actor is excluded. |
| Audit surface included only write/query behavior implicitly | Immutability could be weakened by a future update/delete method. | `/tests` plus manual API inspection | Audit repository and service expose create/read only; a test checks absent mutation methods. |
| Authentication fabricated identity from arbitrary bearer text | Any bearer string could create a synthetic user and organization context. | `/fix`-style manual correction | `jsonwebtoken.verify` requires a configured secret and rejects invalid/expired tokens. |
| Project controllers accepted raw request bodies | Invalid names/statuses could reach business logic and database writes. | Edit Mode correction | Joi schemas validate create and update payloads at the HTTP boundary. |
| Initial scope-change response treated IP as a normal nullable field | It omitted privacy, retention, proxy trust, and log-exposure risks. | Ask Mode follow-up and human review | `IMPACT_ANALYSIS.md` documents lawful basis, retention, redaction, and sequencing. |

No screenshot, Copilot response, license detail, or execution result is claimed here unless captured by the associate in a real authenticated IDE session.
