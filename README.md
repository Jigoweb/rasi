# RASI - Collecting Society Management System

RASI is a Next.js application for managing collecting society workflows: artists, works, programming schedules, identification campaigns and operational dashboards.

## Stack

- Next.js App Router, React, TypeScript.
- Tailwind CSS and shadcn-style UI components.
- Supabase for Postgres and Auth.
- Node/Express worker in `server/` for long-running jobs.
- Jest for frontend unit tests.

## Quick Start

```bash
npm install
npm --prefix server install
cp .env.example .env.local
cp server/.env.example server/.env
npm run dev
```

For the worker:

```bash
npm --prefix server run dev
```

See `docs/DEVELOPMENT.md` for full setup, env, database and verification instructions.

## Project Map

- `src/app`: Next.js routing, layouts, route-level composition and API routes.
- `src/features`: feature-owned domain services, hooks and complex UI.
- `src/shared`: reusable UI, contexts, libraries and utilities.
- `server`: Node worker for long-running operations.
- `supabase/migrations`: database migrations.
- `docs`: project documentation, plans and audits.

## Verification

The full local verification command is:

```bash
npm run verify
```

The combined script runs the frontend checks, production build, worker typecheck and worker tests.
Before the Task 7 baseline is resolved, `npm run verify` may still fail on known lint or build baseline issues. If that happens, consult `docs/codebase-audit/2026-06-23-baseline.md` and use the narrower commands below to isolate the failing check:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm --prefix server run typecheck
npm --prefix server test
```

## Cast esterno IMDb

Sulla scheda opera il cast non RASI si salva in `cast_esterno` (nome libero, personaggio, ruolo). Non crea una scheda artista. Per ogni nome, RASI o non RASI, il ruolo in scheda è uno tra Attore primario, Attore comprimario, Doppiatore primario e Doppiatore comprimario. I ruoli RASI restano le righe già presenti in `ruoli_tipologie` (in produzione `RUO_1`–`RUO_4`); in interfaccia compaiono con queste etichette. Il pulsante «Scarica cast da IMDb» riusa `/api/imdb/title/:id/credits`, che legge OMDb.

Serve `OMDB_API_KEY` (chiave gratuita su https://www.omdbapi.com/apikey.aspx). OMDb non è l’API ufficiale IMDb: restituisce solo gli attori in evidenza, senza personaggio e senza nconst, e li propone come attori primari. Il ruolo si corregge in scheda e resta salvato (non viene riscaricato a ogni apertura). Il cast completo, comprimari inclusi, richiede un piano IMDb a pagamento non configurato in questo progetto: quei nomi si aggiungono a mano. La colonna `cast_esterno.ruolo` arriva con la migration `20261007160000_ruolo_cast_esterno.sql`.

## Documentation

- `docs/README.md`: documentation index.
- `docs/DEVELOPMENT.md`: local setup, env, database, worker and verification.
- `docs/ARCHITECTURE.md`: architecture boundaries and module map.
- `docs/FEATURE_MAP.md`: feature entry points, tests and risks.
- `docs/TESTING.md`: verification commands and test strategy.
- `CONTRIBUTING.md`: contribution rules.
- `AGENTS.md`: AI-agent operating guide.

## License

Private project. All rights reserved.