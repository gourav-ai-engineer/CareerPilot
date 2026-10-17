# CareerPilot Architecture

## Request flow
React/Vite browser → FastAPI REST API → SQLAlchemy → PostgreSQL. JWT bearer tokens identify the current user; every application query must be scoped by that user ID.

## Domain
- User: email, password hash, created timestamp.
- Application: owner, company, role, URL, status, applied date, notes, updated timestamp.
- Reminder: application, scheduled time, sent timestamp/state. Reminder delivery runs outside request handlers in a scheduled worker.

## API contract
- POST /auth/register
- POST /auth/login
- GET /applications?status=&company=&applied_from=&applied_to=&q=
- POST /applications
- GET /applications/{id}
- PATCH /applications/{id}
- DELETE /applications/{id}
- GET /stats
- GET /health

## Security requirements
1. Hash passwords with a modern password-hashing library; never store or log raw passwords.
2. Use expiring JWT access tokens and validate the token on all private routes.
3. Enforce ownership in database queries, including read/update/delete.
4. Validate all request data and cap list sizes.
5. Keep secrets in environment variables; configure production CORS narrowly.
6. Add rate limiting and email verification before a public production launch.

## Delivery phases
1. Foundation: settings, DB, models, container, health endpoint.
2. Auth: register/login/current-user dependency + tests.
3. Applications: CRUD, ownership, filtering, pagination + tests.
4. UI: responsive dashboard, board, forms, filters, charts.
5. Reminders: schema, scheduler/worker, provider integration, idempotency.
6. Quality/deploy: migrations, CI, coverage, live environments, screenshots.
