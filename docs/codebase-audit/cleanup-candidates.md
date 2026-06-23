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

## Reference Scan Results

Conteggi acquisiti prima di aggiungere questa sezione. Il comando richiesto ha trovato quasi tutti i riferimenti nel solo file di audit; l'unico riferimento esterno rilevato: `FIX_VERCEL_ENV_VARS.md` che punta a `DEPLOYMENT.md`.

| Candidato | References | Decision |
|---|---:|---|
| `README.md` | `9` via `rg` | keep/current |
| `CONTRIBUTING.md` | `4` via `rg` | keep/current |
| `docs/DATABASE_SETUP.md` | `1` via `rg` | merge-into-canonical-doc; archive only after comparing and consolidating useful content into `docs/DEVELOPMENT.md` or another canonical doc |
| `DEPLOYMENT.md` | `2` via `rg` | merge-into-canonical-doc |
| `ISTRUZIONI_DEPLOY.md` | `1` via `rg` | archive |
| `FIX_VERCEL_ENV_VARS.md` | `1` via `rg` | archive |
| `supabase_query_demo.py` | `2` via `rg` | delete-candidate |
| `test_supabase_query.py` | `2` via `rg` | delete-candidate |
| `.trae/` | `1` via `rg` | keep/current |
| `.claude/launch.json` | `1` via `rg` | keep/current |
| `.vercel/project.json` | `1` via `rg` | keep/current |
| `@tanstack/react-table` | `6` via `rg` | keep/current |
| `@supabase/auth-ui-react` | `9` via `rg` | keep/current |
| `@supabase/auth-ui-shared` | `7` via `rg` | keep/current |

### External Reference Notes

- Counts include self-references from this audit document, so they are triage signals rather than proof of active usage.
- The required pre-change scan found one external reference: `FIX_VERCEL_ENV_VARS.md` links to `DEPLOYMENT.md`.
- `DEPLOYMENT.md`, `supabase_query_demo.py`, and `test_supabase_query.py` have counts above one because they are referenced by cleanup metadata in this audit document; those self-references should be discounted before any archive or delete decision.
- Candidates with no external references still require the listed gate before action. In particular, `docs/DATABASE_SETUP.md` must be compared against `docs/DEVELOPMENT.md` and any useful setup guidance must be merged into the canonical documentation before it can be proposed for archive.

## Proposed Archive Structure

- `docs/archive/`: historical docs that should not be followed as current instructions.
- `docs/archive/deploy/`: historical deploy fixes and one-off deployment notes.
- `docs/archive/database/`: historical database setup notes superseded by migrations and `docs/DEVELOPMENT.md`.
- `docs/archive/README.md`: proposed index explaining that archived docs are historical, non-operative, and should link to the current canonical docs when known.

No file should be moved until the archive list is approved.

## Proposed Moves Requiring Approval

No move, delete, or archive action is approved yet.

- `docs/DATABASE_SETUP.md` -> `docs/archive/database/DATABASE_SETUP.md` only after content comparison and consolidation into `docs/DEVELOPMENT.md` or another canonical doc.
- `ISTRUZIONI_DEPLOY.md` -> `docs/archive/deploy/ISTRUZIONI_DEPLOY.md`
- `FIX_VERCEL_ENV_VARS.md` -> `docs/archive/deploy/FIX_VERCEL_ENV_VARS.md`

### Absent Or Already Consolidated

- Nessuno. Tutti i file candidati controllati esistono nella worktree.

## Comandi Di Verifica Prima Di Rimuovere

```bash
rg "supabase_query_demo|test_supabase_query|@tanstack/react-table|@supabase/auth-ui-react|@supabase/auth-ui-shared"
npm exec depcheck
```

`npm exec depcheck` puo richiedere rete/install temporaneo; eseguirlo solo quando si avvia la fase cleanup dipendenze.
