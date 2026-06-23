# Codebase Cleanup Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementare la roadmap approvata per rendere RASI piu comprensibile, verificabile e manutenibile per dev umani e agenti AI, procedendo per checkpoint a basso rischio prima di refactor e cleanup branch.

**Architecture:** Il piano parte da inventari e documentazione canonica, poi introduce regole AI/dev e verifiche riproducibili, quindi prepara refactor architetturali mirati senza eseguirli in blocco. I confini rimangono: `src/app` per routing/composizione, `src/features` per dominio e feature UI, `src/shared` per infrastruttura condivisa, `server` per worker e job lunghi.

**Tech Stack:** Next.js App Router, React, TypeScript, Jest, Supabase, Node/Express worker, npm, GitHub Actions.

**Spec di riferimento:** `docs/superpowers/specs/2026-06-22-codebase-cleanup-roadmap-design.md`

**Commit policy:** non eseguire `git commit` a meno che l'utente lo chieda esplicitamente. Ogni task indica comunque un checkpoint logico e i file da includere in un eventuale commit futuro.

---

## File Structure

| File | Responsabilita | Azione |
|------|----------------|--------|
| `docs/codebase-audit/2026-06-23-baseline.md` | Baseline operativa: branch, worktree, verifiche disponibili, rischi iniziali | Crea |
| `docs/codebase-audit/branch-inventory.md` | Classificazione branch locali e decisioni richieste | Crea |
| `docs/codebase-audit/cleanup-candidates.md` | Candidati cleanup file/docs/dipendenze, con stato e rischio | Crea |
| `docs/README.md` | Indice documentazione canonica/storica/piani/runbook | Crea |
| `docs/DEVELOPMENT.md` | Onboarding tecnico per frontend, worker, database, verifiche | Crea |
| `docs/ARCHITECTURE.md` | Mappa architetturale e confini `app/features/shared/server` | Crea |
| `README.md` | Overview aggiornata e link a docs canoniche | Modifica |
| `CONTRIBUTING.md` | Convenzioni reali per sviluppo, branch, PR, test, migrazioni | Modifica |
| `AGENTS.md` | Guida operativa per agenti AI e dev umani | Crea |
| `.env.example` | Variabili ambiente frontend/Next.js senza segreti reali | Crea |
| `server/.env.example` | Variabili ambiente worker senza segreti reali | Crea |
| `package.json` | Script `typecheck`, `verify`, `verify:server` | Modifica |
| `server/package.json` | Script `lint` placeholder operativo solo se tooling presente, oppure documentazione esplicita del typecheck | Modifica solo se necessario |
| `.github/workflows/verify.yml` | CI minima per lint/typecheck/test/build e worker typecheck | Crea |
| `next.config.ts` | Rimuovere `eslint.ignoreDuringBuilds` solo dopo lint verde o decisione esplicita | Modifica in task separato e gated |
| `components.json` | Allineare alias UI solo dopo decisione sul namespace canonico | Modifica in fase architetturale gated |

---

## Esecuzione Consigliata

Procedere in ordine. Dopo ogni task, fermarsi se:

- un comando di verifica fallisce per ragioni non comprese;
- emerge un file sensibile non mappato;
- serve cancellare/spostare documenti storici;
- serve modificare branch, worktree, migrazioni Supabase o workflow individuazioni.

---

### Task 0: Baseline Git E Verifiche Senza Modifiche

**Files:**
- Create: `docs/codebase-audit/2026-06-23-baseline.md`
- Create: `docs/codebase-audit/branch-inventory.md`

- [ ] **Step 1: Controlla stato git e worktree**

Run:

```bash
git status --short
git branch -vv
git worktree list
git log --oneline -n 12
```

Expected:

- output leggibile;
- nessuna modifica applicata;
- branch corrente noto;
- eventuali file non tracciati annotati, non rimossi.

- [ ] **Step 2: Crea la directory audit se assente**

Run:

```bash
mkdir -p docs/codebase-audit
```

Expected: directory esistente.

- [ ] **Step 3: Scrivi `docs/codebase-audit/2026-06-23-baseline.md`**

Contenuto iniziale:

