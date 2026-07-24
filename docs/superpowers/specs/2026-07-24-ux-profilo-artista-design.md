# UX portale profilo artista (slice 2)

**Data:** 2026-07-24  
**Stato:** Design approvato (in attesa review spec)  
**Branch:** `cursor/ux-profilo-artista-d38e`  
**Dipende da:** slice 1 hardening (auth/invito) — indipendente a livello codice pagina

## Problema

`/dashboard/profilo` è già l’area personale artista (walled garden), ma:

1. La UI è funzionale ma grezza (header, tab mobile, empty state).
2. Mancano alcuni campi informativi presenti nello schema/admin (dati societari; note repertorio).
3. L’artista non può aggiornare i propri dati: tutto è sola lettura, nonostante RLS permetta già l’update sul proprio record.

## Obiettivo

Migliorare leggibilità e completezza informativa del profilo, e consentire all’artista di modificare anagrafica/contatti in **modalità edit inline** sulla tab Dati Personali, con whitelist campi lato app.

## Decisioni prese (brainstorming)

1. **Scope:** A (polish) + B (campi mancanti / empty state) + C (edit), senza ricerca repertorio.
2. **Campi editabili:** nome, cognome, nome d’arte, CF, data/luogo nascita, tipologia, contatti, indirizzo.
3. **Sola lettura:** stato, date mandato, territorio, IPN, is_rasi, IMDB, diritti, paese, stato_validazione.
4. **UX edit:** inline sulla tab Dati (toggle Modifica → Salva/Annulla), non modal né route dedicata.
5. **Allineamento info:** card dati societari se presenti; colonna note repertorio; empty state chiari; polish sezioni esistenti.
6. **Approccio:** evolve in place su `/dashboard/profilo` (Approccio 1), con estrazione leggera componenti se serve.

## Contesto tecnico

- Route: `src/app/dashboard/profilo/page.tsx`
- Layout Area Artista: `src/app/dashboard/layout.tsx` (fuori scope restyling globale)
- Service: `getArtistaById`, `getPartecipazioniByArtistaId`, `updateArtista` in `src/features/artisti/services/artisti.service.ts`
- RLS `artisti_update_policy`: artista può aggiornare `id = get_user_artista_id()` (nessuna migrazione richiesta)
- RLS non è field-level → **whitelist obbligatoria** nel payload self-service

## Design

### 1. UI struttura

**Header**
- Nome + cognome in evidenza; nome d’arte secondario
- Badge stato; meta IPN / territorio

**Tab** (invariati come set)
- Dati Personali | Repertorio | Trasmissioni | Compensi
- Mobile: navigazione tab scrollabile orizzontalmente

**Empty state** (repertorio / trasmissioni / compensi)
- Icona + messaggio breve (es. “Nessuna partecipazione registrata.”)

**Dati Personali — view**
- Card Anagrafica, Contatti, Mandato (RO), Identificativi (RO)
- Card “Dati societari” solo se almeno uno tra: ragione sociale, forma giuridica, P.IVA

**Repertorio**
- Aggiungere colonna Note quando valorizzata / sempre con `-` se assente
- Tabella e empty state allineati al resto del polish

### 2. Flusso edit inline

1. In view mode, CTA “Modifica dati” (solo tab Dati Personali).
2. Enter edit: i campi whitelist diventano input; i campi RO restano testo.
3. Azioni: **Salva** | **Annulla**.
4. Validazione:
   - `nome`, `cognome` obbligatori
   - email in `contatti` (se presente): formato base
   - `codice_fiscale` (se presente): trim/uppercase; check lunghezza 16 caratteri alfanumerici (IT) — soft fail con messaggio se formato palesemente errato
5. Salvataggio → `updateArtista(artistaId, payloadWhitelist)`; successo → view + messaggio; errore → resta in edit.

### 3. Whitelist payload

Helper puro (es. `src/features/artisti/lib/artista-self-update.ts`):

```ts
buildArtistaSelfUpdatePayload(form): ArtistaSelfUpdatePayload
```

Campi ammessi:

| Campo | Note |
|---|---|
| `nome`, `cognome` | required |
| `nome_arte`, `codice_fiscale`, `data_nascita`, `luogo_nascita`, `tipologia` | opzionali |
| `contatti` | JSON `{ email?, telefono? }` |
| `indirizzo` | JSON `{ via?, civico?, cap?, citta?, provincia? }` |

Mai inclusi: `stato`, `data_inizio_mandato`, `data_fine_mandato`, `territorio`, `codice_ipn`, `is_rasi`, `imdb_nconst`, `diritti_attivi`, `stato_validazione`, `ragione_sociale`, `forma_giuridica`, `partita_iva` (societari restano RO in questo slice), ecc.

### 4. Componenti

Preferenza: restare su `profilo/page.tsx` con estrazione leggera se il file cresce troppo, es.:

- `src/app/dashboard/profilo/components/profilo-dati-tab.tsx` (view + edit)
- helper in `src/features/artisti/lib/artista-self-update.ts`

Niente riuso di `ArtistaFormMultistep` (pensato per operatori).

### 5. Fuori scope

- Ricerca/filtro repertorio
- Edit campi mandato / IPN / societari / IMDB
- Migrazioni RLS / rename policy
- Pagina pubblica artista
- Redesign completo layout Area Artista

## Testing e criteri di done

### Test mirati

1. `buildArtistaSelfUpdatePayload` include solo whitelist; esclude campi RO anche se passati per errore.
2. Validazione: nome/cognome mancanti → errore; CF invalido → errore; email invalida → errore.
3. (Opzionale) smoke component se già c’è harness sulla page.

### Smoke manuale

- View profilo leggibile su desktop e mobile (tab)
- Compilare edit → Salva → dati aggiornati
- Annulla non persiste
- Tentativo di non mostrare CTA edit fuori dalla tab Dati

### Done quando

1. Header/tab/empty state migliorati.
2. Dati societari e note repertorio visibili dove applicabile.
3. Edit inline con whitelist funzionante.
4. Test helper verdi.

## Rischi

- RLS update permette qualsiasi colonna sul proprio row: senza whitelist un client malevolo potrebbe alterare mandato/IPN. La whitelist nel payload è requisito di sicurezza applicativa.
- `tipologia` è enum DB: il select deve usare solo valori validi già noti all’app.
- Campi JSON `contatti`/`indirizzo`: fare merge con oggetti esistenti per non cancellare chiavi non editabili eventuali.
