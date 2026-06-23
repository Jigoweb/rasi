## Diagnosi
- L’errore `DELETE 500` su `programmazioni?campagna_programmazione_id=eq.<id>` è coerente con:
  - Vincolo FK da `individuazioni.programmazione_id` verso `programmazioni(id)` senza `ON DELETE CASCADE`, che blocca/manda in errore la cancellazione massiva.
  - Timeout del gateway per operazioni massicce (origin_time ~8s). 
- Conferma schema attuale: in repo `individuazioni` ha `programmazione_id UUID NOT NULL REFERENCES programmazioni(id)` senza cascata (db/init/00_schema.sql:422–443). 

## Piano Correttivo DB
1. Abilitare cascata su tutte le relazioni figlie pertinenti:
   - `programmazioni.campagna_programmazione_id` → `campagne_programmazione(id) ON DELETE CASCADE` (già previsto, assicurare l’allineamento in produzione) – db/init/03_link_programmazioni.sql:13–37.
   - `individuazioni.programmazione_id` → `programmazioni(id) ON DELETE CASCADE` (nuova modifica da applicare su DB live). 
2. Strategie di migrazione sicure:
   - Droppare e ricreare il vincolo FK di `individuazioni.programmazione_id` con `ON DELETE CASCADE` in un blocco `DO $$` idempotente.
   - Verificare che non vi siano trigger bloccanti su delete; i nostri trigger di search_vector non toccano DELETE.

## Flusso di Eliminazione (Client)
1. Semplificare: eseguire **solo** `DELETE` sulla tabella `campagne_programmazione`. Con le cascade:
   - Verranno rimossi automaticamente tutti i `programmazioni` collegati.
   - Con la cascata su `individuazioni`, verranno rimossi anche i riferimenti.
2. UI/Feedback:
   - Stato riga campagna → `deleting` (spinner indeterminato).
   - Facoltativo: pre-conteggio record (head count) di `programmazioni` e `individuazioni` per mostrare “Eliminerai N programmazioni, M individuazioni”.
   - Al termine: rimuovere la campagna dalla lista, svuotare progress.
3. Fallback (se l’istanza non ha ancora cascade):
   - Staged delete: 
     - DELETE `individuazioni` per `programmazione_id` appartenenti alla campagna (batch eq su campagna, non liste `in(...)`).
     - DELETE `programmazioni` eq `campagna_programmazione_id`.
     - DELETE campagna.
   - Per robustezza e performance su grandi moli, valutare una funzione SQL RPC `delete_campagna_programmazione(id)` che esegua le tre operazioni server-side in transazione.

## Modifiche Puntuali
- DB:
  - Aggiungere script di migrazione live per cascata su `individuazioni.programmazione_id`.
- Client:
  - Aggiornare l’handler di “Elimina”: chiamare direttamente `deleteCampagnaProgrammazione(id)` e rimuovere i pre-delete manuali su `programmazioni`.
  - Mantenere feedback `deleting` (già presente) e rimozione ottimistica a successo.

## Verifica
- Testare su una campagna con molte `programmazioni` e alcune `individuazioni`:
  - Con cascata attiva: DELETE campagna → 200, figli rimossi.
  - Senza cascata: fallback staged funziona senza URL eccessivi; niente 400/500.
- Osservare che non compaiono violazioni FK o timeout.

Confermi di procedere con: (1) migrazione cascata su `individuazioni`, (2) semplificazione delete lato client, (3) fallback staged opzionale? 