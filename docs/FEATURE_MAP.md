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
