# SPEC.md - TaskBridge Notification & Audit Service

## Executive Summary

This specification defines the Notification & Audit Service for TaskBridge, a B2B SaaS project collaboration platform. The service provides:

1. **Immutable Audit Logging** — Compliance-grade event tracking with before/after state snapshots
2. **Real-time Notifications** — Event-driven notification dispatch to team members
3. **Multi-tenant Data Isolation** — Strict org-level access control
4. **Queryable Audit History** — Time-range and event-type filtered retrieval

**Scope:** Notification & Audit Service, integrated with existing Project Service
**Technology Stack:** TypeScript/Node.js, Express.js, Prisma ORM, PostgreSQL
**Timeline:** 120-minute implementation with full test coverage

---

## 1. Audit Log Model

### Schema
```prisma
model AuditLog {
  // Primary Key
  id              String    @id @default(cuid())
  
  // Tenant Isolation
  orgId           String    // Organization (required for data isolation)
  
  // Event Details
  eventType       String    // Enum: PROJECT_CREATED, PROJECT_UPDATED, PROJECT_DELETED, PROJECT_STATUS_CHANGED, MILESTONE_REOPENED
  entityType      String    // 'Project', 'Milestone', 'Task', etc.
  entityId        String    // ID of the changed entity
  
  // Actor Information
  actorUserId     String    // Who made the change
  actorOrgId      String    // Actor's organization (must equal orgId for integrity)
  actorEmail      String?   // Actor email for readability
  actorIpAddress  String?   // IP address (nullable, added in scope change)
  
  // State Snapshots
  beforeState     Json      // Complete previous state (null on CREATE)
  afterState      Json      // Complete new state (required)
  changeDescription String?  // Human-readable summary
  
  // Immutability & Audit Trail
  createdAt       DateTime  @default(now()) @db.Timestamp
  
  // Relations
  organization    Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  
  // Indexes for query performance
  @@index([orgId, entityId])        // Find all changes to an entity
  @@index([orgId, createdAt])       // Time-range queries
  @@index([orgId, eventType])       // Event type filtering
  @@unique([id, orgId])             // Enforce org isolation
  
  // Security: Audit table is append-only in application layer
  @@map("audit_logs")
}
```

### Data Integrity Rules
1. **Immutability:** No UPDATE or DELETE operations on audit entries after creation
2. **Org Isolation:** Every query includes `WHERE orgId = ?`
3. **Complete State Snapshots:** `beforeState` and `afterState` must contain full entity representation
4. **Actor Verification:** `actorOrgId` must equal `orgId` (prevent cross-org impersonation)
5. **Timestamp Precision:** `createdAt` captured at UTC
6. **IP Address:** Optional, captured for compliance (see IMPACT_ANALYSIS.md for GDPR considerations)

---

## 2. Notification Model

### Schema
```prisma
model Notification {
  // Primary Key
  id              String    @id @default(cuid())
  
  // Recipient & Tenant
  recipientUserId String    // Who receives this notification
  orgId           String    // Organization (tenant isolation)
  
  // Content
  eventType       String    // PROJECT_CREATED, PROJECT_STATUS_CHANGED, etc.
  projectId       String    // Related project
  message         String    @db.VarChar(500) // Notification body
  
  // Metadata
  actionUrl       String?   // Deep link to related resource
  
  // Read Status
  isRead          Boolean   @default(false)
  readAt          DateTime? // When marked as read
  
  // Timestamp
  createdAt       DateTime  @default(now()) @db.Timestamp
  
  // Relations
  organization    Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  project         Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  // Indexes
  @@index([orgId, recipientUserId, isRead]) // Query unread notifications efficiently
  @@index([orgId, projectId])               // Find notifications for a project
  @@index([createdAt])                      // Recent notifications
  @@unique([id, orgId])                     // Enforce org isolation
  
  @@map("notifications")
}
```

### Rules
1. **Multi-tenant Isolation:** All queries include `orgId` filter
2. **Read Status Tracking:** Timestamps capture when notification was marked read
3. **Soft Expiry:** Notifications never deleted; querying filters by date/read status
4. **Action URLs:** Enable deep linking to relevant resources (project dashboards)

