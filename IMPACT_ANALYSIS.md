# Scope Change Impact Analysis

Change request: add `MILESTONE_REOPENED` and capture the actor IP address on audit entries.

## Impact Matrix

| Area | Change | Classification |
|---|---|---|
| `src/types/index.ts` | Add event literal and optional `actorIpAddress`. | Additive |
| `src/audit/model.ts` | Expose optional IP field and event type. | Additive |
| `src/audit/service.ts` | Validate and pass IP without logging it. | Additive |
| `src/audit/repository.ts` | Persist IP in create-only insert. | Additive |
| `src/audit/controller.ts` and validation | Accept the event and IP for the internal contract; validate bounded IP text. | Additive |
| `src/projects/service.ts` | Emit `MILESTONE_REOPENED` when the state transition is authorized. | Additive |
| `src/projects/model.ts` | Add or retain the event and actor-IP contract types if exposed by the service. | Additive |
| `src/projects/repository.ts` | Persist and retrieve the new state transition within the tenant boundary. | Additive |
| `src/projects/controller.ts` | Validate the new transition and pass the trusted request IP to the integration contract. | Additive |
| `src/notifications/service.ts` | Dispatch the new event using the existing fan-out path. | Additive |
| `src/notifications/controller.ts` | Accept the event through validated internal/client contracts where applicable. | Additive |
| `src/app.ts` | No route shape change; dependency wiring remains compatible. | No code change |
| `prisma/schema.prisma` | Add nullable `actorIpAddress` and retain event as application enum. | Migration required, backward compatible |
| `SPEC.md`, `ARCHITECTURE.md`, tests | Document contract and add event/IP cases. | Additive |

No existing audit row changes. The migration must be additive and deployed before application writes use the new column.

Implementation status: the event union, IP field, validation, service-token boundary, IP propagation, and archived-to-active event selection are implemented. A PostgreSQL migration must still be generated and applied in the target environment before deployment.

## Security and Compliance Risks

IP addresses are personal data in many jurisdictions. Collection needs a documented lawful basis, purpose limitation, retention period, access control, and deletion/anonymization policy compatible with audit obligations. IP values must not appear in application logs, error payloads, analytics exports, or screenshots. Validate and normalize the value at the boundary, restrict who can query it, encrypt data at rest where available, and avoid trusting an arbitrary forwarded header unless the proxy chain is configured and verified.

## Recommended Sequence

1. Confirm privacy/legal retention and regional requirements.
2. Add an additive migration and generate the Prisma client.
3. Extend the event union, validation, repository insert, service contract, and API documentation.
4. Implement the authorized reopen transition and notification message.
5. Add unit and integration tests for event dispatch, IP persistence, malformed IP rejection, and tenant isolation.
6. Deploy schema first, then application code, and monitor audit write failures.

## How Copilot Assisted This Analysis

Copilot Ask Mode was prompted to enumerate modules affected by a new enum value and nullable audit field. It produced a useful initial checklist but treated IP capture as a simple field addition. Human validation added privacy, proxy trust, retention, redaction, migration ordering, and access-control concerns because those depend on organizational policy and deployment context.