```md
# Codebase Baseline

Data: 2026-06-23
Scope: inventario operativo prima di cleanup e refactor

## Stato Git

- Branch corrente: compilare con `git branch --show-current`.
- Working tree: compilare con `git status --short`.
- Worktree: compilare con `git worktree list`.
- Branch locali: vedere `docs/codebase-audit/branch-inventory.md`.

## Verifiche Disponibili

| Comando | Scopo | Stato baseline | Note |
|---|---|---|---|
| `npm run lint` | ESLint frontend | Non eseguito in questa riga finche non viene avviata la fase di verifica | `next.config.ts` ignora ESLint in build |
| `npm test` | Test Jest frontend | Non eseguito in questa riga finche non viene avviata la fase di verifica | Script presente in `package.json` |
| `npm run build` | Build Next.js | Non eseguito in questa riga finche non viene avviata la fase di verifica | Potrebbe richiedere env |
| `npm --prefix server run typecheck` | Typecheck worker | Non eseguito in questa riga finche non viene avviata la fase di verifica | Script presente in `server/package.json` |

## Rischi Iniziali

- Branch locali multipli da classificare prima del cleanup.
- Worktree attiva da non modificare senza conferma.
- Documentazione setup/env disallineata.
- Pagine dashboard grandi da non refactorare senza test/checklist.
- Workflow individuazioni duplicato da chiarire prima di rimuovere codice legacy.

## Decisioni Aperte

- Branch base del lavoro.
- Percorso UI canonico.
- Percorso individuazioni canonico.
- Formato guida AI: `AGENTS.md`, `.cursor/rules`, o entrambi.
```

- [ ] **Step 4: Scrivi `docs/codebase-audit/branch-inventory.md`**

Contenuto iniziale:

```md
# Branch Inventory

Data: 2026-06-23
Regola: nessun branch viene cancellato, mergiato o ribasato senza approvazione esplicita.

| Branch | Upstream | Stato | Ultimo commit | Worktree | Classificazione proposta | Decisione richiesta |
|---|---|---|---|---|---|---|
| `main` | `origin/main` | compilare da `git branch -vv` | compilare | `/Users/matteo/rasi` | `base-candidate` | Decidere se aggiornare prima del lavoro |
| `develop` | `origin/develop` | compilare da `git branch -vv` | compilare | no | `review` | Verificare i 2 commit ahead |
| `feat/individuazione-resume` | nessuno rilevato | compilare | compilare | no | `archive-or-delete-candidate` | Confrontare con merge storici |
| `feat/individuazione-resume-ux` | nessuno rilevato | compilare | compilare | no | `archive-or-delete-candidate` | Confrontare con merge storici |
| `feat/matching-reliability-optimization` | nessuno rilevato | compilare | compilare | `.worktrees/matching-reliability` | `keep` | Worktree attiva, non toccare |
| `fix/individuazione-stuck-state` | nessuno rilevato | compilare | compilare | no | `review` | Verificare se integrato |
| `fix/resume-batch-timeout` | nessuno rilevato | compilare | compilare | no | `archive-or-delete-candidate` | Verificare se mergeato in `main` |

## Comandi Per Verifica Manuale

```bash
git branch -vv
git log --oneline --decorate --graph --all -n 40
git branch --merged main
git branch --no-merged main
```

## Note

- Le classificazioni sono proposte operative, non autorizzazioni alla cancellazione.
- Ogni delete richiede una conferma separata con nome branch esplicito.
```

- [ ] **Step 5: Verifica solo i file appena creati**

Run:

```bash
git diff -- docs/codebase-audit/2026-06-23-baseline.md docs/codebase-audit/branch-inventory.md
```

Expected: diff limitato ai due documenti.

**Checkpoint:** fermarsi e chiedere conferma se branch/worktree reali differiscono dalla tabella iniziale.

---

### Task 1: Inventario Documenti E Candidati Cleanup

**Files:**
- Create: `docs/README.md`
- Create: `docs/codebase-audit/cleanup-candidates.md`

- [ ] **Step 1: Inventaria documenti principali**

Run:

```bash
rg --files docs | sort
```

Expected: elenco docs completo. Non spostare file.

- [ ] **Step 2: Scrivi `docs/README.md`**

Contenuto iniziale:

