# TaskBridge Notification & Audit Service Specification

## 1. Purpose and Scope

TaskBridge is a multi-tenant B2B collaboration platform. The remediated Project Service in `src/projects/` owns project lifecycle changes. The Notification & Audit Service in `src/notifications/` records compliance history and creates notifications for project members. Every request and persistence operation carries organization context; a user must never read or mutate another organization's data.

Technology: TypeScript/Node.js 18+, Express, Prisma, PostgreSQL, Joi, Pino, and Jest.

## 2. Data Models

### Project

| Field | Type | Rules |
|---|---|---|
| `id` | `string` | CUID primary key |
| `orgId` | `string` | Required tenant key; indexed |
| `teamId` | `string?` | Team assignment |
| `name` | `string` | Required, 1-255 characters |
| `description` | `string?` | Maximum 2,000 characters |
| `status` | `string` | `active`, `archived`, or `deleted` |
| `createdBy` | `string` | Authenticated actor |
| `createdAt`, `updatedAt` | `DateTime` | Database-managed timestamps |

`ProjectMember` stores `(orgId, projectId, userId)` with a uniqueness constraint. Notification fan-out reads members using both `projectId` and `orgId`.

### AuditLog

| Field | Type | Rules |
|---|---|---|
| `id` | `string` | CUID primary key |
| `orgId` | `string` | Required tenant key |
| `eventType` | `AuditEventType` | `PROJECT_CREATED`, `PROJECT_UPDATED`, `PROJECT_STATUS_CHANGED`, `PROJECT_DELETED`, or `MILESTONE_REOPENED` |
| `entityType`, `entityId` | `string` | Changed resource identity |
| `actorUserId`, `actorOrgId` | `string` | Actor and asserted tenant; values must match |
| `actorEmail` | `string?` | Optional display value |
| `actorIpAddress` | `string?` | Nullable scope-change field; never logged |
| `beforeState` | `Json?` | Complete prior snapshot; absent on create |
| `afterState` | `Json` | Complete new snapshot |
| `createdAt` | `DateTime` | Database UTC timestamp |

Audit persistence is append-only: the repository exposes `create`, `find`, and `count` only. No update or delete API exists. Tenant/date/event indexes support required queries.

### Notification

`Notification` contains `id: string`, `recipientUserId: string`, `orgId: string`, `eventType: AuditEventType`, `projectId: string`, `message: string` (maximum 500), `actionUrl: string?`, `isRead: boolean` (default false), `readAt: DateTime?`, and `createdAt: DateTime`. Queries always filter by recipient and organization.

## 3. API Contracts

All client endpoints require a verified JWT with `sub` and `orgId` claims. The internal audit endpoint requires the `x-internal-service-token` header matching `INTERNAL_SERVICE_TOKEN`; it is not available to ordinary user requests.

### `POST /api/audit`

Request: `{ orgId, eventType, entityType, entityId, actorUserId, actorOrgId, actorEmail?, actorIpAddress?, beforeState?, afterState, changeDescription? }`.

Response `201`: `{ id, orgId, eventType, entityId, actorUserId, createdAt }`. Invalid fields or `actorOrgId !== orgId` return `400`; persistence failures return `500`.

### `GET /api/audit/:projectId`

Query: `from?: ISO-8601`, `to?: ISO-8601`, `eventType?: AuditEventType`, `limit` default 50/max 200, `offset` default 0. Response: `{ data: AuditLogSummary[], pagination: { total, limit, offset, hasMore } }`. The organization is taken from JWT context, never from the URL.

### `GET /api/notifications/:userId`

The authenticated user may access only their own notifications unless an explicit administrative permission exists. Query supports `isRead`, `limit` default 20/max 100, and `offset`. Response includes notification data and pagination/unread count.

### `PATCH /api/notifications/:id/read`

The authenticated user may mark only their own tenant-scoped notification as read. Response includes `id`, `recipientUserId`, `isRead`, and `readAt`; missing or unauthorized records return `404` or `403`.

## 4. Integration and State Flow

1. An authenticated Project Service request is validated and authorized against `orgId`.
2. The service loads the current project, stores the complete `beforeState`, and performs a tenant-scoped Prisma update or soft delete.
3. It calls `AuditService.recordAudit` with the event, actor, tenant, trusted request IP when available, and complete `afterState`.
4. It calls `NotificationService.notifyTeamOnProjectChange`, which loads project members by both project and organization and creates one notification for each non-actor member.
5. A future production hardening step is a transactional outbox or shared transaction so a project mutation, audit record, and notification batch cannot diverge.

## 5. Constraints and Validation

- No raw SQL or direct Prisma access in controllers/services; repositories own data access.
- All route payloads are validated with Joi; status and event values are allow-listed.
- Tenant identity comes from verified authentication context and is never trusted from arbitrary request body values.
- Audit snapshots are write-once and must show a real state change except where a create event has no prior state.
- IP capture is optional and subject to retention, access-control, privacy, and redaction policy; it must not be written to logs. An archived-to-active transition emits `MILESTONE_REOPENED`.
- Database migrations are additive and existing audit rows remain readable.

## 6. Copilot Assistance and Human Judgment

Copilot helped draft the initial model and API outline, suggest layered TypeScript structure, and refine validation/test prompts. Human review corrected the generated in-memory project store, missing tenant predicates, hard-delete behavior, hard-coded notification recipients, mock authentication, and the privacy implications of IP capture. The exact baseline prompt and subsequent prompts are recorded in `PROMPTS.md`; the implementation was accepted only after manual review and tests were designed around the stated business invariants.
