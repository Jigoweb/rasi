# RASI Worker

Server Node.js (Express) per le operazioni onerose di RASI — individuazione e
caricamento programmazioni — spostate fuori dal serverless di Vercel per
evitarne i limiti di timeout.

Il lavoro pesante resta dentro Postgres (le RPC `process_programmazioni_chunk`,
`init_campagna_individuazione`, `finalize_campagna_individuazione`, ...). Questo
worker fa solo da **orchestratore**: avvia un job, cicla i chunk fino al
completamento e scrive l'avanzamento sulle tabelle `campaign_jobs` e
`upload_jobs`. Il frontend chiama "start" e poi fa polling dell'avanzamento.

## Architettura

```
Browser (Vercel)                 Worker (Railway)              Postgres (Supabase)
  │  POST /api/individuazione/start ─────────►│
  │  ◄──────────── { job_id }                 │  acquire lock
  │                                           │  init_campagna_individuazione
  │  GET /api/jobs/:id  (polling 2-3s) ──────►│  loop: process_programmazioni_chunk
  │  ◄──── { fase, processate, ... }          │  finalize + release lock
  │                                           │  patch campaign_jobs ad ogni chunk
```

## Sviluppo locale

```bash
cd server
cp .env.example .env   # compila i valori
npm install
npm run dev            # http://localhost:8080/health
```

## Variabili d'ambiente

Vedi `.env.example`. Su Railway vanno impostate nel servizio:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (stessi del progetto Next.js)
- `ALLOWED_ORIGINS` — dominio del frontend Vercel (es. `https://rasi.vercel.app`)
- `PORT` — Railway la inietta automaticamente
- `CHUNK_SIZE` — opzionale, default 500

## Deploy su Railway

1. Railway → New Service → from GitHub repo `jigoweb/rasi`.
2. Settings → **Root Directory = `server`** (così builda solo questa cartella).
3. Aggiungi le variabili d'ambiente sopra.
4. Il `railway.json` definisce start command (`npm start`) e healthcheck (`/health`).
5. Esegui la migration `supabase/migrations/20260611120000_campaign_jobs.sql`
   sul database (Supabase) prima del primo avvio.

## Endpoint

| Metodo | Path                          | Descrizione                                  |
|--------|-------------------------------|----------------------------------------------|
| GET    | `/health`                     | Healthcheck                                  |
| POST   | `/api/individuazione/start`   | Avvia/riprende l'individuazione → `job_id`   |
| GET    | `/api/jobs/:id`               | Avanzamento del job (per polling)            |
| POST   | `/api/upload-programmazioni/start` | Avvia upload programmazioni da Storage |
| GET    | `/api/upload-jobs/:id`        | Avanzamento upload programmazioni            |

Tutte le route (tranne `/health`) richiedono header `Authorization: Bearer <supabase access token>`.

## Test

```bash
npm --prefix server run typecheck
npm --prefix server test
```

I test worker usano `node:test` via `tsx`; non sono eseguiti dal Jest root.
