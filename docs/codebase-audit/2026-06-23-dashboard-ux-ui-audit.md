# Audit UX/UI Dashboard Core

Data: 2026-06-23

## Sintesi

La dashboard core di RASI e funzionale e ha una base solida: sidebar prevedibile, liste operative coerenti a livello macro, progress indicator globali per processi lunghi e buoni esempi di responsive card in Opere, Artisti e Programmazioni.

Il problema principale non e estetico. E la grammatica UX: navigazione, stati, filtri, badge, tabelle e feedback asincroni cambiano abbastanza da costringere l'utente a rileggere ogni schermata. Per un prodotto operativo questo aumenta carico cognitivo, errori e richieste di supporto.

Health score stimato: 24/40, accettabile ma sotto il livello product-grade.

Priorita raccomandata:

1. Orientamento e stato corrente.
2. Errori, loading, empty state e recovery.
3. Tabelle e azioni accessibili.
4. Vocabolario condiviso per filtri, badge e stati.
5. Riduzione del carico cognitivo nei flussi Programmazioni e Opere.

## Mini-Brief Prodotto

Contesto ricavato da `README.md`, `docs/ARCHITECTURE.md` e dalla struttura dei route file.

- Utenti primari: operatori RASI, amministratori, responsabili di campagne e utenti con compiti ricorrenti su artisti, opere, programmazioni, individuazioni e ripartizioni.
- Obiettivo delle superfici dashboard: permettere lavoro operativo affidabile su dati complessi, import, matching, controlli e job lunghi.
- Registro: product UI. La familiarita e una feature: navigazione standard, stati leggibili, controlli prevedibili, densita gestita.
- Scena d'uso: un operatore lavora su un monitor desktop durante una sessione di back office, alternando liste dense, dettagli e processi asincroni; deve capire in pochi secondi dove si trova e se un processo e sano, bloccato o concluso.
- Tono desiderato: sobrio, istituzionale, chiaro. Non decorativo. L'interfaccia deve sembrare affidabile prima che brillante.
- Vincoli: non e presente `PRODUCT.md` o `DESIGN.md`; il loader Impeccable atteso non esiste nel repository. Le conclusioni sono quindi basate su codice, documentazione e best practice UX, non su un sistema brand formalizzato.

## Metodo

- Due assessment indipendenti: uno qualitativo su Nielsen, cognitive load, product UI e personas; uno meccanico su pattern rilevabili nel codice.
- Detector Impeccable CLI eseguito su `src/app/dashboard` e `src/shared/components`.
- Browser overlay non eseguito: non e stato avviato un dev server e lo scope concordato era audit da codice.
- Scope incluso: navigazione dashboard, Programmazioni, Opere, Artisti, Individuazioni, Ripartizioni.
- Scope escluso: CMS, Utenti, Profilo artista e pagine pubbliche, salvo pattern trasversali gia emersi.

Nota detector: `npx impeccable --json --fast src/app/dashboard src/shared/components` ha restituito exit code 2 con warning e avvisi di engine per Node locale `20.16.0`, mentre `impeccable@3.1.0` richiede Node `>=24`. I finding restituiti sono stati usati come segnali, non come fonte esaustiva.

## Score Nielsen

- Visibility of system status: 2/4. Ci sono progress indicator importanti, ma errori fetch e stati falliti spesso non arrivano in UI.
- Match system / real world: 3/4. Terminologia di dominio buona, ma alcuni stati e CTA non costruiscono chiaramente il ciclo Programmazioni -> Individuazioni -> Ripartizioni.
- User control and freedom: 2/4. Filtri e dialog hanno escape, ma ritorni e recovery non sono sempre deterministici.
- Consistency and standards: 2/4. Pattern simili cambiano tra pagine: tab, search, reset, badge, empty state, tabelle.
- Error prevention: 2/4. Le cancellazioni sono spesso protette, ma alcuni upload/import e job lunghi espongono scelte complesse in momenti delicati.
- Recognition rather than recall: 2/4. Mancano breadcrumb e active state annidati; alcune informazioni critiche sono in tooltip.
- Flexibility and efficiency: 2/4. Ci sono bulk e filtri in alcuni punti, ma non una grammatica uniforme per power user.
- Aesthetic and minimalist design: 3/4. L'interfaccia e sobria, ma le superfici dense hanno troppe azioni concorrenti.
- Error recovery: 1/4. Troppi `console.error` e `alert()`; pochi retry contestuali.
- Help and documentation: 1/4. Poche guide inline nei passaggi complessi.

