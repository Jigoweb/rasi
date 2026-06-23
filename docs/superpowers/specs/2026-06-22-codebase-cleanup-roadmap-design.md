# RASI Codebase Cleanup Roadmap

Data: 2026-06-22
Stato: proposta per revisione
Scope: audit e roadmap operativa prima di modifiche a codice, documentazione canonica esistente o branch
Commit: non previsto in questo ciclo

## Obiettivo

Definire una roadmap priorizzata per rendere la codebase RASI piu comprensibile, manutenibile e sicura da evolvere per dev umani e agenti AI. Il primo ciclo non deve cancellare file, modificare branch o refactorare codice: deve produrre un piano eseguibile con rischi, checkpoint e criteri di successo chiari.

La roadmap copre cinque assi:

1. baseline e sicurezza operativa;
2. documentazione e onboarding;
3. qualita e verifiche;
4. architettura e confini codice;
5. maintainability per AI agent e dev umani.

## Contesto Emerso Dall'Audit

Il progetto e una applicazione Next.js App Router con React, TypeScript, Tailwind/shadcn-style UI, Supabase/Postgres/Auth e un worker Node/Express separato in `server/` per job lunghi di individuazione. La struttura dichiarata e feature-based, con routing in `src/app`, dominio in `src/features` e infrastruttura condivisa in `src/shared`, ma questa separazione e applicata solo parzialmente.

Hotspot iniziali:

- `src/app/dashboard/opere/[id]/page.tsx`: pagina molto grande con UI, stato e logica applicativa.
- `src/app/dashboard/programmazioni/page.tsx`: pagina molto grande con responsabilita multiple.
- `src/app/dashboard/opere/page.tsx`, `src/app/dashboard/utenti/page.tsx`, `src/app/dashboard/artisti/[id]/page.tsx`: ulteriori pagine dense.
- `src/features/campagne-individuazione/services/campagne-individuazione.service.ts` e `server/src/jobs/individuazione-runner.ts`: workflow individuazioni duplicato tra percorso serverless/legacy e worker.
- `src/shared/lib/supabase.ts`: punto centrale grande e sensibile, con tipi Supabase da riallineare.
- `src/components/ui` e `src/shared/components/ui`: namespace UI duplicati.
- `README.md`, `CONTRIBUTING.md`, `docs/DATABASE_SETUP.md`, `DEPLOYMENT.md`, `ISTRUZIONI_DEPLOY.md`, `FIX_VERCEL_ENV_VARS.md`: documentazione da consolidare o archiviare.
- `next.config.ts`: build configurata per ignorare ESLint.

Stato git rilevante:

- branch corrente: `main`;
- `main` risulta dietro `origin/main` di 1 commit;
- `develop` risulta avanti a `origin/develop` di 2 commit;
- esistono branch locali di feature/fix legati a individuazioni e matching;
- esiste una worktree attiva su `feat/matching-reliability-optimization` in `.worktrees/matching-reliability`.

## Principi Operativi

- Nessuna cancellazione o refactor senza inventario e approvazione puntuale.
- Prima stabilizzare verifiche e documentazione, poi ridurre complessita architetturale.
- Preferire interventi piccoli, reversibili e verificabili.
- Separare cleanup storico da cambiamenti funzionali.
- Ogni fase deve dichiarare cosa tocca, cosa non tocca e come verificare il risultato.
- Le regole per agenti AI devono ridurre ambiguita: comandi canonici, file sensibili, confini di ownership e safe zones.

## Asse 1: Baseline E Sicurezza Operativa

### Evidenze

- Repository con piu branch locali e una worktree attiva.
- `main` non perfettamente allineato a `origin/main`.
- Possibile presenza di lavoro non ancora integrato in branch locali.
- La richiesta include cleanup di branch, ma questo e rischioso senza classificazione.

### Rischio

Cancellare o fondere branch senza contesto puo perdere lavoro utile, duplicare modifiche gia integrate o confondere la base di partenza dei refactor.

### Interventi Consigliati