```md
# RASI Documentation Index

Questo indice distingue documentazione canonica, piani di lavoro e materiale storico. In caso di conflitto, seguire prima `README.md`, `docs/DEVELOPMENT.md`, `docs/ARCHITECTURE.md`, `CONTRIBUTING.md` e `AGENTS.md`.

## Canonici

- `README.md`: overview del progetto e quick start.
- `docs/DEVELOPMENT.md`: setup locale, env, database, worker e verifiche.
- `docs/ARCHITECTURE.md`: confini architetturali e mappa dei moduli.
- `CONTRIBUTING.md`: convenzioni per dev umani.
- `AGENTS.md`: regole operative per agenti AI.

## Audit E Cleanup

- `docs/codebase-audit/2026-06-23-baseline.md`: baseline operativa.
- `docs/codebase-audit/branch-inventory.md`: stato branch e worktree.
- `docs/codebase-audit/cleanup-candidates.md`: candidati cleanup con rischio.

## Piani E Spec

- `docs/superpowers/specs/`: decisioni e design approvati o in revisione.
- `docs/superpowers/plans/`: piani implementativi task-by-task.

## Documenti Da Classificare

I documenti non elencati sopra vanno classificati prima di essere usati come istruzioni operative. Se contengono fix storici, URL temporanei o riferimenti a stack non piu attuale, trattarli come storico finche non vengono consolidati.
```

- [ ] **Step 3: Scrivi `docs/codebase-audit/cleanup-candidates.md`**

Contenuto iniziale:

```md
# Cleanup Candidates

Data: 2026-06-23
Regola: questo documento non autorizza cancellazioni. Serve a classificare prima di modificare.

## Documentazione

| Percorso | Evidenza | Rischio | Proposta | Gate |
|---|---|---|---|---|
| `README.md` | riferimenti a `.env.example` e SQL non presenti | alto | aggiornare, non archiviare | dopo creazione env examples |
| `CONTRIBUTING.md` | boilerplate e placeholder repo | alto | riscrivere sulle convenzioni reali | dopo `AGENTS.md`/architettura |
| `docs/DATABASE_SETUP.md` | riferimenti a stack storico | medio | classificare come storico o consolidare in `docs/DEVELOPMENT.md` | dopo confronto contenuti |
| `DEPLOYMENT.md` | possibile sovrapposizione deploy | medio | consolidare in guida deploy canonica | dopo inventario deploy |
| `ISTRUZIONI_DEPLOY.md` | possibile runbook storico | medio | archiviare o integrare | dopo inventario deploy |
| `FIX_VERCEL_ENV_VARS.md` | fix storico env | basso | archiviare come storico | dopo verifica link |

## File Locali O Storici

| Percorso | Evidenza | Rischio | Proposta | Gate |
|---|---|---|---|---|
| `supabase_query_demo.py` | script dimostrativo root | medio | verificare uso, poi archiviare o rimuovere | rg referenze |
| `test_supabase_query.py` | test/script locale root | medio | verificare uso, poi archiviare o rimuovere | rg referenze |
| `.trae/` | documenti/tooling esterno | medio | classificare come storico/tooling | conferma utente |
| `.claude/launch.json` | configurazione locale tracciata | medio | verificare se condivisa intenzionalmente | conferma utente |
| `.vercel/project.json` | configurazione Vercel tracciata | alto | non toccare senza decisione deploy | conferma utente |

## Dipendenze Da Verificare

| Package | Evidenza iniziale | Proposta | Gate |
|---|---|---|---|
| `@tanstack/react-table` | uso non confermato nell'audit iniziale | verificare con ricerca e depcheck | non rimuovere senza prova |
| `@supabase/auth-ui-react` | uso non confermato nell'audit iniziale | verificare con ricerca e depcheck | non rimuovere senza prova |
| `@supabase/auth-ui-shared` | uso non confermato nell'audit iniziale | verificare con ricerca e depcheck | non rimuovere senza prova |

## Comandi Di Verifica Prima Di Rimuovere

```bash
rg "supabase_query_demo|test_supabase_query|@tanstack/react-table|@supabase/auth-ui-react|@supabase/auth-ui-shared"
npm exec depcheck
```

`npm exec depcheck` puo richiedere rete/install temporaneo; eseguirlo solo quando si avvia la fase cleanup dipendenze.
```

- [ ] **Step 4: Verifica diff limitato ai docs**

Run:

```bash
git diff -- docs/README.md docs/codebase-audit/cleanup-candidates.md
```

Expected: diff limitato ai due documenti.

**Checkpoint:** non archiviare o cancellare file in questo task.

---

### Task 2: Env Examples E Onboarding Sviluppo