Totale: 22/40 se misurato severamente, 24/40 considerando i progress indicator gia presenti. Fascia: accettabile, con miglioramenti significativi necessari.

## Cognitive Load

Valutazione sugli 8 punti della checklist Impeccable:

- Single focus: fallisce su Programmazioni e Opere dettaglio, dove molte azioni competono.
- Chunking: parziale. Tabelle e dialog lunghi sono spesso raggruppati, ma non sempre in step chiari.
- Grouping: parziale. Le card aiutano, ma toolbar e azioni per riga hanno pattern variabili.
- Visual hierarchy: parziale. Le CTA primarie non sono sempre una sola per contesto.
- One thing at a time: fallisce nei flussi import, mapping e avvio individuazioni.
- Minimal choices: fallisce in Programmazioni, detail Opere e dialog con selezione artisti.
- Working memory: fallisce per assenza di breadcrumb e ritorni deterministici su detail route.
- Progressive disclosure: parziale. Esistono dialog e menu, ma molte informazioni critiche sono ancora nello stesso layer.

Fallimenti stimati: 4 su 8. Carico cognitivo alto nei flussi operativi principali.

## Cosa Funziona

- `src/app/dashboard/layout.tsx` imposta una navigazione laterale semplice e riconoscibile, con drawer mobile separato.
- `src/app/dashboard/opere/page.tsx` e `src/app/dashboard/artisti/page.tsx` sono buoni riferimenti per tabelle desktop con fallback mobile card e supporto tastiera sulle righe.
- `src/app/dashboard/programmazioni/components/ProgrammazioniTable.tsx` rende visibili stati complessi come upload, individuazione in corso, completata e interrotta.
- I progress indicator globali in `src/shared/components/individuazione-progress-indicator.tsx` e `src/shared/components/export-progress-indicator.tsx` sono una buona base per comunicare job lunghi.

## Finding Prioritari

### P1: Errori Fetch Invisibili O Ambigui

File principali: `src/app/dashboard/individuazioni/page.tsx`, `src/app/dashboard/ripartizioni/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/programmazioni/page.tsx`.

What: in diversi punti gli errori vengono loggati e la UI mostra un array vuoto o uno stato neutro. In `src/app/dashboard/individuazioni/page.tsx`, un errore di caricamento campagne fa `setCampagne([])`, quindi l'utente puo vedere "Nessuna campagna" invece di "Caricamento fallito".

Why: un errore indistinguibile da empty state genera decisioni sbagliate. Un operatore puo pensare che non esistano campagne, quando invece il dato non e stato caricato.

Fix: introdurre un pattern condiviso `DataState` o componenti equivalenti per `loading`, `error`, `empty`, `ready`, con CTA `Riprova`, messaggio specifico e preservazione del contesto filtro.

Suggested command: `/impeccable harden`.

### P1: Navigazione Non Mantiene Orientamento Su Route Annidate

File principali: `src/app/dashboard/layout.tsx`, route dettaglio in `src/app/dashboard/opere/[id]/page.tsx`, `src/app/dashboard/artisti/[id]/page.tsx`, `src/app/dashboard/programmazioni/[id]/page.tsx`, `src/app/dashboard/individuazioni/[id]/page.tsx`.

What: la sidebar usa `pathname === item.href`, quindi le pagine dettaglio non mantengono attiva la voce padre. I ritorni sono spesso `router.back()` o bottoni locali, senza breadcrumb standard.

Why: l'utente deve ricordare da dove arriva e in quale area si trova. Questo e particolarmente fragile se apre un link diretto, ricarica la pagina o arriva da una ricerca.

