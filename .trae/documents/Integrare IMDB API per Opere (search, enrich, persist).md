## Obiettivi
- Creare un commit di backup dell’attuale codebase.
- Integrare la ricerca/arricchimento delle Opere tramite `https://imdbapi.dev/` su richiesta, mantenendo sicura l’API key.

## Piano Operativo
### 1) Commit di Backup
- Verificare stato Git e includere solo file tracciati (escludendo `.env*` e segreti).
- Eseguire `git add -A` e `git commit -m "chore: backup pre-integrazione IMDB"`.
- Confermare che il working tree sia pulito.

### 2) Layer Server (Proxy sicuro)
- Aggiungere Route Handlers Next.js:
  - `GET /api/imdb/search?query=&year=&type=`: valida input (zod), inoltra la richiesta a `imdbapi.dev` con API key (env server-side), normalizza output.
  - `GET /api/imdb/title/:id`: dettaglio di un titolo (campi utili: titolo originale, anno, tipo, tconst, registi se disponibili).
- Gestione errori, rate limiting semplice, caching breve (es. 60s) per ridurre chiamate ripetute.

### 3) Client/API Layer
- `src/shared/lib/http.ts`: wrapper `fetchJson` con timeout/abort.
- `src/features/opere/services/external/imdb.service.ts`:
  - `searchTitles(term, year?, type?)` → chiama `/api/imdb/search`.
  - `getTitleById(tconst)` → chiama `/api/imdb/title/:id`.
  - `mapImdbToOpera(data)` → patch coerente con schema Supabase (`titolo`, `titolo_originale`, `tipo`, `anno_produzione`, `imdb_tconst`, `codici_esterni.imdb`, `metadati.imdb_snapshot`).

### 4) Integrazione UI (Pagina Opere)
- Nel form crea/modifica Opera:
  - Pulsante "Cerca su IMDB" accanto a `titolo`/`anno`.
  - Dialog con barra di ricerca (debounce) e filtri opzionali; elenco risultati con titolo/anno/tipo.
  - Azione "Usa questo" → autofill controllato dei campi e set di `imdb_tconst`.
  - Checkbox opzionale "Allega dettagli IMDB a metadati".

### 5) Sicurezza e Env
- Aggiungere `IMDB_API_URL=https://imdbapi.dev` e `IMDB_API_KEY` in `.env.local` (non `NEXT_PUBLIC_*`).
- Non esporre la chiave al client; nessun log di segreti.

### 6) Test
- Unit test dei servizi client con mock del proxy.
- Test dei Route Handlers (validazioni, header API key, formati risposta, rate limit).
- Test UI per ricerca, selezione e autofill nel form; verifica persistenza campi IMDB al salvataggio.

### 7) Consegna
- Eseguire i test (`npx jest`).
- Facoltativo: commit degli aggiornamenti con messaggi chiari.

## Conferma
- Confermi che procedo con il commit di backup e poi implemento il proxy IMDB, il servizio client e l’integrazione UI come sopra?