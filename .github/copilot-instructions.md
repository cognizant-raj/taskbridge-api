# GitHub Copilot Instructions for TaskBridge API

## Project Overview
TaskBridge is a B2B SaaS project collaboration platform with a multi-tenant architecture. This document defines standards, conventions, and security rules that Copilot should follow for all code generation and assistance.

---

## 1. Technology Stack

### Core Stack
- **Language:** TypeScript (strict mode required)
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Testing:** Jest with supertest
- **Code Quality:** ESLint, Prettier
- **Environment:** dotenv

### Key Dependencies
```json
{
  "express": "^4.18.0",
  "prisma": "^5.0.0",
  "@prisma/client": "^5.0.0",
  "typescript": "^5.0.0",
  "jest": "^29.0.0",
  "supertest": "^6.3.0",
  "dotenv": "^16.0.0",
  "pino": "^8.0.0",
  "joi": "^17.0.0"
}
```

---

## 2. Architecture Conventions

### Layered Architecture (Mandatory)
Every service must follow the strict layered pattern:

```
Controller/Route (HTTP layer)
    ↓
Service (Business logic)
    ↓
Repository (Data access)
    ↓
Model (Database schema via Prisma)
```

### File Structure per Service
```
src/
├── [service-name]/
│   ├── model.ts           # Prisma schema snippets + types
│   ├── repository.ts      # Data access layer (Prisma client)
│   ├── service.ts         # Business logic only
│   ├── controller.ts      # HTTP route handlers
│   ├── types.ts           # Service-specific types
│   └── middleware.ts      # Service-specific middleware
├── shared/
│   ├── logger.ts          # Structured logging (Pino)
│   ├── errors.ts          # Custom error classes
│   ├── middleware.ts      # Auth, validation, CORS
│   └── validation.ts      # Input validation schemas (Joi)
└── types/
    └── index.ts           # Global types
```

### Key Architectural Rules
- **NO direct Prisma imports in controllers** — all DB access through repository layer
- **NO business logic in controllers** — controllers only handle HTTP
- **NO database queries in services** — all queries through repository
- **NO raw SQL** — use Prisma query builder only
- **NO circular dependencies** — layers flow downward only
- **Type safety throughout** — zero `any` types except in explicit escape hatches

---

## 3. Coding Standards

### TypeScript & Type Annotations

#### Naming Conventions
```typescript
// Classes and Types: PascalCase
class ProjectService {}
interface IUser {}
type ProjectStatus = 'active' | 'archived' | 'deleted';

// Variables, functions, parameters: camelCase
const projectId = '123';
function createProject() {}
const myVariable: string = 'value';

// Constants: UPPER_SNAKE_CASE
const MAX_PROJECTS_PER_ORG = 50;
const DATABASE_URL = process.env.DATABASE_URL!;

// Booleans: is/has prefix
const isActive = true;
const hasPermission = false;
```

#### Type Annotations (Always Required)
```typescript
// ✅ CORRECT: All parameters and returns typed
async function createProject(
  orgId: string,
  data: CreateProjectInput
): Promise<Project> {
  // implementation
}

// ❌ WRONG: Missing types
async function createProject(orgId, data) {
  // implementation
}

// ✅ No 'any' types
function processData(data: Record<string, unknown>): void {}

// ❌ Avoid 'any'
function processData(data: any): void {}
```

#### Interfaces vs Types
```typescript
// Interfaces: For object shapes and contracts
interface IRepository {
  find(id: string): Promise<Entity | null>;
  create(data: CreateInput): Promise<Entity>;
}

// Types: For unions, intersections, primitives
type ProjectStatus = 'active' | 'archived' | 'deleted';
type ApiResponse<T> = Success<T> | ErrorResponse;
```

### Function & Method Standards

#### Documentation (JSDoc Required)
```typescript
/**
 * Create a new project within an organization.
 * 
 * @param orgId - The organization ID (must exist)
 * @param data - Project creation payload
 * @returns The created project
 * @throws ValidationError if input is invalid
 * @throws AuthorizationError if user lacks permission
 */
async function createProject(
  orgId: string,
  data: CreateProjectInput
): Promise<Project> {
  // implementation
}
```

