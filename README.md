# TaskBridge API - Notification & Audit Service

A B2B SaaS project collaboration platform with real-time notifications and immutable audit logging for distributed engineering teams.

## Technology Stack

- **Language:** TypeScript/Node.js
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Testing:** Jest
- **Code Quality:** ESLint, Prettier
- **Environment:** dotenv

## Project Structure

```
taskbridge-api/
├── .github/
│   └── copilot-instructions.md
├── src/
│   ├── projects/                 # Remediated Project Service
│   │   ├── model.ts
│   │   ├── repository.ts
│   │   ├── service.ts
│   │   ├── controller.ts
│   │   └── unreviewed/           # Preserved contractor baseline
│   │       ├── model.ts
│   │       └── service.ts
│   ├── notifications/
│   │   ├── model.ts
│   │   ├── repository.ts
│   │   ├── service.ts
│   │   └── controller.ts
│   ├── audit/                    # Audit model/repository/service/controller
│   │   ├── model.ts
│   │   ├── repository.ts
│   │   ├── service.ts
│   │   └── controller.ts
│   ├── shared/
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   ├── middleware.ts
│   │   └── validation.ts
│   ├── types/
│   │   └── index.ts
│   └── app.ts
├── tests/
│   ├── setup.ts
│   └── unit/
│       ├── projects.service.test.ts
│       ├── notifications.service.test.ts
│       ├── audit.service.test.ts
│       └── TEST_DOCUMENTATION.md
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.js
├── SPEC.md
├── REVIEW.md
├── ARCHITECTURE.md
├── IMPACT_ANALYSIS.md
├── PROMPTS.md
├── PR_DESCRIPTION.md
├── TOOL_STRATEGY.md
└── ARCHITECTURE_DIAGRAM.md
```

## Features

### Project Service
- Create, update, and delete projects
- Update project milestone status
- Multi-tenant project isolation
- Get projects by team/organization

### Notification & Audit Service
- Persisted notification records on project milestone changes
- Immutable audit log for compliance
- Audit history queryable by date range and event type
- Track who changed what and when

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

```bash
git clone https://github.com/cognizant-raj/taskbridge-api.git
cd taskbridge-api
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Update .env with your database credentials
```

### Database Setup

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Running the Application

```bash
npm run dev
```

### Running Tests

```bash
npm test
npm run test:coverage
```

## API Endpoints

### Projects
- `POST /projects` - Create a new project
- `GET /projects/:id` - Get project details
- `PATCH /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `GET /projects/team/:teamId` - Get projects by team

### Audit
- `POST /audit` - Record an audit event (internal)
- `GET /audit/:projectId` - Get audit history (with optional filters)

### Notifications
- `GET /notifications/:userId` - Get user notifications
- `PATCH /notifications/:id/read` - Mark notification as read

Authentication uses a JWT containing `sub` and `orgId` claims. Set `JWT_SECRET` before
starting the application; the service rejects missing, invalid, and expired tokens.

The current implementation persists notification records; delivery to WebSocket, email,
or another external real-time transport is intentionally outside this sprint's boundary.

## Documentation

- `SPEC.md` - Technical specification
- `REVIEW.md` - Code review findings
- `ARCHITECTURE.md` - Architecture documentation
- `IMPACT_ANALYSIS.md` - Scope change impact analysis
- `PROMPTS.md` - Copilot prompt chain and corrections
- `TOOL_STRATEGY.md` - Feature usage, scenarios, and limitations
- `PR_DESCRIPTION.md` - Review-ready pull request description

## Security & Compliance

- Multi-tenant data isolation enforced
- Input validation on all endpoints
- Audit logging for compliance
- Immutable audit entries
- Role-based access control (RBAC)
- JWT authentication

## License

Proprietary - TaskBridge Inc.