1. Creare inventario branch:
   - branch;
   - upstream;
   - ahead/behind;
   - ultimo commit;
   - relazione con `main` e `develop`;
   - presenza in worktree.
2. Classificare ogni branch:
   - `keep`: lavoro attivo;
   - `merge-candidate`: pronto da integrare;
   - `archive`: storico da conservare;
   - `delete-candidate`: eliminabile dopo conferma.
3. Definire branch base per il cleanup:
   - opzione preferita: nuovo branch dedicato da base aggiornata;
   - evitare modifiche dirette su `main` se ci sono branch attivi non chiariti.
4. Salvare una baseline read-only dei comandi disponibili:
   - `npm test`;
   - `npm run lint`;
   - `npm run build`;
   - `npm --prefix server run typecheck`.

### Criteri Di Successo

- Ogni branch locale ha uno stato esplicito.
- La worktree attiva e documentata come in-scope o out-of-scope.
- Esiste un branch target per il lavoro futuro.
- Nessun branch e stato cancellato o modificato durante l'audit.

### Cosa Non Fare Ancora

- Non cancellare branch.
- Non fare merge.
- Non fare rebase.
- Non aggiornare `main` senza accordo sulla base di lavoro.

## Asse 2: Documentazione E Onboarding

### Evidenze

- `README.md` cita `.env.example`, ma il file non risulta presente.
- `README.md` rimanda a SQL come `supabase_init.sql`, `supabase_rls.sql`, `supabase_indexes.sql`, non allineati alla struttura attuale `db/init/*` e `supabase/migrations/*`.
- `CONTRIBUTING.md` sembra boilerplate e cita file/link mancanti o placeholder.
- `docs/DATABASE_SETUP.md` contiene tracce di stack storico non coerente con Next.js/Supabase/worker.
- Guide deploy/env sono distribuite tra piu file con sovrapposizioni.
- Mancano `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` o `.cursor/rules` dedicati al progetto.

### Rischio

Dev umani e agenti AI seguono istruzioni obsolete, generano file nel posto sbagliato, modificano setup non canonici o duplicano pattern vecchi.

### Interventi Consigliati

1. Creare un indice documentale:
   - documenti canonici;
   - documenti storici;
   - piani/spec;
   - runbook operativi;
   - materiali cliente o report.
2. Aggiornare onboarding canonico:
   - installazione frontend;
   - setup `server/`;
   - Supabase CLI e migrazioni;
   - variabili env frontend e worker;
   - comandi di verifica;
   - troubleshooting minimo.
3. Consolidare deploy docs:
   - una guida Vercel/frontend;
   - una guida worker/Railway o deployment worker;
   - archive per fix storici.
4. Creare esempi env:
   - `.env.example` per Next.js;
   - `server/.env.example` per worker;
   - note esplicite sui segreti da non committare.
5. Aggiornare `CONTRIBUTING.md` con convenzioni reali:
   - branch;
   - PR;
   - test;
   - migrazioni;
   - UI namespace;
   - ownership `src/app` vs `src/features` vs `src/shared`.

### Criteri Di Successo

- Un nuovo dev puo avviare frontend e worker seguendo un solo percorso.
- Gli agenti AI hanno una guida centrale su cosa leggere prima di modificare.
- I documenti storici sono riconoscibili come storici e non come istruzioni correnti.
- I riferimenti a file inesistenti sono rimossi o corretti.

### Cosa Non Fare Ancora

- Non eliminare documenti storici prima di averli categorizzati.
- Non spostare file cliente/report senza verificare se sono linkati o usati.
- Non introdurre nuove convenzioni che contraddicano pattern gia consolidati.

## Asse 3: Qualita E Verifiche

### Evidenze

- `package.json` espone `dev`, `build`, `start`, `lint`, `test`, ma non `typecheck`.
- `server/package.json` espone `typecheck`, ma non `test` o `lint`.
- `next.config.ts` contiene `eslint.ignoreDuringBuilds: true`.
- Non sono emersi file CI in `.github/**`.
- I test coprono alcune aree del frontend, ma il worker non sembra avere test dedicati.

### Rischio