**Files:**
- Create: `.env.example`
- Create: `server/.env.example`
- Create: `docs/DEVELOPMENT.md`

- [ ] **Step 1: Crea `.env.example`**

Contenuto:

```env
# Supabase client-side configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional worker delegation for long-running jobs
NEXT_PUBLIC_WORKER_URL=http://localhost:4000

# Optional external APIs used by matching/import flows
IMDB_API_URL=https://example.com
```

- [ ] **Step 2: Crea `server/.env.example`**

Contenuto:

```env
# Worker server
PORT=4000
NODE_ENV=development

# Supabase server-side configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# CORS origin for local Next.js app
CORS_ORIGIN=http://localhost:3000
```

- [ ] **Step 3: Crea `docs/DEVELOPMENT.md`**

Contenuto:

```md
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

## Frontend

```bash
npm run dev
```

Open `http://localhost:3000`.

## Worker

```bash
npm --prefix server run dev
```

The worker handles long-running operations such as individuazione jobs outside serverless timeouts.

## Database

Use `supabase/migrations/` and `db/init/` as the source of database setup context. Do not apply archived SQL or historical setup docs without checking `docs/README.md` and the current migration history.

## Verification

Current commands:

```bash
npm run lint
npm test
npm run build
npm --prefix server run typecheck
```

After tooling cleanup, prefer:

```bash
npm run verify
```

## Troubleshooting

- If frontend auth fails, verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- If worker delegation fails, verify `NEXT_PUBLIC_WORKER_URL` and worker `PORT`.
- If worker Supabase calls fail, verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- If build fails because env vars are missing, confirm whether the code path requires build-time or runtime env.
```

- [ ] **Step 4: Verifica che esempi env non contengano segreti**

Run:

```bash
rg "eyJ|service_role|supabase.co" .env.example server/.env.example
```

Expected:

- `supabase.co` puo comparire solo come placeholder `https://your-project.supabase.co`;
- nessun JWT o secret reale;
- `your-service-role-key` e placeholder, non segreto reale.

- [ ] **Step 5: Verifica diff**

Run:

```bash
git diff -- .env.example server/.env.example docs/DEVELOPMENT.md
```

Expected: solo i tre file del task.

---

### Task 3: README E CONTRIBUTING Canonici

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

- [ ] **Step 1: Aggiorna `README.md` come overview breve**

Sostituire sezioni obsolete di setup database/env con una struttura compatta:

```md
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

```bash
npm run lint
npm test
npm run build
npm --prefix server run typecheck
```

After tooling cleanup, use `npm run verify`.

## Documentation

- `docs/README.md`: documentation index.
- `docs/DEVELOPMENT.md`: local setup and verification.
- `docs/ARCHITECTURE.md`: architecture boundaries.
- `CONTRIBUTING.md`: contribution rules.
- `AGENTS.md`: AI-agent operating guide.
```

Adattare senza perdere eventuali sezioni business ancora valide.

- [ ] **Step 2: Aggiorna `CONTRIBUTING.md`**

Contenuto target:

```md
# Contributing

## Working Rules

- Check `git status --short` before editing.
- Do not delete branches, migrations, docs or generated files without explicit approval.
- Keep changes scoped to one feature or cleanup phase.
- Prefer small, reviewable pull requests.

## Branches

- Use a dedicated branch for cleanup or refactor work.
- Do not work directly on `main` unless explicitly requested.
- Treat active worktrees as protected.

## Architecture Boundaries

- `src/app`: route composition, layouts and API route entrypoints.
- `src/features`: domain logic, services, hooks and feature components.
- `src/shared`: generic reusable components, contexts, libs and utilities.
- `server`: worker runtime and long-running jobs.

Do not place business logic directly in large route pages when a feature service, hook or component can own it.

## Tests And Verification

Run the narrowest relevant test first, then broader verification:

```bash
npm test
npm run lint
npm run build
npm --prefix server run typecheck
```

When available, use:

```bash
npm run verify
```

## Database And Supabase

- Prefer migrations in `supabase/migrations`.
- Do not modify historical SQL or archived setup files as if they were current instructions.
- Regenerate or update Supabase types when database/RPC surface changes.
- Never commit service-role keys or local env files.

## Documentation

When changing setup, deploy, env, architecture or workflow behavior, update the corresponding canonical doc:

- `docs/DEVELOPMENT.md`
- `docs/ARCHITECTURE.md`
- `docs/README.md`
- `AGENTS.md`
```

