# Development Guide

## Prerequisites

- Node.js 20 or compatible with the project dependencies.
- npm.
- Access to the Supabase project and environment variables.

## Install

```bash
npm install
npm --prefix server install
```

## Environment

Create local env files from examples:

```bash
cp .env.example .env.local
cp server/.env.example server/.env
```

Never commit `.env`, `.env.local`, `.env.production`, `server/.env`, or real secret values.

`SUPABASE_SERVICE_ROLE_KEY` is for server-side API routes and scripts only. Do not prefix it with `NEXT_PUBLIC_`, do not expose it to client-side code, and do not commit the real value.

## Frontend

```bash
npm run dev
```

Open `http://localhost:3000`.

## Worker

Worker-primary local mode:

```bash
NEXT_PUBLIC_WORKER_URL=http://localhost:8080
npm run dev
npm --prefix server run dev
```

Legacy fallback local mode:

```bash
# Leave NEXT_PUBLIC_WORKER_URL unset.
npm run dev
```

In worker-primary mode, keep the Next.js app and worker running together. In legacy fallback mode, the frontend uses the serverless routes because `NEXT_PUBLIC_WORKER_URL` is absent.

The worker handles long-running operations such as individuazione jobs outside serverless timeouts.
By default it listens on `http://localhost:8080/health`; keep `NEXT_PUBLIC_WORKER_URL` aligned with the worker `PORT`.

## Database

Use `supabase/migrations/` and `db/init/` as the source of database setup context. Do not apply archived SQL or historical setup docs without checking `docs/README.md` and the current migration history.

## Verification

The full local verification command is:

```bash
npm run verify
```

Before the Task 7 baseline is resolved, `npm run verify` may still fail on known lint or build baseline issues. If that happens, consult `docs/codebase-audit/2026-06-23-baseline.md` and use narrow checks while iterating:

```bash
npm run lint
npm run typecheck
npm test
npm --prefix server test
npm run build
npm --prefix server run typecheck
```

Root Jest ignores `server/` because worker tests use Node's `node:test` runner through `npm --prefix server test`.

## Troubleshooting

- If frontend auth fails, verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- If worker delegation fails, verify `NEXT_PUBLIC_WORKER_URL` and worker `PORT`.
- If worker Supabase calls fail, verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- If build fails because env vars are missing, confirm whether the code path requires build-time or runtime env.