Refactor e cleanup possono apparire sicuri anche quando rompono tipi, lint o flussi non coperti. Il fatto che la build ignori ESLint riduce la fiducia nei deploy.

### Interventi Consigliati

1. Definire baseline verifiche prima di modificare codice:
   - lint;
   - typecheck frontend;
   - test;
   - build;
   - typecheck worker.
2. Aggiungere script root:
   - `typecheck`;
   - `verify`;
   - eventualmente `verify:server`.
3. Decidere quando rendere ESLint bloccante:
   - prima documentare stato attuale;
   - poi rimuovere `ignoreDuringBuilds` solo quando lint e pulito o triagato.
4. Introdurre CI minima:
   - install;
   - lint;
   - typecheck;
   - test;
   - build;
   - typecheck worker.
5. Pianificare test worker:
   - health endpoint;
   - job runner individuazioni;
   - gestione errori e resume;
   - integrazione Supabase mockata o testabile.

### Criteri Di Successo

- Esiste un comando unico di verifica locale.
- CI riproduce le verifiche locali minime.
- Il lint non viene ignorato in build senza una motivazione documentata.
- Ogni refactor futuro ha una baseline prima/dopo.

### Cosa Non Fare Ancora

- Non rendere il lint bloccante se produce troppi errori non triagati.
- Non rimuovere dipendenze solo per sospetto.
- Non aggiungere test fragili su flussi non ancora stabilizzati.

## Asse 4: Architettura E Confini Codice

### Evidenze

- `src/app/dashboard/*` contiene pagine molto grandi.
- La separazione feature-based e dichiarata, ma pagine e componenti route-specifici incorporano ancora logica di dominio, stato e workflow.
- Il workflow individuazioni esiste sia nel percorso serverless/legacy sia nel worker.
- UI components vivono in due namespace.
- Tipi Supabase e RPC non sembrano completamente allineati, con cast dinamici in varie aree.

### Rischio

Ogni modifica richiede contesto ampio, aumenta il rischio di regressioni e rende difficile per agenti AI fare edit mirati. I duplicati di workflow e UI creano comportamenti divergenti.

### Interventi Consigliati

1. Definire confini canonici:
   - `src/app`: routing, layout, page composition;
   - `src/features`: logica dominio, service, hook, form complessi, componenti feature;
   - `src/shared`: UI generica, lib, context, utility senza dominio;
   - `server`: worker e job lunghi.
2. Creare una mappa degli hotspot:
   - file;
   - responsabilita attuali;
   - responsabilita da estrarre;
   - test necessari prima del refactor.
3. Ridurre le pagine grandi per fasi:
   - estrarre componenti puri;
   - estrarre hook di stato;
   - estrarre adapter/service;
   - aggiungere test sui comportamenti critici.
4. Stabilizzare individuazioni:
   - dichiarare worker come percorso canonico se confermato;
   - marcare serverless legacy come fallback o deprecarlo;
   - documentare contratto API frontend-worker;
   - rimuovere duplicazioni solo dopo test.
5. Consolidare UI namespace:
   - scegliere tra `src/shared/components/ui` e `src/components/ui`;
   - aggiornare `components.json`;
   - migrare import in modo incrementale.
6. Riallineare Supabase types:
   - rigenerare tipi;
   - includere tabelle/RPC mancanti;
   - ridurre `as any` e `@ts-ignore` con interventi mirati.

### Criteri Di Successo

- Le pagine dashboard diventano composizioni leggibili e non contenitori monolitici.
- Esiste un solo percorso canonico per individuazioni.
- UI components hanno un namespace unico.
- I tipi Supabase coprono le API realmente usate.
- Gli agenti possono modificare una feature senza leggere molte migliaia di righe.

### Cosa Non Fare Ancora

- Non spezzare pagine grandi senza test o checklist manuale.
- Non rimuovere il percorso legacy individuazioni finche non e chiaro se e ancora usato.
- Non fare migrazione UI namespace in parallelo a refactor funzionali.

## Asse 5: AI/Dev Maintainability

### Evidenze

