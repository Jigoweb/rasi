## Obiettivi
- Uniformare comportamenti di navigazione e azioni su liste e dettagli
- Migliorare leggibilità, densità informativa e coerenza visiva
- Ottimizzare comportamento responsive su mobile e tablet
- Rafforzare accessibilità (tastiera, aria, focus) e stati (loading/empty/error)
- Mantenere performance elevate (keyset pagination, query minimali)

## Stato Attuale (Sintesi)
- Righe cliccabili e menu azioni coerenti già applicati su liste principali
- Dettaglio campagna programmazione mostra tabella programmazioni e pannello "Data Health"
- Alcuni campi della tabella programmazioni non erano allineati al DB; già corretti con colonne Stato/Canale/Tipo/Descrizione (src/app/dashboard/programmazioni/[id]/page.tsx:228–272)

## Linee Guida di Design
- Spaziatura: scala 4/8/12/16/24/32; consistenza tra sezioni
- Tipografia: titoli H1/H2 coerenti, numeri in `font-mono` per date/ID
- Colori: usare varianti `outline`/`secondary` di shadcn per stati; evitare colori custom non necessari
- CTA principali sempre visibili; azioni secondarie in menu contestuale

## Navigazione e Azioni
- Rendere tutte le row e le card mobile cliccabili con `Enter`; mantenere `stopPropagation` su trigger/menu
- Aggiungere `focus:ring` evidente su elementi interattivi
- Breadcrumb leggero nelle pagine di dettaglio accanto al bottone Indietro

## Tabelle e Responsive
- Desktop: ordine colonne standard (Stato, Data, Ora, Canale, Titolo+Descrizione, Tipo, Durata, Fascia)
- Mobile: trasformare tabelle in card impilate con le stesse info chiave
- Sticky header su liste lunghe; contenitore con scroll orizzontale su colonne extra
- Stati:
  - Loading: skeleton coerenti
  - Empty: messaggio con suggerimenti (filtri, reset)
  - Error: inline banner non-bloccante

## Filtri e Ricerca
- Barra filtri unica: Ricerca (debounced 300ms), Select `processato`, Range date, `Applica`/`Reset`
- Chips riassuntive dei filtri attivi con pulsante `x` per rimuoverle

## Pagine di Dettaglio
- Pannello Data Health: percentuali e periodo già presenti; ampliare metriche utili (es. incongruenze ora_fine<ora_inizio, duplicati per chiavi titolo+data+ora)
- Sezioni "Meta" della campagna con emittente/anno/stato in griglia compatta

## Accessibilità
- Tab order coerente; tutte le azioni raggiungibili da tastiera
- `aria-label` su icone di stato; titolo esplicativo via wrapper `title`
- Contrasto colori ≥ AA; focus visibile e non nascosto

## Prestazioni
- Mantenere keyset pagination già presente (src/features/programmazioni/services/programmazioni.service.ts:149–187)
- Query aggregate per health (count/head/min/max) già in uso; estendere senza carichi completi
- Debounce su ricerca lato client; niente `ilike` ad ogni keypress

## Implementazione (Step-by-step)
1. Uniformare head/ordine colonne e sticky header su tutte le liste dashboard
   - src/app/dashboard/campagne/page.tsx, artisti/page.tsx, opere/page.tsx, programmazioni/page.tsx
2. Card responsive per mobile
   - Riutilizzare pattern di artisti card cliccabili; aggiungere Canale/Tipo/Durata; azioni coerenti
3. Barra filtri unificata con chips e debounce
   - Aggiornare `listProgrammazioniByCampagnaKeyset` solo su `Applica`; `Reset` pulisce stato
4. Migliorie dettaglio campagna
   - src/app/dashboard/programmazioni/[id]/page.tsx
   - Stato icone con `title` wrapper; descrizione troncata; canale fallback su emittente
5. Accessibilità globale
   - `tabIndex` e `onKeyDown` su card e righe; `aria-label` su bottoni icona; focus-ring coerente
6. Stati di caricamento/empty/error coerenti
   - Skeleton per tabelle e card; messaggi contestuali
7. Performance
   - Debounce 300ms ricerca; mantenere paginazione a 200; caricare successive con bottone

## Verifica
- Test tastiera su tutte le liste (Tab/Enter/Escape)
- Test responsive su breakpoints sm/md/lg/xl
- Verifica query aggregate e conteggi health
- QA su coerenza spaziature/colonne

## Deliverable
- Liste e dettaglio con UX/UI uniformata e responsive ottimizzato
- Accessibilità migliorata e performance stabili

## Conferma
Procedo ad applicare i cambi richiesti su liste e dettaglio seguendo il piano sopra?