- [ ] **Step 3: Verifica link e riferimenti**

Run:

```bash
rg "DATABASE_SETUP|supabase_init|CODE_OF_CONDUCT|your-repo|\\.env\\.example" README.md CONTRIBUTING.md docs/DEVELOPMENT.md
```

Expected:

- nessun riferimento a `supabase_init.sql`;
- nessun placeholder `your-repo`;
- `.env.example` presente solo come file realmente creato;
- `DATABASE_SETUP` presente solo se esplicitamente marcato come storico o rimandato da `docs/README.md`.

**Checkpoint:** se `README.md` contiene contenuto business importante non incluso nello snippet, mantenerlo e integrare la nuova struttura invece di cancellarlo.

---

### Task 4: Guida AI E Architettura

**Files:**
- Create: `AGENTS.md`
- Create: `docs/ARCHITECTURE.md`

- [ ] **Step 1: Crea `AGENTS.md`**

Contenuto:

```md
# Agent Operating Guide

This repository is a Next.js/Supabase application with a separate Node worker. Follow this guide before changing files.

## First Reads

1. `README.md`
2. `docs/DEVELOPMENT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/README.md`
5. The relevant feature folder under `src/features`

## Before Editing

Run:

```bash
git status --short
git branch --show-current
```

Do not revert, delete or overwrite user changes. Do not delete branches or files without explicit approval.

## Boundaries

- `src/app`: routing, layouts, pages and API entrypoints. Keep route files thin.
- `src/features`: domain services, hooks, feature components and feature tests.
- `src/shared`: reusable UI, contexts, utilities and Supabase clients/types.
- `server`: worker runtime and long-running jobs.

## Safe Zones

- Focused docs updates.
- Small tested utilities.
- Feature-owned components and services with nearby tests.
- New audit/planning documents under `docs/codebase-audit` or `docs/superpowers`.

## Caution Zones

- `src/shared/lib/supabase.ts`
- `supabase/migrations`
- `server/src/jobs`
- `src/app/api/campagne-individuazione`
- large dashboard pages under `src/app/dashboard`
- `.vercel/`, deployment configuration and env files

## Verification

Use the narrowest relevant check first:

```bash
npm test
npm run lint
npm run build
npm --prefix server run typecheck
```

When `npm run verify` exists, use it before claiming completion.

## Cleanup Rules

- Classify files before deleting.
- Mark historical docs clearly before moving or removing them.
- Verify references with `rg`.
- Do not remove dependencies without usage search and a dependency check.
- Do not change branch state without explicit approval.
```

- [ ] **Step 2: Crea `docs/ARCHITECTURE.md`**

Contenuto:

```md
# Architecture

## Overview

RASI uses Next.js App Router for the web application, Supabase for database/auth and a separate Node/Express worker for long-running jobs.

## Runtime Areas

| Area | Path | Responsibility |
|---|---|---|
| App Router | `src/app` | routes, layouts, route composition, API entrypoints |
| Features | `src/features` | domain services, hooks, forms and feature UI |
| Shared | `src/shared` | reusable UI, contexts, utilities, Supabase integration |
| Worker | `server` | long-running jobs and APIs outside serverless timeout limits |
| Database | `supabase/migrations`, `db/init` | schema, migrations and initialization context |

## Boundary Rules

- Keep `src/app` pages thin: compose feature components and call feature hooks/services.
- Put feature-specific logic in `src/features/<feature>`.
- Put reusable generic UI in one canonical UI namespace.
- Keep Supabase client/type changes centralized and reviewed.
- Treat worker job orchestration as backend runtime code, not page logic.

## Known Hotspots

- `src/app/dashboard/opere/[id]/page.tsx`
- `src/app/dashboard/programmazioni/page.tsx`
- `src/features/campagne-individuazione/services/campagne-individuazione.service.ts`
- `server/src/jobs/individuazione-runner.ts`
- `src/shared/lib/supabase.ts`
- `src/components/ui` and `src/shared/components/ui`

## Refactor Strategy

1. Add or identify tests/checklists around behavior.
2. Extract pure components first.
3. Extract hooks for page state and effects.
4. Extract feature services/adapters.
5. Verify after every slice.

## Open Decisions

- Canonical UI namespace: `src/shared/components/ui` or `src/components/ui`.
- Canonical individuazione path: worker-only or worker plus serverless fallback.
- Timing for making ESLint blocking in build.
```