---

## 3. Core Service Logic

### 3.1 Audit Recording

#### AuditService.recordAudit()
```typescript
interface AuditEntry {
  orgId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorUserId: string;
  actorOrgId: string;
  actorEmail?: string;
  actorIpAddress?: string;
  beforeState?: Record<string, unknown>;
  afterState: Record<string, unknown>;
  changeDescription?: string;
}

async recordAudit(entry: AuditEntry): Promise<AuditLog>
```

**Responsibilities:**
- Validate org isolation (actorOrgId === orgId)
- Create immutable audit log entry
- Never update or delete existing entries
- Capture complete state snapshots
- Return created audit entry

**Error Handling:**
- `ValidationError` if `beforeState` === `afterState` (no change)
- `ValidationError` if `actorOrgId` !== `orgId` (org mismatch)
- `ValidationError` if `eventType` invalid
- `InternalServerError` if database write fails

**Example:**
```typescript
await auditService.recordAudit({
  orgId: 'org-123',
  eventType: 'PROJECT_STATUS_CHANGED',
  entityType: 'Project',
  entityId: 'proj-456',
  actorUserId: 'user-789',
  actorOrgId: 'org-123',
  actorEmail: 'alice@company.com',
  actorIpAddress: '192.168.1.1',
  beforeState: { status: 'active', name: 'Q4 Planning' },
  afterState: { status: 'archived', name: 'Q4 Planning' },
  changeDescription: 'Project archived by Alice'
});
```

### 3.2 Notification Dispatch

#### NotificationService.notifyTeamOnProjectChange()
```typescript
interface ProjectChangeEvent {
  projectId: string;
  orgId: string;
  eventType: string;
  message: string;
  actorUserId: string; // Exclude from notifications
  actionUrl?: string;
}

async notifyTeamOnProjectChange(event: ProjectChangeEvent): Promise<Notification[]>
```

**Responsibilities:**
- Query all team members assigned to the project
- Exclude the actor (person who made the change)
- Create notification record for each team member
- Ensure all records include `orgId` for isolation
- Return array of created notifications

**Error Handling:**
- `NotFoundError` if project doesn't exist
- `ValidationError` if required fields missing
- `InternalServerError` if batch insert fails

**Example:**
```typescript
const notifications = await notificationService.notifyTeamOnProjectChange({
  projectId: 'proj-456',
  orgId: 'org-123',
  eventType: 'PROJECT_STATUS_CHANGED',
  message: 'Project "Q4 Planning" status changed to archived',
  actorUserId: 'user-789', // Alice is excluded
  actionUrl: '/projects/proj-456'
});
// Returns notifications sent to all other team members
```

### 3.3 Service Integration: Project Service → Audit & Notification

#### ProjectService.updateProjectStatus()
When a project's milestone status changes:

```typescript
async updateProjectStatus(
  projectId: string,
  newStatus: string,
  userId: string,
  orgId: string
): Promise<Project> {
  // 1. Fetch current project
  const project = await projectRepository.findByIdAndOrg(projectId, orgId);
  if (!project) throw new NotFoundError(`Project ${projectId} not found`);
  
  // 2. Authorize user
  if (!await projectService.userHasAccess(userId, projectId, orgId)) {
    throw new AuthorizationError(`User ${userId} cannot modify project`);
  }
  
  // 3. Store before state
  const beforeState = { ...project };
  
  // 4. Update project
  const updatedProject = await projectRepository.update(projectId, { status: newStatus });
  
  // 5. Record audit entry
  await auditService.recordAudit({
    orgId,
    eventType: 'PROJECT_STATUS_CHANGED',
    entityType: 'Project',
    entityId: projectId,
    actorUserId: userId,
    actorOrgId: orgId,
    beforeState,
    afterState: updatedProject
  });
  
  // 6. Notify team members
  await notificationService.notifyTeamOnProjectChange({
    projectId,
    orgId,
    eventType: 'PROJECT_STATUS_CHANGED',
    message: `Project status changed from ${beforeState.status} to ${newStatus}`,
    actorUserId: userId,
    actionUrl: `/projects/${projectId}`
  });
  
  return updatedProject;
}
```

