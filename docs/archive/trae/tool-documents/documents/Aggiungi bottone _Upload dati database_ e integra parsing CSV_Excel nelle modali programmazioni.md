## Obiettivo
Integrare nelle due modali (post‑creazione e ripresa bozza) il bottone "Upload dati database" e correggere il flusso di parsing/validazione/inserimento per template CSV/Excel allineato ai nomi delle colonne del DB, con obbligatori solo `titolo` e `tipo`.

## Header CSV allineato al DB
- Obbligatori: `titolo`, `tipo` (case‑insensitive e trim)
- Opzionali (mappati 1:1 se presenti): `canale`, `emittente`, `titolo_originale`, `numero_episodio`, `titolo_episodio`, `titolo_episodio_originale`, `numero_stagione`, `anno`, `production`, `regia`, `data_trasmissione`, `ora_inizio`, `ora_fine`, `durata_minuti`, `data_inizio`, `data_fine`, `retail_price`, `sales_month`, `track_price_local_currency`, `views`, `total_net_ad_revenue`, `total_revenue`.
- Aggiunte sempre lato pagina: `campagna_programmazione_id` (id campagna corrente), `emittente_id` (dalla campagna corrente). 

## Modifiche UI (in `src/app/dashboard/programmazioni/page.tsx`)
- Step 2 modale: aggiungere bottone "Upload dati database".
- Stato bottone: disabilitato di default; si abilita dopo parsing valido (header OK, almeno una riga con `titolo` e `tipo`). Mostra spinner durante upload e feedback esito.
- Copia area file: formati supportati `.csv, .xlsx, .xls`; elenco colonne richieste/consigliate.

## Parsing & Validazione (riuso flusso esistente)
- Riutilizzare `handleFileUpload` per: 
  - CSV: `Papa.parse` (`header: true`, `skipEmptyLines: true`).
  - Excel: `xlsx` (`sheet_to_json` sulla prima sheet, `raw: false`).
- Normalizzare header (lowercase+trim); validare presenza di `titolo` e `tipo`. Se mancano → errore UI + bottone disabilitato.
- Validare che esista almeno una riga con `titolo` e `tipo` non vuoti; salvare `parsedRows` in stato e **non** inserire subito.

## Inserimento DB (bulk/chunk)
- On click bottone: costruire `ProgrammazionePayload[]` con mappatura diretta dei campi CSV→DB (stessi nomi), aggiungendo `campagna_programmazione_id` e `emittente_id` correnti.
- Chunking: eseguire in chunk di 1.000–2.000 righe (configurabile via costante, default 2.000 per grandi volumi fino a ~1M record). Stop sul primo errore con feedback; al successo completo, aggiornare campagna a `aperta`, chiudere modale e ricaricare elenco campagne.

## Dettagli di mappatura (esempi)
- `titolo` → `titolo`
- `tipo` → `tipo`
- `data_trasmissione` → `data_trasmissione` (se presente)
- `ora_inizio` → `ora_inizio` (se presente)
- `durata_minuti` → `durata_minuti` (int, se presente)
- Il resto come da elenco opzionali, 1:1 se presenti; coerzioni base (date/time/int/float) applicate.

## Stato/Variabili da aggiungere
- `parsedRows`, `headerError`, `isUploadReady`, `isUploading`.
- Aggiornare `fileInputRef` già esistente; `accept` rimane `.csv,.xlsx,.xls`.

## Test
- Verificare che il bottone sia disabilitato inizialmente.
- Selezione file valido (CSV/Excel, header OK) abilita bottone.
- Header non valido → errore e bottone disabilitato.
- Click bottone esegue upload con chunking, aggiorna stato campagna e chiude modale.

## Sicurezza/RLS
- Continuare a usare Supabase con le RLS esistenti; nessuna nuova funzione helper esterna, si riusa `uploadProgrammazioni` e update stato campagna.

Se confermi, applico queste modifiche nella pagina e integro la mappatura con `titolo` e `tipo` come unici obbligatori, garantendo bulk insert a chunk per grandi volumi.