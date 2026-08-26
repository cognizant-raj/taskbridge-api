# Pull Request: Notification and Audit Service

## Summary
This change remediates the inherited Project Service and adds tenant-safe notification dispatch plus immutable audit history. Project changes capture actor and before/after state, while notifications are created for project members other than the actor. Audit history supports date and event filters, and all repository reads and writes carry organization context.

## AI Tool Disclosure
Copilot Chat Ask, Agent, Edit, `/explain`, `/tests`, `#file`, and `@workspace` were used in the documented prompt chain. The required low-effort project output was accepted only as an unreviewed baseline and preserved under `src/projects/unreviewed/`; the production implementation was reviewed and corrected. Estimated code contribution is 45% AI-assisted and 55% human-authored or corrected. The custom instructions improved consistency, but human review was required for tenant policy, membership semantics, and privacy implications.

## Integration Contract
The Project Service calls audit and notification services with `orgId`, project ID, event type, actor user/org IDs, and complete before/after snapshots. The audit service is append-only; the notification service resolves project members through a tenant-scoped repository query.

## Commit History

The required Conventional Commits story is:

1. `chore: establish project standards` - stack, instructions, configuration, and specification.
2. `docs: preserve and review inherited project service` - baseline evidence and structured findings.
3. `feat: remediate project service architecture` - Prisma repository, validation, authorization, and tenant isolation.
4. `feat: add notification and audit services` - append-only audit and member fan-out integration.
5. `test: add service coverage` - focused project, notification, and audit unit cases.
6. `docs: complete assessment artifacts` - impact, prompts, strategy, architecture, and PR documentation.

Each commit should include a body describing the decision, risk, and validation performed. The current workspace includes the original setup commits; final commit creation requires a configured Git author identity.

## Testing
The unit suite covers tenant-scoped project lookup, notification fan-out, audit creation, actor-IP propagation, immutability surface, date filtering, event filtering, and cross-tenant rejection. Eight unit cases are present. Repository integration tests against isolated PostgreSQL remain a known gap because the local environment has no Node/npm or database runtime installed.

## Risks and Trade-offs
The current coordinated writes can leave project state committed while an audit or notification write fails. A transactional outbox with retry and idempotency keys is recommended before production scale; the current code logs failure and returns a controlled error but does not provide distributed exactly-once delivery.

## Self-Review Checklist

- [x] No hardcoded secrets or PII in source
- [x] Tenant predicates present in repository queries
- [x] Boundary validation and specific errors are used
- [x] Audit repository has no update/delete methods
- [x] Internal audit writes require a service token
- [x] Project deletion and milestone reopen transitions notify and audit
- [x] AI suggestions were reviewed and corrections documented
- [x] Eight focused unit tests are present, covering all six mandatory scenarios
- [ ] PostgreSQL migration and integration test run completed locally
- [ ] Real IDE screenshots captured and embedded in Word submission

## Peer Review Simulation

1. **`src/notifications/service.ts`, dispatch:** Resolve project membership from the authoritative membership store and make the actor-exclusion rule explicit in the API contract. Hard-coded or stale membership can notify the wrong tenant users.
2. **`src/audit/controller.ts`, `POST /audit`:** Restrict this internal endpoint with service authentication and validate the caller is allowed to assert `actorOrgId`. A normal user JWT alone must not allow arbitrary audit forgery.
3. **`prisma/schema.prisma`, audit relation:** Replace cascading deletion of audit records with a retention-safe strategy or database policy. Compliance history should not disappear when a project or organization is removed; this is a domain and operational edge case AI commonly misses.

### AI Blind Spot
The cascade-delete trade-off depends on the organization’s legal retention policy and the meaning of “immutable.” A code assistant can see a syntactically valid relation but usually cannot determine whether erasing historical evidence during tenant deletion violates compliance, so a human must resolve the policy and migration behavior.
