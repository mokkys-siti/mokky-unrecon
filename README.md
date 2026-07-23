# Mokky's Unrecon

Internal reconciliation **case management** for Mokky's Pizza & Coffee. Finance
uploads the finished recon Excel; the app creates cases; outlets answer only
their own with a mandatory reason code; finance reviews and closes. The app does
**not** do reconciliation — finance keeps doing that in Excel.

> Status: **Phase 0** (scaffold, auth, roles, one RLS-protected table). Later
> phases (reference data, upload/parse, outlet queue, finance review) are not
> built yet.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres, Auth,
Storage, RLS) · pnpm · Vitest. **RLS is the enforcement layer**; UI role-gating
is convenience only.

## Prerequisites

- Node 20+ and pnpm (`npm i -g pnpm`).
- A Supabase project. Configuration lives in the database via SQL migrations.

## Environment

Copy `.env.example` to `.env.local` and fill in (never commit `.env.local`):

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API (server/seed only) |
| `SUPABASE_ACCESS_TOKEN` | Account → Access Tokens (CLI only) |
| `SUPABASE_DB_PASSWORD` | Database password (CLI push only) |

## Commands

```bash
pnpm dev            # run the app locally
pnpm build          # production build (must be clean, no TS errors)
pnpm lint           # eslint
pnpm seed:users     # create RLS fixture users (service role)
pnpm test           # Vitest RLS suite (direct REST calls per role)
```

## Database (migrations)

Migrations are SQL files in `supabase/migrations/` and are applied **only** via
the CLI — never by hand. On Windows the npm CLI wrapper can fail on paths with
spaces; call the binary directly if `supabase …` errors:

```powershell
$sb = (Resolve-Path "node_modules\.pnpm\@supabase+cli-windows-x64@*\node_modules\@supabase\cli-windows-x64\bin\supabase.exe").Path
& $sb link --project-ref <PROJECT_REF>
& $sb db push
```

## Required manual step — enable the auth hook

The app's role model depends on a **Custom Access Token Hook** that injects the
`app_role` claim into every JWT (see `supabase/migrations/0001_profiles.sql`).
After `db push`, enable it once in the dashboard:

**Authentication → Hooks → Custom Access Token** → enable → select the
`public.custom_access_token_hook` Postgres function → save.

Until this is on, `app_role` is absent from tokens and role-based access fails.
It is declared in `supabase/config.toml` for local dev / `config push`.

## Verifying Phase 0

1. `pnpm build` is clean, no TS errors.
2. `pnpm seed:users` creates the fixture users.
3. `pnpm test` — the profiles RLS suite passes (row isolation, admin read-all,
   no self-escalation, unauthenticated returns nothing).
4. `pnpm dev`, sign in as a fixture user, confirm the role renders from the JWT.
