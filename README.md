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
│   ├── projects/
│   │   ├── model.ts
│   │   ├── repository.ts
│   │   ├── service.ts
│   │   └── controller.ts
│   ├── notifications/
│   │   ├── model.ts
│   │   ├── service.ts
│   │   └── controller.ts
│   ├── audit/
│   │   ├── model.ts
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
│   ├── projects.test.ts
│   ├── notifications.test.ts
│   ├── audit.test.ts
│   └── integration.test.ts
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── jest.config.js
├── SPEC.md
├── REVIEW.md
├── ARCHITECTURE.md
└── IMPACT_ANALYSIS.md
```

## Features

### Project Service
- Create, update, and delete projects
- Update project milestone status
- Multi-tenant project isolation
- Get projects by team/organization

### Notification & Audit Service
- Real-time notifications on project milestone changes
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
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project
- `GET /projects/team/:teamId` - Get projects by team

### Audit
- `POST /audit` - Record an audit event (internal)
- `GET /audit/:projectId` - Get audit history (with optional filters)

### Notifications
- `GET /notifications/:userId` - Get user notifications
- `PATCH /notifications/:id/read` - Mark notification as read

## Documentation

- `SPEC.md` - Technical specification
- `REVIEW.md` - Code review findings
- `ARCHITECTURE.md` - Architecture documentation
- `IMPACT_ANALYSIS.md` - Scope change impact analysis

## Security & Compliance

- Multi-tenant data isolation enforced
- Input validation on all endpoints
- Audit logging for compliance
- Immutable audit entries
- Role-based access control (RBAC)
- JWT authentication

## License

Proprietary - TaskBridge Inc.
