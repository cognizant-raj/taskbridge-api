# Architecture

1. The Project Service owns project lifecycle state and is the source of authorized changes.
2. The Notification & Audit Service consumes a typed project-change contract.
3. The contract contains `orgId`, project/entity ID, event type, actor identity, and full before/after snapshots.
4. HTTP controllers authenticate requests and validate input at the boundary.
5. Controllers call services and do not import Prisma or contain business rules.
6. Services authorize tenant context, coordinate writes, and emit structured logs.
7. Repositories perform Prisma queries with `orgId` in every tenant-sensitive predicate.
8. Prisma models persist projects, project members, notifications, and append-only audit logs.
9. A project change writes the audit entry and notification batch after the project mutation.
10. Project membership is queried with both project ID and organization ID before fan-out.
11. Audit history supports project ID, event type, date range, limit, and offset filters.
12. Audit repositories intentionally expose create and read only; update/delete are absent.
13. This layering isolates tenant controls and makes service logic unit-testable with repository doubles.
14. The trade-off is coordination across writes; an outbox or transaction boundary is the next scale step.
