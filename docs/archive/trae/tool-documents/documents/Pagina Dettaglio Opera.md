## Obiettivo
Creare una pagina di dettaglio per una singola Opera che mostri:
- Informazioni principali dell’opera (titolo, titolo originale, tipo, anno, codici esterni, IMDb tconst)
- Partecipazioni degli artisti registrati (ruolo, personaggio, stato, eventuale episodio)
- Episodi associati se l’opera è una serie TV (stagione, episodio, titolo, data)
- Azioni utili (Modifica, Importa da IMDb se presente tconst)

## Percorso e Routing
- Aggiungere la pagina: `src/app/dashboard/opere/[id]/page.tsx`
- Accesso tramite URL: `/dashboard/opere/:id`
- Integrare link “Visualizza” nel dropdown della tabella Opere per navigare al dettaglio

## Dati e Servizi (Supabase)
### Dati principali opera
- Riutilizzare `getOperaById(id)` da `src/features/opere/services/opere.service.ts` per i campi base

### Partecipazioni per Opera
- Aggiungere un servizio `getPartecipazioniByOperaId(operaId: string)` in `opere.service.ts` con select:
  - Tabella `partecipazioni` filtrata per `opera_id = operaId`
  - Join embedded:
    - `artisti(id, nome, cognome, nome_arte)`
    - `ruoli_tipologie(id, nome, descrizione)`
    - `episodi(id, numero_stagione, numero_episodio, titolo_episodio)`
  - Campi utili: `personaggio`, `note`, `stato_validazione`, `created_at`

### Episodi per Opera (solo serie_tv)
- Aggiungere un servizio `getEpisodiByOperaId(operaId: string)` su tabella `episodi`:
  - Selezionare: `id, numero_stagione, numero_episodio, titolo_episodio, data_prima_messa_in_onda, durata_minuti`
  - Ordinamento: stagione, episodio

## UI/UX della Pagina
### Header
- Titolo grande dell’opera, badge tipo (Film/Serie TV/Documentario/Altro)
- Sottotitolo: titolo originale (se presente) e anno
- CTA:
  - `Modifica` (apre form esistente di modifica opera)
  - `Importa da IMDb` (se `imdb_tconst` presente, richiama `getTitleById` e aggiorna i campi)

### Sezione “Informazioni”
- Griglia con campi: codice opera, tipo, anno, IMDb tconst (linkabile), codici esterni (mostrati in forma leggibile), created/updated

### Sezione “Partecipazioni”
- Tabella/card responsive con colonne:
  - Artista (nome/cognome, nome_arte in corsivo)
  - Ruolo (nome tipologia)
  - Personaggio
  - Episodio (se presente: `Sx Ey – titolo`), altrimenti “—”
  - Stato validazione
  - Azioni (link al profilo artista)

### Sezione “Episodi” (solo se tipo = `serie_tv`)
- Tabella con colonne: Stagione, Episodio, Titolo, Data, Durata
- Ordinamento ascendente per stagione/episodio

### Stati, Errori e Skeleton
- Skeleton di caricamento per header e sezioni
- Messaggi vuoto: “Nessuna partecipazione trovata” / “Nessun episodio associato”
- Gestione errori (toast/log) per fetch falliti

## Modifiche Minime di Integrazione
- Opere List: aggiungere voce “Visualizza” che fa `router.push(/dashboard/opere/${id})`
- Riutilizzare componenti UI già presenti (Badge, Table, Card, Dialog, Button)

## Tipi e Sicurezza
- Usare `Database['public']['Tables']` per tipare risultati supabase
- Non loggare credenziali o variabili d’ambiente
- Nessun salvataggio automatico: Import da IMDb solo su azione utente

## Test
- Test di rendering di base: pagina mostra header e sezioni con dati mockati
- Verificare condizione tipo `serie_tv` per sezione episodi
- Verificare che “Visualizza” nella tabella Opere navighi correttamente

## Consegna Incrementale
1. Aggiungere i 2 servizi (`getPartecipazioniByOperaId`, `getEpisodiByOperaId`)
2. Creare `src/app/dashboard/opere/[id]/page.tsx` con struttura e fetch
3. Link “Visualizza” dalla lista Opere
4. Test di base e smoke test

Confermi di procedere con l’implementazione secondo questo piano?