- [ ] **Step 3: Link docs together**

Update references:

- `README.md` should link to `AGENTS.md` and `docs/ARCHITECTURE.md`.
- `docs/README.md` should list `AGENTS.md` and `docs/ARCHITECTURE.md`.
- `CONTRIBUTING.md` should reference `AGENTS.md` for AI-specific rules.

- [ ] **Step 4: Verify references**

Run:

```bash
rg "AGENTS.md|docs/ARCHITECTURE.md|docs/DEVELOPMENT.md" README.md CONTRIBUTING.md docs/README.md AGENTS.md docs/ARCHITECTURE.md
```

Expected: all canonical docs cross-linked.

---

### Task 5: Tooling Scripts

**Files:**
- Modify: `package.json`
- Modify: `server/package.json` only if a useful script can be added without introducing new tooling

- [ ] **Step 1: Add root scripts**

Modify `package.json` scripts from:

```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "jest"
}
```

to:

```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "jest",
  "typecheck": "tsc --noEmit",
  "verify:server": "npm --prefix server run typecheck",
  "verify": "npm run lint && npm run typecheck && npm test && npm run build && npm run verify:server"
}
```

- [ ] **Step 2: Decide whether to modify `server/package.json`**

Current server scripts:

```json
{
  "dev": "tsx watch src/index.ts",
  "start": "tsx src/index.ts",
  "typecheck": "tsc --noEmit"
}
```

Do not add `lint` unless server lint tooling is configured. If no server lint config exists, leave this file unchanged and document that worker verification is currently `typecheck`.

- [ ] **Step 3: Verify package JSON syntax**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); JSON.parse(require('fs').readFileSync('server/package.json','utf8')); console.log('json ok')"
```

Expected:

```text
json ok
```

- [ ] **Step 4: Run typecheck only after script is added**

Run:

```bash
npm run typecheck
```

Expected: PASS, or fail with actionable TypeScript errors to triage before enabling `verify` as required.

**Checkpoint:** if `npm run typecheck` fails due to existing errors, keep the script but document failure in `docs/codebase-audit/2026-06-23-baseline.md` before proceeding.

---

### Task 6: CI Minima

**Files:**
- Create: `.github/workflows/verify.yml`

- [ ] **Step 1: Crea workflow GitHub Actions**

Contenuto:

```yaml
name: Verify

on:
  pull_request:
  push:
    branches:
      - main
      - develop

jobs:
  verify:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install frontend dependencies
        run: npm ci

      - name: Install worker dependencies
        run: npm ci
        working-directory: server

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm test

      - name: Build
        run: npm run build

      - name: Worker typecheck
        run: npm --prefix server run typecheck
```

- [ ] **Step 2: Decide env policy for CI build**

If `npm run build` requires env vars, add documented non-secret CI placeholders only if the app supports them safely:

```yaml
        env:
          NEXT_PUBLIC_SUPABASE_URL: https://example.supabase.co
          NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder
```

Do not add `SUPABASE_SERVICE_ROLE_KEY` to CI unless a protected secret is configured and the build truly requires it.

- [ ] **Step 3: Validate YAML shape locally if possible**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
p = Path(".github/workflows/verify.yml")
text = p.read_text()
required = ["actions/checkout@v4", "actions/setup-node@v4", "npm ci", "npm run lint", "npm run typecheck", "npm test", "npm run build"]
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit(f"missing: {missing}")
print("workflow text ok")
PY
```

Expected:

```text
workflow text ok
```

**Checkpoint:** do not treat CI as required until local `npm run verify` is understood.

---

### Task 7: Baseline Verifiche E Lint Gate

**Files:**
- Modify: `docs/codebase-audit/2026-06-23-baseline.md`
- Modify: `next.config.ts` only if lint is green or the user explicitly accepts the cleanup