---

## 4. API Endpoints

### 4.1 Audit Endpoints

#### POST /audit
**Internal endpoint** — Called by Project Service to record audit events

**Authentication:** Service-to-service (internal API key or shared secret)

**Request Body:**
```json
{
  "orgId": "org-123",
  "eventType": "PROJECT_STATUS_CHANGED",
  "entityType": "Project",
  "entityId": "proj-456",
  "actorUserId": "user-789",
  "actorOrgId": "org-123",
  "actorEmail": "alice@company.com",
  "actorIpAddress": "192.168.1.1",
  "beforeState": {
    "id": "proj-456",
    "status": "active",
    "name": "Q4 Planning"
  },
  "afterState": {
    "id": "proj-456",
    "status": "archived",
    "name": "Q4 Planning"
  }
}
```

**Response (201):**
```json
{
  "id": "audit-001",
  "orgId": "org-123",
  "eventType": "PROJECT_STATUS_CHANGED",
  "entityId": "proj-456",
  "actorUserId": "user-789",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Response (400):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "actorOrgId must equal orgId"
  }
}
```

---

#### GET /audit/:projectId
**Query audit history for a project** — User must belong to the project's organization

**Authentication:** JWT token with org context

**Query Parameters:**
- `from` (optional): ISO-8601 start date (e.g., `2024-01-01T00:00:00Z`)
- `to` (optional): ISO-8601 end date (e.g., `2024-01-31T23:59:59Z`)
- `eventType` (optional): Filter by event type (e.g., `PROJECT_STATUS_CHANGED`)
- `limit` (optional): Max results (default 50, max 200)
- `offset` (optional): Pagination offset (default 0)

**Example Request:**
```
GET /audit/proj-456?from=2024-01-01T00:00:00Z&to=2024-01-31T23:59:59Z&eventType=PROJECT_STATUS_CHANGED&limit=20
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "audit-001",
      "orgId": "org-123",
      "eventType": "PROJECT_STATUS_CHANGED",
      "entityType": "Project",
      "entityId": "proj-456",
      "actorUserId": "user-789",
      "actorEmail": "alice@company.com",
      "beforeState": { "status": "active" },
      "afterState": { "status": "archived" },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

**Response (403):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You do not have access to this project's audit log"
  }
}
```

---

### 4.2 Notification Endpoints

#### GET /notifications/:userId
**Get all unread notifications for a user**

**Authentication:** JWT token (can only access own notifications or admin)

**Query Parameters:**
- `isRead` (optional): Filter by read status (`true`, `false`, or omit for all)
- `limit` (optional): Max results (default 20, max 100)
- `offset` (optional): Pagination offset

**Example Request:**
```
GET /notifications/user-789?isRead=false&limit=20
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "notif-001",
      "recipientUserId": "user-789",
      "eventType": "PROJECT_STATUS_CHANGED",
      "projectId": "proj-456",
      "message": "Project 'Q4 Planning' status changed to archived",
      "isRead": false,
      "actionUrl": "/projects/proj-456",
      "createdAt": "2024-01-15T10:30:00Z",
      "readAt": null
    },
    {
      "id": "notif-002",
      "recipientUserId": "user-789",
      "eventType": "PROJECT_CREATED",
      "projectId": "proj-789",
      "message": "New project 'Q1 Planning' created",
      "isRead": true,
      "actionUrl": "/projects/proj-789",
      "createdAt": "2024-01-14T15:22:00Z",
      "readAt": "2024-01-14T15:23:00Z"
    }
  ],
  "pagination": {
    "total": 12,
    "unreadCount": 5,
    "limit": 20,
    "offset": 0
  }
}
```

**Response (401):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired JWT token"
  }
}
```

---

#### PATCH /notifications/:id/read
**Mark a notification as read**

**Authentication:** JWT token (can only mark own notifications as read)

**Request Body:**
```json
{
  "isRead": true
}
```

**Response (200):**
```json
{
  "id": "notif-001",
  "recipientUserId": "user-789",
  "eventType": "PROJECT_STATUS_CHANGED",
  "projectId": "proj-456",
  "message": "Project 'Q4 Planning' status changed to archived",
  "isRead": true,
  "readAt": "2024-01-15T10:35:00Z"
}
```

**Response (404):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Notification not found"
  }
}
```