#### Pure Functions Over Side Effects
```typescript
// ✅ Pure function
function calculateProjectStatus(startDate: Date, endDate: Date): 'ontrack' | 'delayed' {
  return startDate > endDate ? 'delayed' : 'ontrack';
}

// ❌ Side effect without clear separation
function getProjectStatus(project: Project): 'ontrack' | 'delayed' {
  logger.info(`Checking status for ${project.id}`); // Side effect in business logic
  return startDate > endDate ? 'delayed' : 'ontrack';
}
```

#### Error Handling
```typescript
// ✅ Specific error types
try {
  const project = await projectRepo.findById(id);
  if (!project) throw new NotFoundError(`Project ${id} not found`);
} catch (error) {
  if (error instanceof NotFoundError) {
    logger.warn(`Project not found: ${id}`);
  } else if (error instanceof ValidationError) {
    logger.error(`Validation failed: ${error.message}`);
  } else {
    logger.error(`Unexpected error: ${error.message}`);
    throw new InternalServerError('Failed to fetch project');
  }
}

// ❌ Generic error catching
try {
  // implementation
} catch (error) {
  console.log(error); // Bad: no specific handling
  throw error;
}
```

### Logging Standards (Pino)

```typescript
import { logger } from '../shared/logger';

// Structured logging with context
logger.info({ userId, projectId, action: 'project.created' }, 'Project created');
logger.warn({ userId, attempt: 3 }, 'Failed login attempt');
logger.error({ error: error.message, stack: error.stack }, 'Database error');

// ❌ NO console.log
console.log('Something happened'); // FORBIDDEN

// ✅ Correct levels
logger.trace('Detailed execution flow'); // Dev only
logger.debug('Variable values during execution');
logger.info('General application flow');
logger.warn('Warning conditions (recoverable)');
logger.error('Error conditions (unrecoverable)');
```

### Code Comments
```typescript
// ✅ Comment the 'why', not the 'what'
// We limit to 50 projects per org to prevent resource exhaustion in shared database
const MAX_PROJECTS = 50;

// ❌ Don't comment obvious code
const MAX_PROJECTS = 50; // Set max projects to 50
```

---

## 4. Security Rules (CRITICAL for B2B SaaS)

### Multi-Tenant Data Isolation (NON-NEGOTIABLE)
Every query MUST include organization/tenant filtering:

```typescript
// ✅ CORRECT: Always filter by organization
async function getProjectsByTeam(teamId: string, orgId: string): Promise<Project[]> {
  return await prisma.project.findMany({
    where: {
      teamId,
      organization: { id: orgId } // Always include org filter
    }
  });
}

// ❌ DANGEROUS: Missing org filter = data leak
async function getProjectsByTeam(teamId: string): Promise<Project[]> {
  return await prisma.project.findMany({
    where: { teamId } // Could leak data across orgs!
  });
}
```

### Authentication & Authorization
```typescript
// ✅ Verify auth on every route
app.get('/projects/:id', 
  authenticateJWT, // Extract user from token
  authorizeOrgAccess, // Verify user belongs to org
  projectController.getProject
);

// ❌ Routes without auth
app.get('/projects/:id', projectController.getProject); // FORBIDDEN
```

### Input Validation (MANDATORY)
```typescript
import Joi from 'joi';

// ✅ Validate all inputs at controller boundary
const createProjectSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().max(2000).optional(),
  orgId: Joi.string().uuid().required(),
  status: Joi.string().valid('active', 'archived').default('active')
});

app.post('/projects', async (req, res) => {
  const { error, value } = createProjectSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  // use validated value
});

// ❌ No validation
app.post('/projects', async (req, res) => {
  const project = await createProject(req.body); // Dangerous!
});
```

### Immutable Audit Entries (ENFORCEMENT RULE)
```typescript
// ✅ Audit entries: INSERT ONLY, no updates/deletes
async function recordAudit(entry: AuditEntry): Promise<AuditLog> {
  return await prisma.auditLog.create({ data: entry });
}

// ❌ NO UPDATE or DELETE on audit tables
// This MUST be enforced at:
// 1. Service layer: no update/delete methods
// 2. Repository layer: no update/delete queries
// 3. Database: PostgreSQL constraints on audit tables
```

