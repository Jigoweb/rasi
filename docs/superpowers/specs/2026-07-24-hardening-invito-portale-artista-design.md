# Hardening invito e portale artista (slice 1)

**Data:** 2026-07-24  
**Stato:** Design approvato (in attesa review spec)  
**Branch:** `cursor/hardening-invito-artista-d38e`

## Problema

Il flusso invito artista → area personale (`/dashboard/profilo`) è già implementato,
ma presenta debiti di affidabilità:

1. `auth-context` espone mock di sviluppo (`isAdmin` / `canManageUsers` / `canEditRoles`
   sempre `true`; default ruolo `admin` se utente assente o metadata invalidi).
2. Il callback Auth (`/auth/callback`) ignora errori di `exchangeCodeForSession` e
   redirige comunque a imposta-password o dashboard, con rischio sessione assente.
3. Il cambio ruolo API è riservato solo agli admin, mentre il prodotto richiede che
   un **operatore** possa aggiornare ruoli **fino a operatore**, mai ad admin.
4. L’update ruolo via `PATCH /api/users` rischia di sovrascrivere `user_metadata`
   con solo `{ ruolo }`, cancellando `artista_id` e altri campi.

Verifica DB remoto (`rasi`): la tabella `ripartizioni` esiste con RLS corretta
(artista vede solo le proprie righe). Le policy hanno ancora nomi legacy
`ripartizioni_dettaglio_*` ma la logica è già allineata. **Fuori scope** di questo
slice.

## Obiettivo

Rendere affidabile e sicuro il flusso autenticazione/invito e i permessi ruolo,
senza estendere la UX del profilo artista. Lo slice UX (allineamento/estensione
portale) viene valutato **dopo** il completamento di questo hardening.

## Decisioni prese (brainstorming)

1. **Outcome:** hardening del flusso attuale prima; UX estesa in slice successivo.
2. **Perimetro hardening:** auth mock + errori callback + regole cambio ruolo
   operatore. Nessuna migrazione RLS `ripartizioni`.
3. **Ruolo sempre presente:** in prodotto un utente non può non avere ruolo; in
   codice, se i metadata fossero corrotti, fail-closed (zero privilegi) come rete
   tecnica.
4. **Callback fallito:** pagina dedicata `/auth/link-errore` con messaggi diversi
   per `tipo=invito` e `tipo=auth`.
5. **Approccio:** hardening minimale (Approccio 1), con enforcement UI+API per
   i limiti ruolo operatore.
6. **Operatore e ruoli:** può modificare ruoli fino a `operatore` inclusi
   `collecting` e `artista`; **mai** promuovere o toccare `admin`.

## Contesto tecnico

### Flusso invito (invariato nel successo)

```
/dashboard/utenti → POST /api/users (inviteUserByEmail + metadata ruolo/artista_id)
  → email Supabase → /auth/callback?invite=true
  → /auth/imposta-password → /dashboard/profilo
```

Login successivi: AuthForm → `/dashboard`; middleware artista → `/dashboard/profilo`.

### Collegamento utente–artista

Nessuna tabella `profiles`. Linking via `user.user_metadata`:

- `ruolo`: `admin` | `operatore` | `collecting` | `artista`
- `artista_id`: UUID verso `artisti.id` (solo per ruolo artista)

Helper DB: `get_user_role()`, `get_user_artista_id()` (leggono `raw_user_meta_data`).

### File coinvolti

| Area | Path |
|---|---|
| Auth context | `src/shared/contexts/auth-context.tsx` |
| Callback | `src/app/auth/callback/route.ts` |
| Nuova pagina errore | `src/app/auth/link-errore/page.tsx` |
| API utenti | `src/app/api/users/route.ts` |
| UI utenti | `src/app/dashboard/utenti/page.tsx` |
| Middleware | `src/middleware.ts` (nessuna modifica prevista) |

## Design

### 1. Auth context — permessi reali

File: `src/shared/contexts/auth-context.tsx`

| Ruolo | `isAdmin` | `canManageUsers` | `canEditRoles` | `isArtista` |
|---|---|---|---|---|
| admin | sì | sì | sì | no |
| operatore | no | sì | sì | no |
| artista | no | no | no | sì |
| collecting | no | no | no | no |

Regole aggiuntive:

- Default context (nessun utente / loading): **zero privilegi** (non più mock admin).
- `getUserRole(null)` o ruolo invalido: fail-closed — restituire `collecting`
  (nessun privilegio nella matrice sopra) e **non** defaultare ad `admin`.
- `artistaId` continua a leggere `user_metadata.artista_id`.
- Middleware artista walled-garden resta invariato.

