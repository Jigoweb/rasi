# Cleanup Candidates

Data: 2026-06-23
Regola: questo documento non autorizza cancellazioni. Serve a classificare prima di modificare.

Aggiornamento 2026-06-23: un primo batch di root cleanup e stato applicato. Vedere `docs/codebase-audit/root-security-cleanup.md` per dettagli, follow-up sicurezza e file intenzionalmente lasciati in root.

## Documentazione

| Percorso | Evidenza | Rischio | Proposta | Gate |
|---|---|---|---|---|
| `README.md` | riferimenti a `.env.example` e SQL non presenti | alto | aggiornare, non archiviare | dopo creazione env examples |
| `CONTRIBUTING.md` | boilerplate e placeholder repo | alto | riscrivere sulle convenzioni reali | dopo `AGENTS.md`/architettura |
| `docs/DATABASE_SETUP.md` | riferimenti a stack storico | medio | classificare come storico o consolidare in `docs/DEVELOPMENT.md` | dopo confronto contenuti |
| `DEPLOYMENT.md` | possibile sovrapposizione deploy | medio | consolidare in guida deploy canonica | dopo inventario deploy |
| `docs/archive/deploy/ISTRUZIONI_DEPLOY.md` | runbook storico archiviato | medio | archived/non-operative | consultare solo come storico |
| `docs/archive/deploy/FIX_VERCEL_ENV_VARS.md` | fix storico env archiviato | basso | archived/non-operative | consultare solo come storico |

## File Locali O Storici

| Percorso | Evidenza | Rischio | Proposta | Gate |
|---|---|---|---|---|
| `supabase_query_demo.py` | script dimostrativo root con credenziali privilegiate | alto | removed | ruotare/revocare eventuale chiave reale |
| `test_supabase_query.py` | test/script locale root con credenziali privilegiate | alto | removed | ruotare/revocare eventuale chiave reale |
| `docs/archive/trae/tool-documents/` | documenti/tooling esterno archiviati | medio | archived/non-operative | consolidare solo contenuti ancora utili |
| `.claude/launch.json` | configurazione locale tracciata | medio | verificare se condivisa intenzionalmente | conferma utente |
| `.vercel/project.json` | configurazione Vercel tracciata | alto | non toccare senza decisione deploy | conferma utente |
| `.superpowers/` | artefatti locali di brainstorming/sessione | basso | removed and ignored | nessuna azione |
| `vercel.json` | configurazione Vercel vuota (`{}`) | basso | removed | ripristinare solo se serve configurazione esplicita |

## Percorsi Runtime Transitori

| Percorso | Evidenza | Rischio | Proposta | Gate |
|---|---|---|---|---|
| `src/app/api/campagne-individuazione/*` | fallback serverless legacy per il workflow individuazione | alto | transitional; non rimuovere e non archiviare ancora | worker contract tests passano; recovery worker live; job reads scoped; RLS owner policy applicata; legacy auth enforced; criteri fallback documentati; rollback path esistente; almeno una run staging/production verificata |

Le route serverless legacy restano disponibili solo come fallback quando `NEXT_PUBLIC_WORKER_URL` non e configurato. Questo documento non approva cancellazione o archiviazione delle route: la rimozione richiede il completamento del gate e una decisione separata.

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
| `docs/archive/deploy/ISTRUZIONI_DEPLOY.md` | archived | archived/non-operative |
| `docs/archive/deploy/FIX_VERCEL_ENV_VARS.md` | archived | archived/non-operative |
| `supabase_query_demo.py` | removed | removed |
| `test_supabase_query.py` | removed | removed |
| `docs/archive/trae/tool-documents/` | archived | archived/non-operative |
| `.claude/launch.json` | `1` via `rg` | keep/current |
| `.vercel/project.json` | `1` via `rg` | keep/current |
| `.superpowers/` | removed | removed and ignored |
| `vercel.json` | removed | removed |
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

The first archive batch has been applied for deploy notes and Trae exports. Future archive/delete actions still require explicit approval.

## Proposed Moves Requiring Approval

No additional move, delete, or archive action is approved yet.

- `docs/DATABASE_SETUP.md` -> `docs/archive/database/DATABASE_SETUP.md` only after content comparison and consolidation into `docs/DEVELOPMENT.md` or another canonical doc.

### Removed Or Archived In First Batch

- `supabase_query_demo.py`: removed.
- `test_supabase_query.py`: removed.
- `vercel.json`: removed because it was empty.
- `.superpowers/`: removed and ignored.
- `ISTRUZIONI_DEPLOY.md`: archived under `docs/archive/deploy/`.
- `FIX_VERCEL_ENV_VARS.md`: archived under `docs/archive/deploy/`.
- `.trae/`: archived under `docs/archive/trae/tool-documents/`.

## Comandi Di Verifica Prima Di Rimuovere

```bash
rg "supabase_query_demo|test_supabase_query|@tanstack/react-table|@supabase/auth-ui-react|@supabase/auth-ui-shared"
npm exec depcheck
```

`npm exec depcheck` puo richiedere rete/install temporaneo; eseguirlo solo quando si avvia la fase cleanup dipendenze.
