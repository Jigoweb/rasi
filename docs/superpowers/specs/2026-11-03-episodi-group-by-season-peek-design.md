# Episodi: raggruppamento per stagione con anteprima (peek)

**Data:** 2026-11-03  
**Stato:** Design approvato (layout B)

## Contesto

Nella scheda opera (`/dashboard/opere/[id]`), la card **Episodi** elenca tutti gli episodi in una tabella piatta (desktop) o card (mobile). Per serie lunghe la lista è difficile da scorrere. Serve raggruppare per stagione con anteprima collassabile e azioni riga più compatte.

## Decisioni

| Tema | Scelta |
|------|--------|
| Default all’apertura | Tutte le stagioni in **anteprima** (non completamente nascoste) |
| Layout anteprima | **B**: ~1,5 righe visibili, fade bianco in basso, CTA **Espandi stagione** centrata sull’overlay |
| Mobile | Stesso comportamento delle card |
| Conteggio | Header `Stagione N · X episodi` |
| Azioni riga | Menu contestuale `⋯` a destra (Modifica / Elimina), pattern Artisti |
| Persistenza stato | No: refresh = tutto in anteprima |
| Scope dati | Solo UI + helper puro; nessuna migrazione DB |

## UX

Per ogni stagione (ordinate crescenti per `numero_stagione`):

1. **Header:** `Stagione N · X episodi` (plurale italiano corretto: 1 episodio / N episodi).
2. **Anteprima:** contenitore con altezza fissa ≈ 1,5 righe episodio, `overflow: hidden`, gradient bianco dal basso, bottone centrato **Espandi stagione**.
3. **Espanso:** altezza libera, overlay nascosto; **Riduci** compare nel header stagione (a destra, al posto della CTA overlay).
4. **Stagione con meno di 2 episodi:** niente fade e niente Espandi/Riduci; elenco intero.
5. Desktop e mobile condividono lo stesso stato expand per stagione.

## Implementazione

### Helper

Nuovo modulo testabile, es. `src/features/opere/lib/episodi-by-stagione.ts`:

- Input: lista episodi (già ordinata o da ordinare per stagione/episodio).
- Output: array di gruppi `{ stagione: number | null, episodi: T[], count: number }`.
- `numero_stagione` null/undefined → gruppo **Senza stagione**, in coda dopo le stagioni numeriche.
- Ordine episodi entro gruppo: `numero_episodio` crescente.

### UI (pagina dettaglio)

File principale: `src/app/dashboard/opere/[id]/page.tsx` (eventuale estrazione componente locale se la sezione cresce troppo).

- Stato: `expandedSeasons: Set<number | 'none'>` (chiave stagione; `'none'` per senza stagione).
- **Non** usare Accordion/Collapsible Radix che montano contenuto a height 0: l’anteprima richiede contenuto renderizzato e clip CSS.
- Desktop: una sezione per stagione; dentro mini-tabella con le colonne attuali (Episodio, titoli, data, durata, tconst, ISAN). La colonna “Stagione” per-riga può restare o essere omessa perché già nell’header gruppo — **omettere** la colonna Stagione nelle mini-tabelle per ridurre rumore.
- Mobile: stesso header + peek sulle card episodio.
- Overlay peek: il gradient ha `pointer-events: none`; solo il bottone Espandi ha `pointer-events: auto` e `z-index` sopra il fade, così il menu `⋯` delle righe parzialmente visibili resta cliccabile.

### Azioni riga

Sostituire le due icon-button Modifica/Elimina con:

```
DropdownMenu + MoreHorizontal
  - Modifica episodio → openEditEpisodioDialog
  - Elimina episodio → openDeleteEpisodioDialog (destructive)
```

Allineato a `src/app/dashboard/artisti/page.tsx`. Stesso menu su desktop e mobile. Colonna azioni fissa a destra della riga; con gradient `pointer-events: none` resta raggiungibile anche in anteprima.

## Edge case

- Lista vuota: empty state attuale invariato.
- Una sola stagione con molti episodi: un solo blocco peek.
- Import / Aggiungi episodio: dopo refresh dati, tutte le stagioni tornano in anteprima (nessuna memoria).
- Dialog e import actions nell’header card restano invariati.

## Test

- Unit: `groupEpisodiByStagione` — ordinamento stagioni, conteggio, gruppo null in coda, ordine episodi.
- Pagina: con ≥2 episodi stessa stagione, compare header con conteggio e controllo Espandi; dopo click, compare Riduci e più di una riga completa.

## Fuori scope

- Persistenza expand in localStorage / URL
- Espandi tutto / Riduci tutto globale
- Raggruppamento nella lista catalogo `/dashboard/opere` (non dettaglio)
- Cambio schema o API episodi
- Virtualizzazione liste molto lunghe