Nota: `canEditRoles = true` per operatore abilita la UI di modifica ruolo; i limiti
su *quali* ruoli sono assegnabili restano in UI + API (sezione 2).

### 2. Cambio ruolo — operatore fino a operatore, mai admin

#### API `PATCH /api/users`

Enforcement server-side (fonte di verità):

| Attore | Target attuale | Nuovo ruolo | Esito |
|---|---|---|---|
| admin | qualsiasi | qualsiasi ruolo valido | 200 (con vincolo anti-self-demote admin esistente) |
| operatore | non-admin | `operatore` \| `collecting` \| `artista` | 200 |
| operatore | non-admin | `admin` | 403 |
| operatore | utente `admin` | qualsiasi | 403 |
| non admin/operatore | — | — | 403 (come oggi) |

Preservazione metadata:

- Prima di `updateUserById`, leggere `user_metadata` corrente del target.
- Merge: `{ ...existingMetadata, ruolo: nuovoRuolo }` — **non** sostituire l’intero
  oggetto con `{ ruolo }`.
- Stesso principio se in futuro altri campi metadata vengono aggiornati.

#### UI `/dashboard/utenti`

- `canEditRoles` true per admin e operatore → mostra “Modifica Ruolo”.
- Nel dialog select:
  - admin: tutte le opzioni `AVAILABLE_ROLES`.
  - operatore: solo `operatore`, `collecting`, `artista` (nascondere `admin`).
- Se il target è già `admin`, l’operatore non deve poter aprire/completare la
  modifica (nascondere azione o disabilitare con messaggio).

### 3. Callback Auth e pagina errore

#### `src/app/auth/callback/route.ts`

Successo (invariato):

- `invite=true` + code ok → `/auth/imposta-password`
- altri link + code ok → `/dashboard`

Errore (nuovo):

- `code` assente, **oppure** `exchangeCodeForSession` restituisce errore →
  redirect a `/auth/link-errore?tipo=invito` se `invite=true`, altrimenti
  `?tipo=auth`.

#### `src/app/auth/link-errore/page.tsx`

- Layout allineato a login / imposta-password (card, branding RASI sobrio).
- `tipo=invito`: “Link di invito non valido o scaduto. Contatta l’amministrazione
  RASI per richiedere un nuovo invito.”
- `tipo=auth` (default se param assente/ignoto): “Link non valido o scaduto.
  Torna al login e riprova.”
- CTA primaria: “Torna al login” → `/auth`.

Naming: `link-errore` (non `invito-errore`) perché copre entrambi i tipi di link.

### 4. Fuori scope (slice successivi)

- Estensione / allineamento UX di `/dashboard/profilo` rispetto alla scheda admin.
- Rename cosmetico policy RLS `ripartizioni_dettaglio_*` → `ripartizioni_*`.
- Restringere RLS `individuazioni` a `artista_id = get_user_artista_id()`.
- Policy repertorio non validato per artisti.
- Obbligo `artista_id` quando si assegna ruolo `artista` fuori dal flusso invito.
- Pagina pubblica artista (`/artisti/[slug]`).

## Testing e criteri di done

### Test mirati

1. Helper/permessi auth: ruolo → flag corretti; default senza privilegi.
2. Logica/API cambio ruolo:
   - admin può assegnare qualsiasi ruolo valido;
   - operatore può assegnare operatore/collecting/artista;
   - operatore → admin = 403;
   - operatore su utente admin = 403;
   - merge metadata preserva `artista_id`.
3. Callback: code mancante o exchange fallito → redirect a
   `/auth/link-errore` con `tipo` corretto.

### Smoke manuale

- Login artista → solo `/dashboard/profilo`.
- Login operatore → utenti: modifica ruolo senza opzione admin.
- Invito ok → password → profilo (regressione).
- Link invito/auth rotto → pagina errore + CTA login.

### Done quando

1. Nessun mock admin in `auth-context`.
2. Operatore può cambiare ruoli fino a operatore, mai ad admin (UI + API).
3. Link Auth fallito → `/auth/link-errore` con messaggio corretto + CTA.
4. Flusso invito di successo invariato.
5. Test mirati verdi.

## Rischi

- Rimuovere i mock può far apparire regressioni UI che oggi “funzionavano” solo
  perché i permessi erano sempre true in locale: verificare login con ruoli reali.
- Update metadata senza merge è un bug latente già in produzione sul cambio ruolo;
  il merge è parte obbligatoria di questo slice.
- La pagina errore non sostituisce il reinvio invito: l’artista deve rivolgersi
  all’amministrazione (già supportato da “Reinvia Invito” in `/dashboard/utenti`).
