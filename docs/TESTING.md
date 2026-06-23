# Testing Guide

## Comando Canonico

```bash
npm run verify
```

`verify` esegue lint, typecheck frontend, test Jest, build Next, typecheck
worker e test worker.

Nota: il lint ha ancora debito storico documentato. Quando `npm run verify`
fallisce per lint legacy, usa i comandi mirati sotto per isolare il batch su
cui stai lavorando e non confondere problemi preesistenti con regressioni.

## Comandi Mirati

Frontend typecheck:

```bash
npm run typecheck
```

Test Jest root:

```bash
npm test -- --runInBand
```

Build produzione:

```bash
npm run build
```

Worker typecheck:

```bash
npm --prefix server run typecheck
```

Worker tests:

```bash
npm --prefix server test
```

## Test Per Area

Programmazioni upload e mapping:

```bash
npm test -- src/features/programmazioni/services/import-mapping.service.test.ts --runInBand
npm test -- src/features/programmazioni/services/programmazioni-filters.service.test.ts --runInBand
npm test -- src/app/dashboard/programmazioni/page.test.tsx --runInBand
npm --prefix server test
```

Individuazioni:

```bash
npm test -- src/features/campagne-individuazione/services/individuazione-worker.service.test.ts --runInBand
npm test -- src/features/programmazioni/services/processing-status.test.ts --runInBand
npm --prefix server test
```

Matching:

```bash
npm test -- src/features/individuazioni/services/matching.service.test.ts --runInBand
npm test -- src/features/programmazioni/utils/title-normalize.test.ts --runInBand
npm test -- src/features/programmazioni/services/import-mapping.service.test.ts --runInBand
```

Data Health:

```bash
npm test -- src/features/programmazioni/services/data-health-policy.service.test.ts --runInBand
npm test -- src/features/programmazioni/services/programmazioni-health.service.test.ts --runInBand
```

## Regole Per Refactor

- Prima di cambiare comportamento, aggiungi un test che fallisce per il motivo atteso.
- Per refactor puri, esegui almeno il test dell'area e `npm run typecheck`.
- Per worker e route Express, esegui sempre `npm --prefix server test`.
- Per cambi in `src/app/dashboard/programmazioni/page.tsx`, esegui anche `page.test.tsx`.
- Prima di chiudere un batch, esegui typecheck, Jest root, worker tests e build.

## Note Sui Worktree

Quando lavori in `.worktrees`, esegui i comandi dalla directory del worktree.
Se un tool mostra la root principale nel suo output, rilancia con `cd` esplicito
nel comando per evitare di testare il checkout sbagliato.
