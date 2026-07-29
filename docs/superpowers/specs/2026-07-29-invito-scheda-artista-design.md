# Invito artista dalla scheda dettaglio

**Data:** 2026-07-29  
**Stato:** Design approvato (in attesa review spec)  
**Branch:** `cursor/invito-scheda-artista-d38e`

## Problema

L’invito al portale artista esiste solo da `/dashboard/utenti` (dialog email +
selezione artista). Operatori che lavorano sulla scheda
`/dashboard/artisti/[id]` non vedono se l’artista ha già un account, né possono
invitare/reinviare senza cambiare pagina.

## Obiettivo

Sulla scheda artista, admin e operatore vedono lo **stato accesso portale** e
possono **Invitare** o **Reinviare**, riusando il flusso Supabase Auth già
implementato in Utenti.

## Decisioni prese (brainstorming)

1. **Scope:** stato + azioni Invita/Reinvia (non scollega/elimina/reset su Attivo).
2. **Email:** precompilata da `artista.contatti.email` se presente, **modificabile**;
   warning se diversa da contatti (come in Utenti).
3. **Permessi:** admin e operatore (`canManageUsers`), come `/dashboard/utenti`.
4. **UI:** blocco compatto in **header** (badge + bottone), non card dedicata.
5. **Stati:** Non invitato / Invito in attesa / Attivo (derivati da Auth).
6. **Superficie:** solo scheda dettaglio; **non** lista artisti.
7. **Approccio:** riuso API utenti + lookup `GET ?artista_id=` server-side
   (Approccio 1).

## Contesto tecnico

Flusso invito esistente:

- UI: `src/app/dashboard/utenti/page.tsx`
- API: `POST /api/users` con `{ email, artista_id }` o
  `{ action: 'resend_invite', userId }`
- Metadata Auth: `ruolo: 'artista'`, `artista_id`
- Callback: `/auth/callback?invite=true` → imposta-password → profilo

Collegamento utente↔artista: solo `user_metadata.artista_id` (nessuna tabella
profiles).

Scheda target: `src/app/dashboard/artisti/[id]/page.tsx` (header con Modifica).

## Design

### 1. Derivazione stato

| Stato UI | Condizione | Azione header |
|---|---|---|
| Non invitato | nessun Auth user con `artista_id` = id scheda | **Invita** |
| Invito in attesa | user collegato e `last_sign_in_at` assente | **Reinvia** |
| Attivo | user collegato e `last_sign_in_at` presente | nessuna (solo badge; email opzionale) |

Helper puro testabile, es. `deriveArtistaInviteStatus(linkedUser | null)`.

### 2. API

#### `GET /api/users?artista_id=<uuid>`

- Stessi permessi di GET lista: admin/operatore via bearer.
- Server: trova utente con `user_metadata.artista_id === artista_id`
  (lookup mirato; **non** esporre lista completa al client della scheda).
- Risposte:
  - `{ success: true, data: { linked: false } }`
  - `{ success: true, data: { linked: true, user: { id, email, ruolo, invited_at, last_sign_in_at } } }`

Il GET lista senza query resta invariato per la pagina Utenti.

#### Azioni (invariate)

- Invita: `POST /api/users` `{ email, artista_id }`
- Reinvia: `POST /api/users` `{ action: 'resend_invite', userId }`

Validazioni esistenti (artista esiste, email non duplicata, artista non già
collegato) restano la fonte di verità.

### 3. UI scheda artista

Nell’header, per utenti con `canManageUsers`:

1. Carica stato all’ingresso pagina (`artista.id`).
2. Mostra badge stato.
3. **Invita** → dialog:
   - email precompilata da `contatti.email`
   - editabile
   - warning mismatch vs contatti
   - conferma → POST invite → refresh stato
4. **Reinvia** → POST resend → feedback successo/errore → refresh stato.
5. **Attivo** → badge (+ email account se utile), senza bottone.

Se `!canManageUsers`, nessun blocco invito (scheda resta come oggi per altri
ruoli se mai raggiungibile).

Componente consigliato: es. `ArtistaInviteHeader` accanto ai bottoni esistenti,
per non gonfiare ulteriormente `page.tsx`.

### 4. Fuori scope

- Badge/azioni in `/dashboard/artisti` (lista)
- Scollega account, elimina utente, reset password su Attivo
- Aggiornare automaticamente `contatti.email` quando si invita con email diversa
- Cambi al portale `/dashboard/profilo` o al flusso callback

## Testing e criteri di done

### Test mirati

1. `deriveArtistaInviteStatus`: null → non invitato; senza login → in attesa;
   con login → attivo.
2. GET `?artista_id=`: risposta linked false / true con campi attesi
   (mock admin listUsers).

### Smoke

- Scheda artista senza account → Invita → stato “in attesa”
- Reinvia da scheda
- Artista già attivo → solo badge
- Operatore vede azioni; coerente con Utenti

### Done quando

1. Header mostra stato corretto.
2. Invita/Reinvia funzionano come da Utenti.
3. Nessuna regressione GET lista utenti / POST invite.
4. Test helper (e lookup se estratto) verdi.

## Rischi

- `listUsers` Admin API non filtra per metadata: il lookup server deve restare
  accettabile (paginazione se necessario) e non spostare il carico sul browser.
- Email digitate diverse da `contatti.email` non aggiornano i contatti artista
  (scelta esplicita fuori scope); l’account Auth userà l’email dell’invito.
- Dopo invite, lo stato dipende da Auth; refresh immediato post-POST è obbligatorio.
