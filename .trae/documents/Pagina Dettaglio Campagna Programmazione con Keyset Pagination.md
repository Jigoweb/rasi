## Obiettivo
- Creare una pagina `dashboard/programmazioni/[id]` che mostra tutte le `programmazioni` associate a una campagna (`campagna_programmazione_id = [id]`).
- Ottimizzare il caricamento con **keyset pagination** (no offset su dataset molto grande) e filtri efficienti.
- Allineare stile e architettura agli standard già presenti (UI shadcn, servizi in `features`, Supabase client unico).

## Routing & Architettura
- Nuova route: `src/app/dashboard/programmazioni/[id]/page.tsx`.
- Componente client, coerente con `src/app/dashboard/programmazioni/page.tsx` per interattività (ricerca, scroll, badge, tabella).
- Header con dettagli sintetici della campagna (nome, emittente, anno, stato) recuperati via servizio.
- Lista risultati con tabella, pulsante "Carica altri" e/o `IntersectionObserver` per infinite scroll.

## Servizi & Query
- Nuovi metodi in `src/features/programmazioni/services/programmazioni.service.ts` (stesso modulo dei metodi esistenti come `getCampagneProgrammazione` in 1–31 e `deleteCampagnaProgrammazione` in 102–110):
  - `getCampagnaById(id)` → `select('*, emittenti(nome)')` per header.
  - `listProgrammazioniByCampagnaKeyset({ campagnaId, limit, cursor, filters })`:
    - Filtro: `.eq('campagna_programmazione_id', campagnaId)`.
    - Ordinamento stabile: `.order('created_at', { ascending: false })` e `.order('id', { ascending: false })`.
    - Keyset: prima pagina senza cursore; pagine successive con `.lt('created_at', cursor.created_at)` o tie-break `.or('created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})')` se necessario.
    - Filtri opzionali: `ilike('titolo', '%q%')`, `eq('processato', false)`, range su `data_trasmissione`.
    - `limit` conservativo (es. 200).
    - Ritorna `{ data, nextCursor }` dove `nextCursor = { created_at, id }` dell’ultimo record.

## Indici & Performance (DB)
- Aggiunta indice composto per rendere la query efficiente su grandi volumi:
  - `CREATE INDEX IF NOT EXISTS idx_programmazioni_campagna_created ON programmazioni(campagna_programmazione_id, created_at DESC, id DESC);`
- Uso di indici esistenti:
  - `idx_programmazioni_trgm_titolo` per ricerche su `titolo` (01_indexes.sql).
  - `idx_programmazioni_data` per ordinamenti/filtri su `data_trasmissione` (00_schema.sql:547).

## UI & UX
- Tabella con colonne: `data_trasmissione`, `ora_inizio`, `durata_minuti`, `titolo`, `tipo_trasmissione`, `fascia_oraria`.
- Toolbar filtri: ricerca testuale su `titolo`, toggle `processato`, date range.
- Stato caricamento: spinner e badge coerenti con quelli in uso (`Badge`, `Loader2`).
- Paginazione:
  - Prima pagina al mount.
  - "Carica altri" per successive; opzionale auto-load con `IntersectionObserver`.
  - Mostrare contatore `Mostrando N risultati` e proteggere da over-render mantenendo massimo di pagine in memoria.

## Sicurezza & RLS
- Operazioni di sola lettura; rispettano RLS attive (02_rls.sql). Nessun dato sensibile loggato.

## Verifica
- Test manuale con campagna reale e dataset grande.
- Verifica che il tempo per pagina resti costante grazie a keyset (no offset costoso).
- Conferma che filtri usino indici (trigram su `titolo`, indice composto su `campagna_programmazione_id, created_at`).

## Passi di Implementazione
1. Creare `page.tsx` in `dashboard/programmazioni/[id]` con UI coerente e fetch iniziale.
2. Aggiungere i due servizi `getCampagnaById` e `listProgrammazioniByCampagnaKeyset`.
3. Implementare keyset pagination e filtri nel componente.
4. (DB) Applicare indice `idx_programmazioni_campagna_created`.
5. Testare con dataset ampio e rifinire limiti/ordini.

Confermi che proceda con questi step e preparo i file della pagina, i servizi e lo script indice?