Fix: usare active matching per segmento, aggiungere breadcrumb condivisi per detail route e sostituire `router.back()` con link deterministici quando la destinazione naturale e nota.

Suggested command: `/impeccable layout`.

### P1: Tabelle Cliccabili Non Uniformi Per Tastiera E Mobile

File principali: `src/app/dashboard/ripartizioni/page.tsx`, `src/app/dashboard/individuazioni/page.tsx`, `src/app/dashboard/opere/page.tsx`, `src/app/dashboard/artisti/page.tsx`, `src/app/dashboard/programmazioni/components/ProgrammazioniTable.tsx`.

What: Opere, Artisti e Programmazioni gestiscono `tabIndex` e `onKeyDown` sulle righe/card. Ripartizioni e Individuazioni usano righe cliccabili senza lo stesso supporto tastiera. Individuazioni concentra informazioni importanti in tooltip.

Why: lo stesso gesto visivo, riga cliccabile, non garantisce la stessa accessibilita. Un utente keyboard-only o screen reader puo non scoprire il dettaglio.

Fix: definire un pattern unico `ClickableRow` o regola di implementazione: `role`, `tabIndex`, `Enter`, `Space`, focus ring, `aria-label`, stop propagation sulle action cell. Per mobile, affiancare card dedicate dove la tabella e troppo larga.

Suggested command: `/impeccable audit`.

### P2: Programmazioni Mescola Troppi Lavori Nella Stessa Superficie

File principali: `src/app/dashboard/programmazioni/page.tsx`, `src/app/dashboard/programmazioni/components/ProgrammazioniTable.tsx`, `src/app/dashboard/programmazioni/components/UploadProgrammazioniDialog.tsx`, `src/app/dashboard/programmazioni/components/MappingWizard.tsx`.

What: la pagina gestisce campagne, emittenti, creazione, upload, mapping, scelta artisti, avvio individuazioni, resume, warning formato e processo bloccato.

Why: e un flusso intrinsecamente complesso, ma oggi l'interfaccia chiede spesso di leggere, decidere e navigare nello stesso momento. Il rischio e maggiore durante import e mapping, dove un errore puo creare dati sbagliati.

Fix: separare mentalmente il ciclo in step visibili per riga: "Prepara dati", "Carica", "Verifica", "Crea individuazioni", "Monitora". Una riga dovrebbe avere una sola CTA primaria contestuale; il resto va in menu secondario o dettaglio.

Suggested command: `/impeccable distill`.

### P2: Search, Filtri E Reset Non Hanno Una Grammatica Unica

File principali: `src/shared/components/search-input.tsx`, `src/app/dashboard/ripartizioni/page.tsx`, `src/app/dashboard/artisti/page.tsx`, `src/app/dashboard/opere/page.tsx`, `src/app/dashboard/individuazioni/page.tsx`, `src/app/dashboard/programmazioni/page.tsx`.

What: esiste `SearchInput`, ma varie pagine ricreano manualmente icona, input, debounce/reset, conteggio risultati e chip filtro.

Why: ogni pagina richiede riapprendimento. Per operatori ricorrenti, la coerenza dei filtri e un acceleratore.

Fix: definire un pattern `FilterToolbar` per search, select, reset, conteggio, chip attivi e empty state filtrato. Partire dalle pagine migliori, Artisti/Opere, e portare Ripartizioni/Individuazioni allo stesso livello.

Suggested command: `/impeccable polish`.

### P2: Badge, Stati E Colori Sono Locali Invece Che Semantici

File principali: `src/app/dashboard/ripartizioni/page.tsx`, `src/app/dashboard/individuazioni/page.tsx`, `src/app/dashboard/programmazioni/components/ProgrammazioniTable.tsx`, `src/app/dashboard/programmazioni/components/ProgrammazioneStatusBadge.tsx`.

What: stati e colori sono hardcoded in molte pagine. Il detector e la scansione meccanica hanno trovato molte classi semantiche locali, con possibili differenze tra `in_corso`, `completata`, `individuata`, `da verificare`, `interrotta`, `uploading`.

