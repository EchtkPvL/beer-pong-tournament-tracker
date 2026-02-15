# Beer Pong Tournament Tracker (BPTT)

Full-stack webapp for managing local beer pong tournaments. Admins create events, manage teams, generate brackets, enter results, and control timers. Spectators view live-updating brackets on their phones. A beamer page projects the current state full-screen.

## Features

- **Three tournament modes**: Single Elimination, Double Elimination, Group Phase (round-robin + knockout)
- **Live updates**: SSE-based real-time sync across all clients
- **Beamer view**: Full-screen projection page with bracket, timer, and current matches
- **Bracket generation**: Automatic seeding, bye (Freilos) handling, match progression
- **Timer**: Countdown timer with admin controls, visible on beamer
- **Table scheduling**: Assign matches to tables (manual or auto)
- **Disqualification**: Auto-forfeit propagation through the bracket
- **Bilingual**: German (default) and English

## Tech Stack

- **Next.js 15** (App Router) with Vercel deployment
- **PostgreSQL** via Vercel Postgres (Neon) or local Docker
- **Drizzle ORM** for type-safe database access
- **Tailwind CSS v4** + **shadcn/ui** components
- **next-intl** for i18n (de/en)
- **SSE** for real-time updates

## Local Development

### Prerequisites

- Node.js >= 18.18
- Docker (for local PostgreSQL)

### Setup

```bash
# 1. Clone & install
git clone <repo-url> && cd beer-pong-tournament-tracker
npm install

# 2. Start local PostgreSQL
docker compose up -d

# 3. Configure environment
cp .env.example .env.local
# Default values work for local dev

# 4. Set up database
npm run db:push

# 5. (Optional) Seed sample data
npm run db:seed

# 6. Start dev server
npm run dev
# Open http://localhost:3000
```

### Default credentials

- **Admin login**: `/admin/login`
- **Password**: `admin` (set via `ADMIN_PASSWORD` in `.env.local`)

### Available scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:push` | Push schema to database |
| `npm run db:generate` | Generate migration files |
| `npm run db:migrate` | Run migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed sample tournament data |

## Environment Variables

| Variable | Description | Default (dev) |
|----------|-------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://bptt:bptt@localhost:5432/bptt` |
| `ADMIN_PASSWORD` | Admin login password | `admin` |
| `JWT_SECRET` | Secret for JWT signing | `dev-secret-change-in-production` |
| `NEXT_PUBLIC_VERSION` | Version shown in footer | `dev` |
| `NEXT_PUBLIC_GITHUB_URL` | GitHub link in footer | - |

## Deployment (Vercel)

### How deployment works

Vercel's automatic Git deployments are disabled via `vercel.json` (`ignoreCommand: "exit 0"`). All deployments are handled by the GitHub Actions workflow at `.github/workflows/deploy.yml`.

There are two deployment environments:

| Trigger | Environment | Description |
|---------|-------------|-------------|
| Push to `main` | **Preview** | Automatic preview deploy on every push. Accessible at a stable preview URL (visible in the Vercel dashboard). |
| Push a `v*` tag | **Production** | Production deploy. The tag name (e.g. `v1.0.0`) is baked into the build as `NEXT_PUBLIC_VERSION` and shown in the footer. |

The production job also verifies that the tagged commit exists on the `main` branch — tags on feature branches are rejected.

### Initial setup

1. Push the repo to GitHub
2. Import the project in the [Vercel dashboard](https://vercel.com)
3. Add a **Vercel Postgres** (Neon) database from the Storage tab — this auto-sets `DATABASE_URL`
4. Set environment variables in Vercel project settings:
   - `ADMIN_PASSWORD` — a strong password
   - `JWT_SECRET` — random 32+ character string
   - `NEXT_PUBLIC_GITHUB_URL` — your repo URL
   - Do **not** set `NEXT_PUBLIC_VERSION` — it is injected by CI during the production build
5. Add the required secrets to the GitHub repository (see below)

### Required GitHub Actions secrets

Configure these in your GitHub repo under **Settings > Secrets and variables > Actions**:

| Secret | Description | How to get it |
|--------|-------------|---------------|
| `VERCEL_TOKEN` | Vercel API token | [Vercel Settings > Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Vercel organization/team ID | Run `npx vercel link` locally, then check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Vercel project ID | Same `.vercel/project.json` file after linking |

### Preview deploys

Every push to `main` automatically creates a preview deployment. The preview URL is stable and can be found in the Vercel dashboard under the project's **Deployments** tab. Use this to verify changes before tagging a production release.

### Deploying to production

```bash
# Make sure you're on main with the latest changes
git checkout main
git pull

# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

The workflow will build and deploy automatically. Check progress in the **Actions** tab on GitHub.

### Deploying a hotfix

```bash
# Fix the issue on main
git checkout main
# ... make changes, commit, push ...

# Tag the new commit
git tag v1.0.1
git push origin v1.0.1
```

### Rollback

**Option 1** — Tag an older commit and deploy it:

```bash
git tag v1.0.2 <old-commit-sha>
git push origin v1.0.2
```

**Option 2** — Use Vercel's instant rollback via workflow dispatch:

```bash
gh workflow run deploy.yml
```

This runs `vercel rollback`, which instantly reverts to the previous production deployment without rebuilding.

### What does NOT trigger a production deployment

- Pushing commits to `main` (triggers preview only)
- Pushing commits to any other branch
- Opening, merging, or closing pull requests
- Tagging a commit that is not on `main`

## Project Structure

```
src/
├── app/
│   ├── [locale]/              # i18n routes (de/en)
│   │   ├── page.tsx           # Home: active + past tournaments
│   │   ├── events/[eventId]/  # Public event view + beamer
│   │   └── admin/             # Admin dashboard, login, event management
│   └── api/                   # REST API routes
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── bracket/               # Bracket visualization
│   ├── admin/                 # Admin forms and controls
│   ├── event/                 # Public event components
│   ├── timer/                 # Timer display and controls
│   ├── realtime/              # SSE provider and hooks
│   └── layout/                # Header, footer
├── lib/
│   ├── db/                    # Schema, connection, queries
│   ├── tournament/            # Bracket generation, match progression
│   ├── auth/                  # JWT session management
│   └── realtime/              # SSE stream, event logging
└── middleware.ts              # Locale routing + admin auth
```

## License

[AGPL-3.0](LICENSE)