---

## 5. Multi-Tenant Data Isolation

### Isolation Strategy

**Every query must include the `orgId` filter to prevent cross-org data leakage.**

```typescript
// ✅ CORRECT: Org isolation enforced
async getAuditHistory(projectId: string, orgId: string): Promise<AuditLog[]> {
  return await prisma.auditLog.findMany({
    where: {
      entityId: projectId,
      orgId: orgId // REQUIRED
    }
  });
}

// ❌ WRONG: Missing org filter = data leak
async getAuditHistory(projectId: string): Promise<AuditLog[]> {
  return await prisma.auditLog.findMany({
    where: {
      entityId: projectId
      // orgId missing!
    }
  });
}
```

### Enforcement Points

1. **Repository Layer:** All queries parameterized with `orgId`
2. **Service Layer:** Accept `orgId` from authenticated user context
3. **Controller Layer:** Extract `orgId` from JWT token; validate user belongs to org
4. **Database:** Indexes on `(orgId, entityId)` for query efficiency
5. **Tests:** Every test verifies org isolation (attempt cross-org access must fail)

---

## 6. Immutability Enforcement

### Audit Entry Immutability

**Audit entries are append-only. No UPDATE or DELETE operations permitted.**

#### Application Layer Enforcement
```typescript
// ✅ AuditService has NO update() or delete() methods
class AuditService {
  async recordAudit(entry: AuditEntry): Promise<AuditLog> {
    return await auditRepository.create(entry);
  }
  
  async queryHistory(projectId: string, orgId: string, filters: Filters): Promise<AuditLog[]> {
    return await auditRepository.find(projectId, orgId, filters);
  }
  
  // ❌ These methods MUST NOT exist:
  // async updateAuditEntry() {}
  // async deleteAuditEntry() {}
}
```

#### Repository Layer Enforcement
```typescript
// ✅ AuditRepository: CREATE and READ only
class AuditRepository {
  async create(entry: AuditEntry): Promise<AuditLog> {
    return await prisma.auditLog.create({ data: entry });
  }
  
  async find(projectId: string, orgId: string, filters: Filters): Promise<AuditLog[]> {
    return await prisma.auditLog.findMany({
      where: {
        entityId: projectId,
        orgId,
        ...filters
      }
    });
  }
  
  // ❌ No update() or delete() methods
}
```

#### Database Layer Enforcement (PostgreSQL)
```sql
-- Audit table: append-only constraint
-- No UPDATE or DELETE triggers allowed
CREATE TABLE audit_logs (
  id CUID PRIMARY KEY,
  org_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  entity_id CUID NOT NULL,
  actor_user_id CUID NOT NULL,
  before_state JSONB,
  after_state JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(id, org_id),
  FOREIGN KEY(org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Prevent any modification of audit log
CREATE RULE prevent_audit_update AS ON UPDATE TO audit_logs
  DO INSTEAD NOTHING;

CREATE RULE prevent_audit_delete AS ON DELETE TO audit_logs
  DO INSTEAD NOTHING;

-- Index for performance
CREATE INDEX idx_audit_org_entity ON audit_logs(org_id, entity_id);
CREATE INDEX idx_audit_org_date ON audit_logs(org_id, created_at);
CREATE INDEX idx_audit_org_type ON audit_logs(org_id, event_type);
```

---

## 7. Event Types

### Defined Event Types
```typescript
enum AuditEventType {
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_STATUS_CHANGED = 'PROJECT_STATUS_CHANGED',
  PROJECT_DELETED = 'PROJECT_DELETED',
  MILESTONE_REOPENED = 'MILESTONE_REOPENED' // Added in scope change
}
```

### Scope Change: MILESTONE_REOPENED
- **Trigger:** When a project milestone transitions from 'archived' to 'active'
- **Audit Entry:** Captured with full before/after state
- **Notification:** Dispatched to all team members
- **Impact Analysis:** See IMPACT_ANALYSIS.md for implementation sequencing