- [ ] **Step 1: Run narrow verification commands**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm --prefix server run typecheck
```

Expected: each command either PASS or produces a captured failure to document.

- [ ] **Step 2: Update baseline document**

In `docs/codebase-audit/2026-06-23-baseline.md`, update the verification table with actual results:

```md
| Comando | Scopo | Stato baseline | Note |
|---|---|---|---|
| `npm run lint` | ESLint frontend | PASS/FAIL | inserire sintesi |
| `npm run typecheck` | TypeScript frontend | PASS/FAIL | inserire sintesi |
| `npm test` | Test Jest frontend | PASS/FAIL | inserire sintesi |
| `npm --prefix server run typecheck` | Typecheck worker | PASS/FAIL | inserire sintesi |
```

- [ ] **Step 3: Run build separately**

Run:

```bash
npm run build
```

Expected: PASS or documented env/build failure.

- [ ] **Step 4: Decide `next.config.ts` lint gate**

If `npm run lint` is PASS, change:

```ts
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};
```

to:

```ts
const nextConfig: NextConfig = {};
```

If lint is FAIL, do not modify `next.config.ts`. Instead add this note to the baseline:

```md
## Lint Gate Decision

`next.config.ts` still ignores ESLint during build because baseline lint is not green. Remove `eslint.ignoreDuringBuilds` after lint errors are triaged.
```

- [ ] **Step 5: Verify final command if feasible**

Run:

```bash
npm run verify
```

Expected: PASS, or documented known failure matching previous baseline.

**Checkpoint:** if `npm run verify` fails, do not continue to refactor tasks until failures are classified as pre-existing or fixed.

---

### Task 8: Document Cleanup Execution Plan

**Files:**
- Modify: `docs/codebase-audit/cleanup-candidates.md`
- Potentially move files only after explicit approval in a separate execution step

- [ ] **Step 1: Check references before any archive/removal proposal**

Run:

```bash
rg "DATABASE_SETUP|DEPLOYMENT.md|ISTRUZIONI_DEPLOY|FIX_VERCEL_ENV_VARS|supabase_query_demo|test_supabase_query|\\.trae|\\.claude/launch|\\.vercel/project" .
```

Expected: reference list captured for decision-making.

- [ ] **Step 2: Update cleanup candidates with reference counts**

For each candidate row, add:

```md
References: `<count>` via `rg`.
Decision: keep/current, archive, merge-into-canonical-doc, delete-candidate.
```

- [ ] **Step 3: Propose archive structure without moving files**

Add to `cleanup-candidates.md`:

```md
## Proposed Archive Structure

- `docs/archive/`: historical docs that should not be followed as current instructions.
- `docs/archive/deploy/`: historical deploy fixes and one-off deployment notes.
- `docs/archive/database/`: historical database setup notes superseded by migrations and `docs/DEVELOPMENT.md`.

No file should be moved until the archive list is approved.
```

- [ ] **Step 4: Ask for approval with exact file list**

Prepare a list like:

```md
Proposed moves:

- `docs/DATABASE_SETUP.md` -> `docs/archive/database/DATABASE_SETUP.md`
- `FIX_VERCEL_ENV_VARS.md` -> `docs/archive/deploy/FIX_VERCEL_ENV_VARS.md`
```

Expected: user approves, edits or rejects the list before any move.

---

### Task 9: Architecture Decisions Before Refactor

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/codebase-audit/cleanup-candidates.md`
- Do not modify `components.json`, dashboard pages, Supabase types or worker code in this task

- [ ] **Step 1: Document UI namespace decision**

Add to `docs/ARCHITECTURE.md`:

```md
## UI Namespace Decision

Current state:

- `components.json` points shadcn aliases to `@/components` and `@/components/ui`.
- The architecture target prefers shared reusable UI under `src/shared/components/ui`.

Decision required before migration:

1. keep `src/components/ui` as shadcn canonical and import from there;
2. migrate shadcn canonical path to `src/shared/components/ui`;
3. keep both temporarily with a documented migration rule.

Recommended default: choose one canonical namespace before changing imports. Do not mix UI namespace migration with dashboard page refactors.
```

- [ ] **Step 2: Document individuazione path decision**

Add:

```md
## Individuazione Workflow Decision

Current state:

- Serverless/API legacy path exists under `src/app/api/campagne-individuazione`.
- Worker path exists under `server/src/jobs/individuazione-runner.ts`.
- Frontend service logic exists under `src/features/campagne-individuazione/services`.

Decision required before removal:

1. worker-only canonical path;
2. worker primary plus serverless fallback;
3. keep both until test coverage exists.

Recommended default: worker primary plus documented fallback until tests and operational confidence support removal.
```

- [ ] **Step 3: Create hotspot refactor order**

Add:

```md
## Hotspot Refactor Order

1. `src/app/dashboard/programmazioni/page.tsx`
   - Reason: large route page and import/mapping flows likely benefit from existing tests.
   - First extraction: pure components and mapping/import hooks.

2. `src/app/dashboard/opere/[id]/page.tsx`
   - Reason: largest page and high blast radius.
   - First extraction: read-only display sections before mutation flows.

3. `src/features/campagne-individuazione/services` and `server/src/jobs`
   - Reason: workflow duplication and operational sensitivity.
   - First extraction: contract documentation and tests before removal.
```

- [ ] **Step 4: Ask for architecture decisions**

Ask the user to choose:

- UI namespace canonical path;
- individuazione canonical path;
- first dashboard hotspot for refactor.

Expected: no code refactor until choices are made.

---

### Task 10: First Refactor Plan, Not Refactor Execution

**Files:**
- Create: `docs/superpowers/plans/2026-06-23-programmazioni-page-split.md` or `docs/superpowers/plans/2026-06-23-opere-detail-page-split.md`
- Do not modify dashboard source files in this task

- [ ] **Step 1: Pick first hotspot from approved decision**

If user picks `programmazioni`, plan file:

```text
docs/superpowers/plans/2026-06-23-programmazioni-page-split.md
```

If user picks `opere/[id]`, plan file:

```text
docs/superpowers/plans/2026-06-23-opere-detail-page-split.md
```

- [ ] **Step 2: Read the target file in slices**

Use targeted reads/searches:

```bash
rg "useState|useEffect|function |const .* = \\(|return \\(" src/app/dashboard/programmazioni/page.tsx
```

or:

```bash
rg "useState|useEffect|function |const .* = \\(|return \\(" 'src/app/dashboard/opere/[id]/page.tsx'
```

Expected: map of state, effects, handlers and render sections.

- [ ] **Step 3: Write a dedicated split plan**

The split plan must include:

- current responsibilities;
- first extraction target;
- files to create;
- tests/checklist;
- commands to verify;
- rollback strategy.

Minimum structure:

```md
# <Hotspot> Split Plan

Goal: reduce route-page complexity without changing behavior.

## Current Responsibilities

- data loading
- local state
- mutations
- dialogs/forms
- render sections

## First Slice

Extract one pure section or hook with no behavior change.

## Verification

- run existing tests;
- run lint/typecheck;
- manual checklist for route behavior.
```

**Checkpoint:** implement this split only after the dedicated plan is approved.

---

### Task 11: Branch Cleanup Approval Pack

**Files:**
- Modify: `docs/codebase-audit/branch-inventory.md`
- Do not delete branches in this task

- [ ] **Step 1: Compute merged/unmerged state**

Run:

```bash
git branch --merged main
git branch --no-merged main
git log --oneline --decorate --graph --all -n 60
```

Expected: enough context to classify branch safety.

- [ ] **Step 2: Update branch classifications**

Use these definitions:

```md
- `keep`: active work or active worktree.
- `merge-candidate`: useful work not yet integrated.
- `archive`: old but possibly useful context.
- `delete-candidate`: merged or superseded and safe to delete after approval.
```

- [ ] **Step 3: Prepare exact approval request**

Add:

```md
## Delete Approval Required

No branch is approved for deletion yet.

Candidate commands, disabled until explicit approval:

```bash
git branch -d feat/individuazione-resume
git branch -d feat/individuazione-resume-ux
git branch -d fix/individuazione-stuck-state
git branch -d fix/resume-batch-timeout
```

Use `git branch -D` only if the user explicitly approves force deletion for a named branch.
```

- [ ] **Step 4: Ask user branch-by-branch**

Expected: approval must name each branch. Do not infer approval from general cleanup intent.

---

## Final Verification For This Plan

After Tasks 0-9 are complete and before any source refactor:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm --prefix server run typecheck
```

If scripts and CI were added successfully:

```bash
npm run verify
```

Expected:

- PASS, or documented pre-existing failures in `docs/codebase-audit/2026-06-23-baseline.md`;
- no branch deletions;
- no source refactor unless a dedicated hotspot plan is approved;
- docs and AI guidance are canonical and cross-linked.

## Execution Handoff

Recommended execution mode: subagent-driven by task for Tasks 0-9, with parent review after each task. Tasks 10-11 should remain approval-gated because they lead into source refactor and branch deletion decisions.
