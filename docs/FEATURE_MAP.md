# Feature Map

Questa mappa aiuta agenti e sviluppatori a orientarsi prima di modificare una
feature. Usala insieme a `docs/ARCHITECTURE.md` e `docs/TESTING.md`.

## Programmazioni e Import

Responsabilità:

- Creazione campagne programmazione.
- Upload file CSV/XLSX.
- Mapping colonne per emittente.
- Data Health e progress upload.

Entry point:

- `src/app/dashboard/programmazioni/page.tsx`
- `src/app/dashboard/programmazioni/components/MappingWizard.tsx`
- `src/app/dashboard/programmazioni/components/MappingRulesEditor.tsx`
- `src/app/dashboard/programmazioni/components/EmittenteMappingSection.tsx`
- `src/features/programmazioni/services/import-mapping.service.ts`
- `src/features/programmazioni/services/programmazioni-upload-worker.service.ts`
- `src/features/programmazioni/services/programmazioni.service.ts`

Worker:

- `server/src/routes/upload-programmazioni.ts`
- `server/src/jobs/upload-programmazioni-runner.ts`
- `server/src/jobs/programmazioni-import-core.ts`
- `server/src/jobs/upload-job-store.ts`

Test mirati:

- `npm test -- src/features/programmazioni/services/import-mapping.service.test.ts --runInBand`
- `npm test -- src/features/programmazioni/services/programmazioni-filters.service.test.ts --runInBand`
- `npm test -- src/app/dashboard/programmazioni/page.test.tsx --runInBand`
- `npm --prefix server test`

Rischi:

- Non ripristinare parsing completo nel browser quando il worker è disponibile.
- Non rimuovere il fallback locale finché `NEXT_PUBLIC_WORKER_URL` non è sempre disponibile.
- Non bypassare `import_row_uid`: rende l'upload idempotente.

## Individuazioni

Responsabilità:

- Avvio individuazioni.
- Polling worker e resume job.
- Fallback serverless quando il worker non è configurato.

Entry point:

- `src/features/campagne-individuazione/services/campagne-individuazione.service.ts`
- `src/features/campagne-individuazione/services/individuazione-contract.ts`
- `src/shared/contexts/individuazione-process-context.tsx`
- `src/app/api/campagne-individuazione/*`

Worker:

- `server/src/routes/individuazione.ts`
- `server/src/routes/jobs.ts`
- `server/src/jobs/individuazione-runner.ts`
- `server/src/jobs/store.ts`
- `server/src/jobs/recovery.ts`

Test mirati:

- `npm test -- src/features/campagne-individuazione/services/individuazione-worker.service.test.ts --runInBand`
- `npm test -- src/features/programmazioni/services/processing-status.test.ts --runInBand`
- `npm --prefix server test`

Rischi:

- Il path `src/app/api/campagne-individuazione/*` è fallback legacy, non codice morto.
- Ogni lettura job deve restare owner-scoped.
- La recovery stale deve restare non bloccante all'avvio worker.

## Matching

Responsabilità:

- Normalizzazione titoli.
- Matching automatico e routing revisione.
- Regole mapping per serie/episodi.

Entry point:

- `src/features/individuazioni/services/matching.service.ts`
- `src/features/programmazioni/utils/title-normalize.ts`
- `src/features/programmazioni/services/import-mapping.service.ts`
- `src/app/dashboard/programmazioni/components/MappingRulesEditor.tsx`

Test mirati:

- `npm test -- src/features/individuazioni/services/matching.service.test.ts --runInBand`
- `npm test -- src/features/programmazioni/utils/title-normalize.test.ts --runInBand`
- `npm test -- src/features/programmazioni/services/import-mapping.service.test.ts --runInBand`

## Data Health

Responsabilità:

- Policy per completezza dati attesa per emittente.
- Sintesi completeness in dashboard e dettaglio campagna.

Entry point:

- `src/features/programmazioni/services/data-health-policy.service.ts`
- `src/features/programmazioni/services/programmazioni-health.service.ts`
- `src/app/dashboard/programmazioni/components/EmittenteMappingSection.tsx`
- `src/app/dashboard/programmazioni/[id]/page.tsx`

Test mirati:

- `npm test -- src/features/programmazioni/services/data-health-policy.service.test.ts --runInBand`
- `npm test -- src/features/programmazioni/services/programmazioni-health.service.test.ts --runInBand`

## Worker e Job

Responsabilità:

- Endpoint Express autenticati.
- Job persistenti owner-scoped.
- Recovery stale.
- Orchestrazione fuori dai timeout serverless.

Entry point:

- `server/src/index.ts`
- `server/src/auth.ts`
- `server/src/routes/*.ts`
- `server/src/jobs/*.ts`

Test mirati:

- `npm --prefix server test`
- `npm --prefix server run typecheck`

Rischi:

- Non introdurre endpoint senza `requireAuth`, salvo `/health`.
- Non fare query job non scoped per `created_by` quando il dato torna al browser.
- Non bloccare `app.listen` sulla recovery.

## Scheda Artista: anagrafica estesa e cast esterno

Responsabilità:

- Stati `minorenne` (con tutori legali) e `deceduto` (con eredi e data di decesso).
- Documento d'identità con data di scadenza; note interne visibili solo allo staff (`artisti_note`).
- Proposta di conversione del cast esterno in partecipazioni quando il nome coincide con l'artista
  (`nome_persona_key`: minuscole, senza accenti, token ordinati; oppure stesso nconst IMDb).
- Cast esterno per singolo episodio (`cast_esterno.episodio_id`, NULL = tutta l'opera/serie).

Entry point:

- `src/app/dashboard/artisti/[id]/components/artista-*-panel.tsx`
- `src/app/dashboard/opere/[id]/components/cast-esterno-panel.tsx`
- `src/features/artisti/lib/artista-alerts.ts`
- `src/features/artisti/services/artista-scheda.service.ts`
- `supabase/migrations/20261012100100_artisti_documento_note_referenti.sql`
- `supabase/migrations/20261012100200_cast_esterno_episodi_e_riconoscimento.sql`

Rischi:

- La riga `artisti` è leggibile/modificabile dall'artista: dati riservati allo staff vanno in tabelle separate.
- La conversione cast → partecipazione cancella la riga di cast esterno: resta traccia nel registro attività.

## Alert scadenze e Registro attività

Responsabilità:

- `get_alert_scadenze`: documenti (60 giorni), 18 anni (un mese prima), 80 anni, opere AV 50 anni / musicali 70 anni.
  "Presa visione" in `alert_prese_visione`.
- `audit_log`: trigger su tutte le tabelle anagrafiche/operative, accessi e cambi ruolo su `auth.users`.
  Solo lettura per admin, nessuna scadenza. Esclusi per volume `programmazioni` e `ripartizioni`;
  di `individuazioni` solo gli UPDATE fatti da un utente.

Entry point:

- `src/features/dashboard/components/DashboardScadenzeAlert.tsx`
- `src/features/dashboard/services/alert-scadenze.service.ts`
- `src/app/dashboard/registro-attivita/page.tsx`
- `src/features/registro-attivita/*`
- `supabase/migrations/20261012100300_alert_scadenze.sql`
- `supabase/migrations/20261012100400_audit_log.sql`

Rischi:

- Una nuova tabella va aggiunta esplicitamente alla lista dei trigger `audit_log_trigger`.
- Gli UPDATE senza utente (worker, service role) non vengono registrati.