- Non esiste una guida centrale per agenti AI.
- Le convenzioni reali sono sparse tra README, CONTRIBUTING, docs storici e struttura codice.
- Alcuni file sensibili, come tipi Supabase, migrazioni e workflow individuazioni, richiedono regole di modifica piu esplicite.

### Rischio

Gli agenti AI possono seguire documenti obsoleti, ignorare branch/worktree attivi, modificare file generati o toccare percorsi legacy senza capire il rischio.

### Interventi Consigliati

1. Creare `AGENTS.md` o regole Cursor equivalenti con:
   - mappa rapida del progetto;
   - comandi canonici;
   - confini `app/features/shared/server`;
   - file generati o sensibili;
   - regole per Supabase migrations;
   - regole per segreti/env;
   - checklist prima di cleanup o refactor.
2. Definire safe zones:
   - modifiche a docs;
   - componenti UI isolati;
   - feature con test;
   - script one-off solo se documentati.
3. Definire caution zones:
   - `src/shared/lib/supabase.ts`;
   - `supabase/migrations`;
   - `server/src/jobs`;
   - `src/app/api/campagne-individuazione`;
   - pagine dashboard grandi.
4. Creare una "codebase map" breve:
   - dove entrare per una feature;
   - dove mettere nuovi componenti;
   - dove mettere servizi e hook;
   - dove non mettere business logic.
5. Stabilire una procedura per agenti:
   - leggere roadmap/spec;
   - controllare git status;
   - identificare verifiche minime;
   - proporre piano;
   - modificare in piccoli step;
   - riportare test eseguiti e rischi residui.

### Criteri Di Successo

- Un agente nuovo puo capire dove intervenire in meno tempo.
- Le istruzioni correnti prevalgono sui documenti storici.
- I cleanup futuri sono tracciabili e reversibili.
- Gli agenti non cancellano branch, docs o migrazioni senza conferma.

### Cosa Non Fare Ancora

- Non creare regole troppo rigide prima di confermare le convenzioni finali.
- Non duplicare istruzioni in troppi file.
- Non lasciare guide AI scollegate dalla roadmap architetturale.

## Roadmap Prioritizzata

### Fase 0: Congelare Scope E Baseline

Obiettivo: rendere sicuro il lavoro successivo.

Azioni:

1. confermare branch base;
2. inventariare branch e worktree;
3. registrare script disponibili;
4. eseguire o pianificare baseline verifiche;
5. creare elenco file/docs candidati a cleanup, senza cancellare.

Output:

- inventario branch;
- inventario documenti;
- inventario verifiche;
- lista rischi iniziali.

### Fase 1: Documentazione Canonica

Obiettivo: creare una fonte attendibile per setup e sviluppo.

Azioni:

1. aggiornare README;
2. creare o aggiornare `.env.example` e `server/.env.example`;
3. riscrivere CONTRIBUTING;
4. creare `docs/README.md` come indice;
5. consolidare deploy docs e archiviare fix storici.

Output:

- onboarding funzionante;
- docs storici categorizzati;
- istruzioni env/deploy chiare.

### Fase 2: Regole AI E Convenzioni Dev

Obiettivo: rendere il repo navigabile e modificabile con meno ambiguita.

Azioni:

1. creare guida agenti;
2. documentare confini architetturali;
3. definire safe/caution zones;
4. documentare comandi canonici e verifiche minime;
5. collegare la guida agli hotspot.

Output:

- `AGENTS.md` o regole Cursor;
- codebase map breve;
- checklist per cleanup/refactor.

### Fase 3: Tooling E CI Minima

Obiettivo: impedire regressioni invisibili.

Azioni:

1. aggiungere script `typecheck`;
2. aggiungere script `verify`;
3. triagare lint;
4. decidere quando rimuovere `ignoreDuringBuilds`;
5. aggiungere CI minima.

Output:

- verifica locale unica;
- CI riproducibile;
- policy lint chiara.

### Fase 4: Cleanup Documenti, File E Dipendenze

Obiettivo: ridurre rumore senza cambiare comportamento.

Azioni:

1. spostare o archiviare docs storici;
2. verificare file locali/storici tracciati;
3. verificare dipendenze sospette con strumenti dedicati;
4. rimuovere solo dopo prova di non utilizzo;
5. aggiornare indice docs dopo ogni spostamento.

Output:

- meno documenti ambigui;
- file storici archiviati;
- dipendenze rimosse solo con evidenza.

### Fase 5: Refactor Architetturale Mirato

Obiettivo: ridurre complessita nei punti ad alto impatto.

Azioni:

1. scegliere primo hotspot tra `opere/[id]/page.tsx` e `programmazioni/page.tsx`;
2. scrivere piano specifico;
3. aggiungere test o checklist manuale;
4. estrarre componenti/hook/service;
5. ripetere su hotspot successivi.

Output:

- pagine piu piccole;
- responsabilita piu chiare;
- refactor incrementali e verificati.

### Fase 6: Workflow Individuazioni E Tipi Supabase

Obiettivo: eliminare duplicazioni e cast rischiosi nei punti piu sensibili.

Azioni:

1. confermare percorso canonico worker;
2. documentare fallback o deprecazione serverless;
3. definire contratto frontend-worker;
4. rigenerare o correggere tipi Supabase;
5. ridurre `as any` e `@ts-ignore`.

Output:

- workflow individuazioni chiaro;
- tipi piu affidabili;
- minore rischio su job lunghi.

### Fase 7: Cleanup Branch

Obiettivo: ridurre rumore git solo dopo aver protetto lavoro utile.

Azioni:

1. confrontare branch con `main`/`develop`;
2. identificare branch gia integrati;
3. chiedere approvazione per ogni delete;
4. mantenere worktree attiva se contiene lavoro corrente;
5. documentare decisioni.

Output:

- branch locali classificati;
- cancellazioni solo approvate;
- nessun lavoro perso.

## Ordine Consigliato Di Esecuzione

1. Fase 0: baseline e inventari.
2. Fase 1: docs canoniche.
3. Fase 2: guida AI/dev.
4. Fase 3: verifiche e CI.
5. Fase 4: cleanup documentale/file.
6. Fase 5: refactor hotspot.
7. Fase 6: individuazioni e Supabase types.
8. Fase 7: cleanup branch.

Questo ordine massimizza valore iniziale e riduce il rischio dei refactor successivi. Il cleanup branch resta alla fine per evitare di rimuovere contesto ancora utile.

## Decisioni Da Confermare Prima Dell'Implementazione

1. Branch base del lavoro: `main` aggiornato, `develop`, o nuovo branch dedicato.
2. Percorso UI canonico: `src/shared/components/ui` o `src/components/ui`.
3. Percorso individuazioni canonico: worker come unico percorso o worker con fallback serverless.
4. Formato guida AI: `AGENTS.md`, `.cursor/rules`, o entrambi con responsabilita diverse.
5. Policy documenti storici: archive directory, docs index, o rimozione dopo approvazione.
6. Soglia per rendere lint bloccante in build.

## Verifiche Minime Future

Quando la roadmap passera da read-only a implementazione, ogni PR o step dovrebbe dichiarare:

- comandi eseguiti;
- esito;
- file toccati;
- rischio residuo;
- rollback possibile.

Verifiche candidate:

```bash
npm run lint
npm test
npm run build
npm --prefix server run typecheck
```

Dopo aver aggiunto script dedicati, il comando preferito dovrebbe diventare:

```bash
npm run verify
```

## Deliverable Del Primo Ciclo

Il primo ciclo e completo quando esistono:

- questa roadmap revisionata;
- una lista branch classificata;
- un inventario docs con stato corrente/storico;
- una lista hotspot con priorita;
- una decisione sul primo step implementativo;
- un piano di verifica minimo per ogni step futuro.

## Fuori Scope Per Ora

- cancellazione branch;
- merge/rebase;
- refactor pagine dashboard;
- rimozione dipendenze;
- modifica schema database;
- modifica migrazioni Supabase;
- rimozione workflow individuazioni legacy;
- cambio deploy configuration.

Queste attivita richiedono piani dedicati e approvazioni puntuali.