### Secrets & Environment Variables
```typescript
// ✅ Load from environment only
const JWT_SECRET = process.env.JWT_SECRET!;
const DB_URL = process.env.DATABASE_URL!;

// ✅ Validate required env vars at startup
if (!JWT_SECRET || !DB_URL) {
  throw new Error('Missing required environment variables');
}

// ❌ Hardcoded secrets
const JWT_SECRET = 'secret123'; // FORBIDDEN

// ❌ Logging secrets
logger.info({ token: req.headers.authorization }, 'Request'); // FORBIDDEN
```

### SQL Injection Prevention
```typescript
// ✅ Always use Prisma parameterized queries
const users = await prisma.user.findMany({
  where: { name: userInput } // Prisma handles escaping
});

// ❌ NEVER concatenate strings into queries
const query = `SELECT * FROM users WHERE name = '${userInput}'`; // FORBIDDEN
```

---

## 5. Testing Expectations

### Test Structure
```typescript
describe('ProjectService', () => {
  let service: ProjectService;
  let repository: ProjectRepository;

  beforeEach(() => {
    repository = new MockProjectRepository();
    service = new ProjectService(repository);
  });

  describe('createProject', () => {
    it('should create a project when valid data provided', async () => {
      const result = await service.createProject('org-1', validData);
      expect(result.id).toBeDefined();
      expect(result.orgId).toBe('org-1');
    });

    it('should throw ValidationError on invalid input', async () => {
      await expect(service.createProject('org-1', invalidData))
        .rejects.toThrow(ValidationError);
    });

    it('should enforce multi-tenant isolation', async () => {
      const project = await service.createProject('org-1', data);
      await expect(service.getProject('org-2', project.id))
        .rejects.toThrow(AuthorizationError);
    });
  });
});
```

### Coverage Targets
- **Unit Tests:** ≥80% coverage
- **Integration Tests:** Happy path + error scenarios
- **E2E Tests:** Critical user workflows

### Test Files Location
```
tests/
├── unit/
│   ├── projects.service.test.ts
│   ├── notifications.service.test.ts
│   └── audit.service.test.ts
├── integration/
│   ├── projects.api.test.ts
│   ├── notifications.api.test.ts
│   └── audit.api.test.ts
└── fixtures/
    └── mock-data.ts
```

---

## 6. Database & ORM Standards (Prisma)

### Schema Design
```prisma
// ✅ Proper schema with constraints
model Project {
  id            String    @id @default(cuid())
  orgId         String    // Foreign key to org
  name          String    @db.VarChar(255)
  status        String    @default("active") // Use enum
  createdAt     DateTime  @default(now()) @db.Timestamp
  updatedAt     DateTime  @updatedAt @db.Timestamp
  createdBy     String    // Track actor
  
  organization  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  
  @@index([orgId]) // Index for query performance
  @@unique([id, orgId]) // Multi-tenant uniqueness
}

model AuditLog {
  id            String    @id @default(cuid())
  orgId         String
  eventType     String
  entityType    String
  entityId      String
  actor         String
  beforeState   Json
  afterState    Json
  createdAt     DateTime  @default(now()) @db.Timestamp
  
  @@index([orgId, entityId])
  @@index([orgId, createdAt]) // For time-range queries
}
```

### Repository Pattern
```typescript
// ✅ Repository handles all Prisma queries
class ProjectRepository implements IProjectRepository {
  async create(data: CreateProjectInput): Promise<Project> {
    return await prisma.project.create({ data });
  }

  async findByIdAndOrg(id: string, orgId: string): Promise<Project | null> {
    return await prisma.project.findFirst({
      where: { id, orgId } // Always include org filter
    });
  }

  // ❌ NO UPDATE/DELETE on audit repositories
}
```

---

## 7. Request/Response Contracts

### Request Validation
```typescript
// ✅ Typed request bodies
interface CreateProjectRequest {
  name: string;
  description?: string;
  teamId: string;
  status?: 'active' | 'archived';
}

interface CreateProjectResponse {
  id: string;
  name: string;
  orgId: string;
  status: string;
  createdAt: string; // ISO-8601 timestamp
}

// ✅ Consistent error responses
interface ErrorResponse {
  error: {
    code: string; // 'VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHORIZED'
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string; // For tracing
}
```

