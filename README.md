# CareerPilot

**A focused job-search command center for students and fresh graduates.**

CareerPilot helps you organize applications, track each stage of the hiring funnel, and follow up on time.

## MVP scope
- Email/password registration and login (bcrypt-compatible password hashing, JWT access tokens)
- Private application CRUD with ownership checks
- Workflow statuses: Wishlist, Applied, OA, Interview, Offer, Rejected
- Search and filter by company, status, and applied date
- Follow-up reminders and scheduled email delivery
- Dashboard metrics: total applications, response rate, and status funnel
- Automated tests, CI, Docker Compose, and deployment documentation

## Stack
- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **API:** FastAPI, Pydantic, SQLAlchemy 2, Alembic
- **Database:** PostgreSQL
- **Quality:** pytest, Ruff, GitHub Actions
- **Deployment target:** Vercel (web), Render (API/worker), Neon (Postgres)

## Repository layout
```
backend/
  app/
    api/routes/       # versioned API routes
    core/             # settings, security
    db/               # database session
    models/            # SQLAlchemy models
    schemas/           # request/response validation
  tests/
frontend/
docs/
docker-compose.yml
```

## Local development
Prerequisites: Docker Desktop and Git.

1. Copy `.env.example` to `.env` and replace the development secrets.
2. Start the API and database:
   ```bash
   docker compose up --build
   ```
3. Open API docs at http://localhost:8000/docs and health check at http://localhost:8000/health.

The first implementation milestone establishes the API foundation. Frontend, reminders, analytics, and deployment are delivered in subsequent milestones; do not treat unimplemented items as complete.

## Security notes
- Passwords are stored as password hashes, never plaintext.
- Application routes must require a valid JWT and scope queries to the authenticated user.
- Configure a strong `JWT_SECRET_KEY` outside source control.
- Never commit `.env`, production credentials, or real user data.

## Project status
- [x] Repository plan and architecture
- [x] API configuration, initial models, and health endpoint
- [ ] Auth routes + database migrations
- [ ] Application CRUD + API tests
- [ ] Kanban UI + filters
- [ ] Reminder worker + email provider
- [ ] Analytics dashboard
- [ ] Deployment + screenshots
