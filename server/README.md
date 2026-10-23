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
4. Imposta nei Settings del servizio gli stessi valori di `server/railway.json`:
   - **Start Command** `./node_modules/.bin/tsx src/index.ts`: Node deve
     ricevere direttamente il `SIGTERM`. Con `npm start` npm inoltra il
     segnale a `sh -c`, che muore senza passarlo al worker (vedi sotto);
   - **Watch Paths** `/server/**`: le modifiche solo frontend non riavviano
     il worker (i pattern partono dalla radice del repo anche con Root
     Directory `server`);
   - **Healthcheck Path** `/health`.

   Railway non legge `server/railway.json` da solo: con Root Directory
   `server` il file di configurazione va indicato con percorso assoluto
   (`/server/railway.json`), e Config as Code è deprecato. Il file resta come
   riferimento versionato ed è verificato da `src/test/shutdown.test.ts`.
5. Esegui la migration `supabase/migrations/20260611131254_campaign_jobs.sql`
   sul database (Supabase) prima del primo avvio.
6. Applica sempre le migration del worker **prima** del deploy del codice che
   le usa (es. `get_campagna_programmazioni_batch`, `campaign_jobs.opzioni`).

### Deploy con individuazioni in corso

Ogni deploy riavvia il container. Alla ricezione di `SIGTERM` il worker rimette
in coda (`stato = 'queued'`, `interrotto_at` valorizzato) i job di
individuazione che stava eseguendo; il worker successivo, dopo 60 secondi, li
riprende da solo sulla stessa riga `campaign_jobs`, con le stesse opzioni del
run. Il browser che faceva polling vede il job ripartire senza azioni
dell'operatore.

Il gestore funziona solo se il `SIGTERM` arriva a Node: per questo lo start
command non deve passare da npm/yarn/pnpm. Il 19/10 un'individuazione di IRIS
2024 è rimasta `running` dopo un deploy proprio perché il servizio partiva
con `npm start`.

Se il processo viene ucciso senza `SIGTERM` (crash, OOM) il job resta
`running`: dopo 30 minuti senza avanzamento il recovery lo chiude in errore e
l'operatore usa **Riprendi**. Per dare tempo alla marcatura, imposta su Railway
`RAILWAY_DEPLOYMENT_DRAINING_SECONDS` (es. `15`).

Ogni RPC passa da PostgREST con lo `statement_timeout` di 8s del ruolo
`authenticator`: le query del loop non devono crescere con la dimensione
della campagna (selezione lotti a cursore, totale da `programmazioni_count`).

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