---

## 8. Error Handling

### Error Codes and HTTP Status

| Error Code | HTTP Status | Scenario |
|-----------|------------|----------|
| VALIDATION_ERROR | 400 | Invalid input (missing field, wrong type, org mismatch) |
| UNAUTHORIZED | 401 | Invalid/expired JWT or missing auth header |
| FORBIDDEN | 403 | User not in org or lacks project access |
| NOT_FOUND | 404 | Audit entry, notification, or project not found |
| CONFLICT | 409 | Duplicate notification or audit entry |
| INTERNAL_ERROR | 500 | Database error, service failure |

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "User-facing error message",
    "details": {
      "field": "orgId",
      "reason": "must equal actorOrgId"
    }
  },
  "requestId": "req-abc-123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 9. Testing Requirements

### Minimum Test Coverage

#### 1. Audit Service Tests
- ✅ Audit entry created correctly with before/after state
- ✅ Audit entry CANNOT be updated or deleted (immutability)
- ✅ Org isolation enforced (actorOrgId must equal orgId)
- ✅ Invalid eventType rejected

#### 2. Notification Service Tests
- ✅ Notifications dispatched to all team members on project change
- ✅ Actor (person making change) excluded from notifications
- ✅ Org isolation enforced on queries
- ✅ Unread notifications filtered correctly

#### 3. Audit Query Tests
- ✅ Audit history query returns correct results for date range
- ✅ Audit history query filtered by eventType returns only matching entries
- ✅ Audit history respects org isolation (unauthorized user cannot access)
- ✅ Pagination works correctly (limit, offset)

#### 4. Integration Tests
- ✅ Project status change triggers audit entry AND notifications
- ✅ Audit entry and notifications created atomically (both or neither)
- ✅ Multi-tenant isolation on integrated flow

---

## 10. Performance Considerations

### Database Indexes
```prisma
// Audit queries by date range
@@index([orgId, createdAt])

// Audit queries by event type
@@index([orgId, eventType])

// Audit queries by entity
@@index([orgId, entityId])

// Notification queries by user
@@index([orgId, recipientUserId, isRead])
```

### Query Optimization
- Use index on `(orgId, createdAt)` for time-range queries
- Use index on `(orgId, eventType)` for event-type filtering
- Paginate large result sets (limit 200 max)
- Lazy-load relationships (don't fetch organization data unless requested)

---

## 11. Scope Change: MILESTONE_REOPENED

### What's Changing
1. **New Event Type:** `MILESTONE_REOPENED` added to AuditEventType enum
2. **New Field:** `actorIpAddress` added to AuditLog model (optional, nullable)
3. **Migration Required:** Database schema update + backfill (no-op)

### Impact Analysis
See **IMPACT_ANALYSIS.md** for:
- Detailed ripple effects across all files
- Security & GDPR implications of IP address capture
- Recommended implementation sequencing
- Backward compatibility verification

---

## 12. Implementation Checklist

- [ ] AuditLog Prisma model created with immutability constraints
- [ ] Notification Prisma model created with org isolation
- [ ] AuditService with recordAudit() and query methods (NO update/delete)
- [ ] NotificationService with notifyTeamOnProjectChange()
- [ ] ProjectService integration: updateProjectStatus() calls Audit + Notification
- [ ] POST /audit endpoint (internal, service-to-service)
- [ ] GET /audit/:projectId endpoint (with date range + eventType filters)
- [ ] GET /notifications/:userId endpoint (with pagination)
- [ ] PATCH /notifications/:id/read endpoint
- [ ] Input validation on all endpoints (Joi)
- [ ] Error handling with specific exception types
- [ ] Multi-tenant isolation verified on all queries
- [ ] Audit immutability enforced (tests confirm no update/delete possible)
- [ ] Tests: ≥6 test cases covering scenarios in Section 9
- [ ] Structured logging (Pino) on all operations
- [ ] Database indexes created for performance
- [ ] API documentation (this SPEC.md)

---

**Version:** 1.0
**Last Updated:** 2024-08-25
**Status:** Ready for Implementation