Why: il colore dovrebbe insegnare significato. Se giallo, blu e verde cambiano significato tra aree, l'utente non puo costruire memoria operativa.

Fix: creare una tassonomia di stati per tipo di workflow, con label, tono, icona, severita e azione successiva. Non serve migrare tutto subito, ma va definita prima dei prossimi refactor UI.

Suggested command: `/impeccable colorize`.

### P2: Azioni E Informazioni Critiche Stanno Troppo Spesso In Tooltip O Icone

File principali: `src/app/dashboard/individuazioni/page.tsx`, `src/app/dashboard/programmazioni/components/ProgrammazioniTable.tsx`, `src/app/dashboard/ripartizioni/page.tsx`.

What: statistiche e stato di processo possono comparire in tooltip; alcune icone sono piccole e non sempre labelizzate. In Ripartizioni il menu azioni ha trigger icon-only senza `aria-label` visibile nel frammento letto.

Why: tooltip e icone sono fragili su touch, tastiera e screen reader. Le informazioni necessarie per decidere non dovrebbero essere solo hover-based.

Fix: promuovere le informazioni operative essenziali in celle/card visibili, usare tooltip solo per dettagli secondari, aggiungere `aria-label` descrittivi a ogni trigger icon-only.

Suggested command: `/impeccable clarify`.

### P3: Detector Impeccable Ha Segnalato Piccoli Warning Visivi

File principali: `src/app/dashboard/artisti/[id]/page.tsx`, `src/app/dashboard/layout.tsx`, `src/app/dashboard/programmazioni/components/EmittentiTab.tsx`.

What: warning su testo grigio su background colorato e `border-b-2` interpretato come accent border su elemento rounded.

Why: non sono problemi bloccanti, ma confermano che i token visuali sono ancora locali e non sempre controllati.

Fix: rivedere contrasto dei badge colorati e sostituire spinner/border localizzati con token/componenti condivisi.

Suggested command: `/impeccable polish`.

## Persona Red Flags

### Alex, Operatore Esperto

- Vuole capire in fretta se una campagna e caricata, pronta, in errore o completata. Oggi Programmazioni mostra molti stati, ma la CTA primaria non e sempre unica.
- Se un fetch fallisce e vede "nessuna campagna", perde fiducia nel dato.
- Si aspetta filtri coerenti e riusabili tra Opere, Artisti, Individuazioni e Ripartizioni.

### Sam, Utente Tastiera O Screen Reader

- Righe cliccabili diverse tra pagine rompono l'aspettativa di navigazione.
- Tooltip e icon-only button rischiano di nascondere stato e azioni.
- La mancanza di route-level error/loading rende piu difficile capire cosa e cambiato durante navigazioni lente.

### Jordan, Primo Utilizzo Sul Dominio

- "Programmazioni", "Individuazioni" e "Ripartizioni" sono termini corretti, ma il ciclo operativo non e sempre spiegato nel punto in cui serve.
- Senza breadcrumb, una pagina dettaglio aperta da link diretto non comunica chiaramente la sua posizione.
- Empty state come "Nessuna campagna trovata" non sempre suggeriscono il prossimo passo.

### Casey, Mobile O Touch

- Opere e Artisti sono piu robusti grazie alle mobile card.
- Ripartizioni e Individuazioni restano piu tabellari e dipendenti da target piccoli.
- Tooltip su stato e statistiche sono deboli su touch.

## Pattern Da Standardizzare

### Navigazione

- Active state per route annidate.
- Breadcrumb per ogni detail route.
- Link di ritorno deterministici, non basati solo su history.
- Tab con active state, aria semantics e naming coerente.
- Azioni in sidebar senza handler, come Impostazioni, da trasformare in link reale o rimuovere.

### Stati Di Sistema

- `PageLoading` o skeleton coerente.
- `PageError` con retry.
- `EmptyState` con differenza tra "nessun dato" e "nessun risultato filtrato".
- `AsyncActionState` per save/delete/import/export.
- Route-level `loading.tsx`, `error.tsx`, `not-found.tsx` almeno per segmenti dashboard principali, o motivazione documentata quando si usa stato client locale.

