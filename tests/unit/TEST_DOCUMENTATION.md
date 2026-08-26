# Unit Test Documentation

`projects.service.test.ts` verifies tenant context is passed to team lookup. `notifications.service.test.ts` covers equal fan-out to every non-actor project member. `audit.service.test.ts` covers audit creation with actor-IP propagation, append-only service surface, date-range and event-type history filters, and cross-tenant actor rejection. The eight unit cases use injected repository doubles and never require production data. Repository integration tests should run against an isolated PostgreSQL database in CI.