### API Contract Example
```typescript
/**
 * POST /projects
 * 
 * Request:
 * {
 *   "name": "Q4 Planning",
 *   "description": "Q4 2024 project planning",
 *   "teamId": "team-123"
 * }
 * 
 * Response (201):
 * {
 *   "id": "proj-456",
 *   "name": "Q4 Planning",
 *   "orgId": "org-789",
 *   "teamId": "team-123",
 *   "status": "active",
 *   "createdAt": "2024-01-15T10:30:00Z"
 * }
 * 
 * Response (400):
 * {
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Name is required",
 *     "details": { "field": "name" }
 *   }
 * }
 */
```

---

## 8. Service Integration

### Project Service → Notification & Audit Service
```typescript
// When a project milestone is updated:
1. ProjectService.updateStatus() executes
2. Calls AuditService.recordAudit() with before/after state
3. Calls NotificationService.notifyTeam() with event details
4. All three operations complete before returning to client
```

### Event Types
```typescript
type AuditEventType = 
  | 'PROJECT_CREATED'
  | 'PROJECT_UPDATED'
  | 'PROJECT_STATUS_CHANGED'
  | 'PROJECT_DELETED'
  | 'MILESTONE_REOPENED'; // New in scope change
```

---

## 9. Error Handling

### Custom Error Classes
```typescript
class ApplicationError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

class ValidationError extends ApplicationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

class NotFoundError extends ApplicationError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404);
  }
}

class AuthorizationError extends ApplicationError {
  constructor(message: string) {
    super('UNAUTHORIZED', message, 403);
  }
}

class InternalServerError extends ApplicationError {
  constructor(message: string) {
    super('INTERNAL_ERROR', message, 500);
  }
}
```

---

## 10. When Copilot Generates Code

### Accept Copilot Output When:
✅ Following naming conventions exactly
✅ Using proper TypeScript types (no `any`)
✅ Layered architecture respected
✅ Multi-tenant isolation included
✅ Input validation present
✅ Error handling specific (not generic `catch`)
✅ Logging structured (Pino format)
✅ Tests included and passing

### Override Copilot Output When:
❌ Missing type annotations
❌ Hardcoded values (env vars should be used)
❌ Direct Prisma in controllers
❌ Missing org/tenant filter in queries
❌ Generic error handling (`catch(e) {}`)
❌ No validation on inputs
❌ Circular dependencies
❌ SQL concatenation
❌ Audit entries have update/delete methods
❌ Missing JSDoc on public functions

---

## 11. Specific Reminders for This Assessment

### For Project Service Review:
- Look for missing multi-tenant isolation
- Check for hardcoded assumptions
- Verify input validation exists
- Ensure error handling is specific

### For Notification & Audit Service:
- Audit entries MUST be immutable (no update/delete)
- Notification dispatch must reach ALL team members
- State snapshots must be complete (before/after)
- Audit history queries must support date range and event type filters

### For Scope Change (MILESTONE_REOPENED):
- Database migration required for new event type
- IP address capture has GDPR implications
- All queries must still enforce multi-tenant isolation
- Existing audit entries unchanged (backward compatible)

---

## 12. Code Review Checklist (Use Before Submitting)

- [ ] No `any` types
- [ ] All functions have JSDoc
- [ ] Multi-tenant isolation on all queries
- [ ] Input validation on all routes
- [ ] Error handling is specific (not generic)
- [ ] Layered architecture respected
- [ ] No raw SQL or direct Prisma in controllers
- [ ] Logging uses Pino in structured format
- [ ] Tests cover happy path, edge cases, errors
- [ ] No hardcoded secrets or env vars
- [ ] Audit entries immutable (CREATE only)
- [ ] Database indexes on frequently queried fields
- [ ] TypeScript compilation has zero errors
- [ ] All tests passing

---

**Last Updated:** 2024-08-25
**For:** TaskBridge AI-Augmented Software Engineer Assessment
**Copilot Version:** Latest (Copilot Chat + Code Completion)