### Tabelle E Liste

- `ClickableRow` accessibile.
- Mobile card per liste operative non leggibili in tabella.
- Action cell sticky coerente.
- Una CTA primaria per riga.
- Secondary actions in menu, con label e shortcut futuri.

### Filtri

- Search con clear button.
- Reset all coerente.
- Conteggio risultati coerente.
- Chip filtri attivi.
- Empty state filtrato con CTA "Cancella filtri".

### Badge E Stati

- Mappa stato -> label -> tono -> icona -> descrizione -> prossima azione.
- Niente colori locali se il significato e condiviso.
- Distinguere stato dati, stato job e stato workflow.

## Quick Wins

1. Aggiornare active state in `src/app/dashboard/layout.tsx` per includere route figlie.
2. Aggiungere `aria-label` ai trigger icon-only in tabelle e tooltip.
3. Sostituire `router.back()` nei dettagli principali con link espliciti verso la lista padre.
4. Introdurre empty state filtrato con CTA reset in Ripartizioni e Individuazioni.
5. Rendere errori fetch visibili in Individuazioni e Ripartizioni.
6. Documentare una mappa comune degli stati prima di migrare i badge.

## Interventi Strutturali

1. Creare componenti o convenzioni per `PageState`, `FilterToolbar`, `ClickableRow`, `WorkflowStatusBadge`.
2. Uniformare mobile card su Ripartizioni e Individuazioni usando Opere/Artisti come riferimento.
3. Spezzare Programmazioni in workflow leggibili, senza cambiare logica backend: overview campagne, import/mapping, individuazioni.
4. Introdurre breadcrumb condivisi per route dashboard.
5. Consolidare il namespace UI dopo decisione architetturale gia aperta in `docs/ARCHITECTURE.md`.

## Sequenza Raccomandata

### Slice 1: Orientamento

- Active state annidato.
- Breadcrumb condivisi.
- Link deterministici di ritorno.
- Rimozione o implementazione di azioni inerti.

Motivo: basso rischio, alto impatto, riduce subito recall e supporta ogni flusso successivo.

### Slice 2: Stato E Recovery

- Page error con retry.
- Empty state distinti.
- Loading coerenti.
- Route states per segmenti principali.

Motivo: corregge il rischio piu grave, cioe far sembrare vuoto un dato non caricato.

### Slice 3: Liste Operative

- Clickable row accessibile.
- Mobile cards per Ripartizioni e Individuazioni.
- Filter toolbar comune.

Motivo: porta le liste deboli al livello delle pagine migliori gia presenti.

### Slice 4: Programmazioni

- Ridurre CTA concorrenti.
- Esplicitare stato workflow per riga.
- Rendere import/mapping un percorso guidato.

Motivo: e il flusso piu complesso e va affrontato dopo avere standardizzato navigazione e stati.

### Slice 5: Visual System

- Stato badge condiviso.
- Colori semantici.
- Contrasto e token.
- Cleanup namespace UI.

Motivo: evita refactor estetici locali e prepara una grammatica riusabile.

## Comandi Impeccable Suggeriti

1. `/impeccable layout dashboard navigation`: active state, breadcrumb, tab e ritorni.
2. `/impeccable harden dashboard data states`: error/loading/empty/retry.
3. `/impeccable audit dashboard tables`: accessibilita righe, icon-only, mobile card.
4. `/impeccable distill programmazioni`: riduzione carico cognitivo e CTA contestuali.
5. `/impeccable colorize dashboard status badges`: tassonomia stati e colori.
6. `/impeccable polish dashboard core`: passata finale su coerenza e dettagli.

## Residual Risk

- Questa review non include validazione visuale in browser, quindi spacing, contrasto reale e responsive breakpoints andranno verificati in una sessione live.
- Senza `PRODUCT.md` e `DESIGN.md`, il giudizio e solido su UX operativa ma non completo su brand e tono.
- Alcuni conteggi meccanici sono intenzionalmente grezzi: colori hardcoded e `onClick` includono casi corretti e falsi positivi.
