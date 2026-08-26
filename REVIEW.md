# Project Service Review

## Review Scope and Method

The contractor output is preserved unchanged in `src/projects/unreviewed/`. I inspected its data model, state ownership, persistence boundary, authorization assumptions, input handling, and failure modes. Copilot Ask Mode and `/explain` were intended as review aids; findings below are based on manual verification against the multi-tenant requirements. The remediated implementation is in `src/projects/`.

## Findings

| # | Location | Category | Severity | Issue and impact | Detection | Fix |
|---|---|---|---|---|---|---|
| 1 | `src/projects/unreviewed/service.ts`, module state | Architecture | Critical | In-memory global array loses data on restart and mixes all tenants in one process. | Manual review | Prisma-backed repository with `orgId` predicates. |
| 2 | `src/projects/unreviewed/service.ts`, `create` | Security | Critical | No organization context or authorization boundary; any caller can create data for any team. | Ask Mode security review plus manual review | Derive org from authenticated context and validate membership. |
| 3 | `src/projects/unreviewed/service.ts`, `getByTeam` | Security | High | Team lookup has no organization filter, enabling cross-tenant exposure if IDs collide or are guessed. | `/explain` and manual review | `findByTeam(teamId, orgId)` always filters both values. |
| 4 | `src/projects/unreviewed/service.ts`, `updateStatus` | Standards/Bug | High | Arbitrary status strings are accepted and missing projects silently return `undefined`. | Manual review | Typed status union, validation, `NotFoundError`. |
| 5 | `src/projects/unreviewed/service.ts`, `delete` | Architecture | High | Hard delete prevents audit consumers from reconstructing state and has no tenant check. | Ask Mode architecture review | Soft delete plus append-only audit event. |
| 6 | `src/projects/unreviewed/model.ts` | Standards | Medium | Model has no timestamps, creator, organization, or database mapping. | Manual review | Prisma model with tenant, actor, timestamps, indexes, and constraints. |
| 7 | `src/projects/unreviewed/service.ts`, all methods | Standards | Medium | No typed request contracts, validation, structured logging, or specific errors. | `@workspace` review | Typed service inputs, Joi boundary validation, Pino logging, domain errors. |
| 8 | `src/projects/unreviewed/service.ts`, `id` generation | Performance/Integrity | Medium | `Date.now()` can collide under concurrent writes and is not a database key. | Manual review; Copilot did not flag it | Prisma `cuid()` primary key. |
| 9 | `src/projects/unreviewed/service.ts`, module state | Reliability | High | Concurrent requests mutate shared process state without transactions or durable consistency. | Manual review | Database writes and explicit integration sequencing. |

## Architectural & Security Issues Copilot Introduced That Required Human Judgment

1. The generated service treated an in-memory array as a database-backed service. A code assistant can satisfy method names and happy-path behavior without knowing that restart loss and process-local state violate a durable microservice contract.
2. The `getByTeam` method omitted the tenant boundary. This is a business security invariant, not a syntax error; a human must recognize that team identifiers are not sufficient authorization evidence in a B2B SaaS system.
3. The generated delete operation erased state without considering compliance or downstream audit consumers. The product requirement requires reconstructable history, so deletion semantics needed domain judgment.

These defects are especially risky because other services would treat the Project Service as an authority. A wrong authorization or lifecycle decision would be propagated to notifications and audit records, making a local defect a cross-service data leak or compliance failure.

## Remediation Summary

`src/projects/` applies the required model/repository/service/controller layering, Prisma access, tenant predicates, validation, typed status values, structured logging, and audit/notification integration. The notification service now obtains recipients from tenant-scoped project membership rather than hard-coded users; deletion and milestone reopen transitions also produce notifications and audit events.
