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

Vercel does not provide the PostgreSQL database; configure Neon or another managed PostgreSQL provider separately. The local Socket.IO server is not started by the Vercel function because serverless functions cannot maintain a persistent WebSocket server. Dashboard messages currently refresh with authenticated polling, so conversations work in production without a persistent WebSocket provider.

## Implemented foundation

- Public landing, discovery, project, profile, professional, opportunity, search, login, registration, and dashboard route shells.
- One-origin production routing for the Express API and Next.js frontend on Vercel.
- PostgreSQL/Prisma schema and initial migrations.
- Password-hashed registration and login, HTTP-only access/refresh cookies, refresh-token rotation, logout, and authenticated session lookup.
- Paginated project listing and owner-authorized project create, edit, soft-delete, like, and bookmark API routes.
- PostgreSQL full-text project search plus database-backed professional, category, skill, and project matching.
- Public profiles, privacy-controlled public email, and a database-backed project creation form.
- Authenticated profile editor for professional details, public contact privacy, and profile image URLs.
- Administrator dashboard for account moderation, project visibility/removal, report review, opportunities, and categories.
- Google OAuth sign-in/sign-up and signed Cloudinary browser uploads for profile and project images.
- Dedicated dashboard project management, saved-project views, and responsive workspace navigation.
- Hire/collaboration requests, authenticated creator conversations, in-app notifications, and email notification preferences.
- Six-digit, expiring password-reset codes, welcome emails, and activity emails through Resend.
- Public About, How it works, FAQ, and Contact information pages.
- Starter Privacy, Terms, and Copyright notices; legal drafts require operator and jurisdiction review before launch.
- API input validation, security headers, CORS, and request rate limits.

Database-backed routes require a configured PostgreSQL connection and applied migrations. Google OAuth, signed image uploads, email delivery, project reports, and core administrator moderation require their provider credentials and schema migrations to be configured.

### Configure administrator access, Google sign-in, and image uploads

1. Apply the latest schema migration and regenerate Prisma Client from the project root:
   ```powershell
   npm run db:deploy -w apps/api
   npm run db:generate -w apps/api
   ```
2. Register a Google OAuth web client in Google Cloud. Add the exact callback URI `http://localhost:4000/api/v1/auth/google/callback` for local development and your deployed API callback URL for production. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, and `FRONTEND_URL` in the API environment; add the same frontend URL and credentials in Vercel as appropriate. Google OAuth can't complete until Google Cloud has the matching callback URI.
3. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` on the API. The secret stays server-side; the API issues short-lived signed upload parameters, and the browser uploads image files directly to Cloudinary. Supported formats are JPG, PNG, WebP, and AVIF, up to 5 MB.
4. Configure Resend with an API key and a sender address verified for your Resend account. Set `RESEND_API_KEY` and `EMAIL_FROM` in the API environment; emails cannot be delivered until these are set.
5. Create an account and promote that exact email to the first administrator from the project root:
   ```powershell
   npm run admin:promote -w apps/api -- --email=your-account@example.com
   ```
   The target account must already exist and be active. Do not expose the database connection string or promote an account you do not control.
6. Sign in with that account and open `/admin`. The API independently enforces the administrator role; changing the browser UI or calling admin endpoints directly does not grant access. The last active administrator cannot be suspended or demoted.

Administrator reports currently cover projects. Privacy and Terms pages remain draft content and should be reviewed for the operating entity and applicable jurisdiction before launch.

## Main web routes

- `/` — landing page
- `/discover` — searchable project discovery with category, popularity, view-count, and pagination controls
- `/projects/[slug]` — project case study
- `/profile/[username]` — public profile
- `/professionals` — professional directory
- `/opportunities` — opportunity listings
- `/search?q=...` — global search
- `/about` — ProjectProof mission and principles
- `/how-it-works` — creator and discovery guide
- `/faq` — common product questions
- `/contact` — current contact options and support setup note
- `/privacy`, `/terms`, `/copyright` — starter legal information; Privacy and Terms are drafts for review
- `/dashboard` — dashboard shell
- `/dashboard/projects` — manage your projects
- `/dashboard/saved` — saved projects
- `/dashboard/profile/edit` — edit your professional profile
- `/dashboard/requests` — review hire and collaboration requests
- `/dashboard/messages` — message creators after a request is accepted
- `/dashboard/notifications` — review activity and email preferences
- `/forgot-password`, `/reset-password` — request and use a password-reset code
- `/admin` — administrator overview (administrator role required)
- `/admin/users`, `/admin/projects`, `/admin/reports` — account and content moderation
- `/admin/opportunities`, `/admin/categories` — manage public discovery content
