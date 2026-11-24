# ProjectProof

ProjectProof is a project and professional discovery platform. The repository is an npm-workspaces monorepo with a Next.js web app, an Express API, and a PostgreSQL database schema. Locally, Next.js and Express run as separate development servers. In production, the frontend and Express API are deployed in one Vercel project and share one origin.

## Requirements

- Node.js 20.20+ (Node 22 LTS recommended)
- npm 10+
- A PostgreSQL database, such as Neon

## Configure the database and secrets

In PowerShell, from the project root:

```powershell
Copy-Item .env.example apps/api/.env
```

Edit `apps/api/.env` and set:

- `DATABASE_URL` to a PostgreSQL connection string beginning with `postgresql://` or `postgres://`. Use the pooled connection for the running app.
- `DIRECT_URL` to a direct PostgreSQL connection for Prisma migrations. For a local database, both may use the same URL.
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to separate random values of at least 32 characters.

Do not commit this file. For Neon, copy the connection strings from the Neon dashboard; typically the pooled hostname includes `-pooler`, while the direct connection does not. Keep URL values in quotes in the `.env` file if they contain query parameters.

Apply the schema and populate the development sample data:

```powershell
npm run db:generate -w apps/api
npm run db:migrate -w apps/api -- --name init
$env:SEED_DEMO_PASSWORD = "use-a-unique-local-password"
npm run db:seed -w apps/api
```

The seed command creates sample professional accounts with the password supplied in `SEED_DEMO_PASSWORD`. Use only non-production accounts and a unique password.

## Run locally

```powershell
npm install
npm run dev
```

- Web app: `http://localhost:3000`
- API health: `http://localhost:4000/api/health`

## Deploy frontend and API together on Vercel

1. Import the repository as **one** Vercel project.
2. Set **Root Directory** to `apps/web`. Keep the Next.js framework preset and default build settings.
3. Add these environment variables to Vercel for Production and Preview:
   - `DATABASE_URL` — PostgreSQL pooled connection string for serverless traffic.
   - `DIRECT_URL` — direct PostgreSQL connection string for Prisma migrations.
   - `JWT_ACCESS_SECRET` — unique random value of at least 32 characters.
   - `JWT_REFRESH_SECRET` — a different unique random value of at least 32 characters.
   - `CORS_ORIGIN` — optional; same-origin requests do not require cross-origin access.
4. Leave `NEXT_PUBLIC_API_URL` unset in Vercel. The browser then calls `/api/...` on the same deployment. `apps/web/api/[...path].ts` exposes the Express API as a Vercel Function, while Next.js serves the frontend.
5. Apply Prisma migrations against the production database before enabling registration with `npm run db:deploy -w apps/api`. The project already configures Prisma Client generation as part of the frontend build.

Vercel does not provide the PostgreSQL database; configure Neon or another managed PostgreSQL provider separately. The local Socket.IO server is not started by the Vercel function because serverless functions cannot maintain a persistent WebSocket server. Production realtime messaging will need a hosted realtime provider or a polling-based implementation.

## Implemented foundation

- Public landing, discovery, project, profile, professional, opportunity, search, login, registration, and dashboard route shells.
- One-origin production routing for the Express API and Next.js frontend on Vercel.
- PostgreSQL/Prisma schema and initial migrations.
- Password-hashed registration and login, HTTP-only access/refresh cookies, refresh-token rotation, logout, and authenticated session lookup.
- Paginated project listing and owner-authorized project create, edit, soft-delete, like, and bookmark API routes.
- PostgreSQL full-text project search plus database-backed professional, category, skill, and project matching.
- Public profiles, privacy-controlled public email, and a database-backed project creation form.
- Authenticated profile editor for professional details, public contact privacy, and profile image URLs.
- API input validation, security headers, CORS, and request rate limits.

Database-backed routes require a configured PostgreSQL connection and applied migrations. Google OAuth, email verification, media uploads, messaging, and the remaining social and moderation features are not implemented yet.

## Main web routes

- `/` — landing page
- `/discover` — project discovery
- `/projects/[slug]` — project case study
- `/profile/[username]` — public profile
- `/professionals` — professional directory
- `/opportunities` — opportunity listings
- `/search?q=...` — global search
- `/dashboard` — dashboard shell
- `/dashboard/profile/edit` — edit your professional profile
