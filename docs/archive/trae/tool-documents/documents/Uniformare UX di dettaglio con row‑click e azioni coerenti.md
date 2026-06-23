## Analisi stato attuale
- Artisti: pagina `src/app/dashboard/artisti/page.tsx` usa Dialog per "Visualizza" (righe non cliccabili) e route `/dashboard/artisti/[id]` per "Profilo".
- Opere: pagina `src/app/dashboard/opere/page.tsx` naviga a `/dashboard/opere/[id]` su azione "Visualizza"; righe non cliccabili.
- Programmazioni Campagne: pagina `src/app/dashboard/programmazioni/page.tsx` usa Dialog per "Visualizza"; esiste pagina di dettaglio nuova `/dashboard/programmazioni/[id]`.
- Campagne (individuazione/ripartizione): pagina `src/app/dashboard/campagne/page.tsx` usa Dialog per dettaglio; non c’è route di dettaglio.

## Obiettivo UX
- Clic sulla row apre la pagina di dettaglio relativa.
- Azioni coerenti nei menu: "Dettaglio" (naviga), "Modifica" (modal inline), "Elimina" (conferma + azione), eventuali azioni specifiche (es. Upload) dopo.
- Accessibilità: righe focusabili con `tabIndex`, apertura con Enter; `cursor-pointer`, `hover:bg-gray-50`; prevenire conflitti con menu azioni via `stopPropagation`.

## Modifiche proposte
- Artisti (`src/app/dashboard/artisti/page.tsx`):
  - Aggiungere `onClick={() => router.push('/dashboard/artisti/'+id)}` su `TableRow` e `tabIndex={0}` + handler Enter.
  - Aggiornare Dropdown: "Dettaglio" → navigazione; lasciare "Modifica" in modal; rimuovere Dialog "Visualizza" per coerenza.
  - Applicare `onClick={(e)=>e.stopPropagation()}` su `DropdownMenuTrigger`.
- Opere (`src/app/dashboard/opere/page.tsx`):
  - Aggiungere row‑click navigazione a `/dashboard/opere/[id]` (attuale Visualizza già naviga).
  - Uniformare label azioni: "Dettaglio", "Modifica", "Elimina"; mantenere modal edit.
- Programmazioni Campagne (`src/app/dashboard/programmazioni/page.tsx`):
  - Aggiungere row‑click navigazione a `/dashboard/programmazioni/[id]`.
  - Aggiornare azioni: "Dettaglio" → naviga; rimuovere Dialog "Dettagli".
  - Lasciare Upload/Elimina coerenti.
- Campagne (individuazione/ripartizione):
  - Creare `src/app/dashboard/campagne/[id]/page.tsx` (dettaglio) con contenuti del Dialog corrente.
  - Row‑click su tabella campagne apre `/dashboard/campagne/[id]`.

## Pattern riutilizzabili
- Wrapper utility per row cliccabili: props `onOpen`, set `role='button'`, `aria-label`, `onKeyDown` per Enter.
- Icone e copy uniformi: "Dettaglio" (Eye), "Modifica" (Edit), "Elimina" (Trash2).
- `DropdownMenuTrigger` con `onClick={e=>e.stopPropagation()}` e stesso per item.

## Verifica
- Testare navigazione via click e tastiera su tutte le liste.
- Confermare che i menu non interferiscano con la navigazione (stopPropagation).
- Controllare coerenza dei testi e icone.

## Passi
1. Aggiornare liste Artisti/Opere/Programmazioni Campagne con row‑click + stopPropagation.
2. Uniformare label e comportamento delle azioni.
3. Creare pagina dettaglio Campagne e collegare row‑click.
4. Rimuovere/convertire i Dialog di "Visualizza" in navigazione.

Procedo ad applicare le modifiche nei file indicati e ad aggiungere la nuova pagina di dettaglio campagne?