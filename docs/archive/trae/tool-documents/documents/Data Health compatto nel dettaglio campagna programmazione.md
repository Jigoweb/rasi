## Obiettivo
- Aggiungere un pannello “Data Health” compatto nella pagina `dashboard/programmazioni/[id]` che mostra qualità e stato dei dati delle `programmazioni` della campagna.
- Metriche aggregate, senza caricare tutte le righe: query di conteggio e aggregazione ottimizzate.

## Metriche mostrate
- Totale programmazioni della campagna.
- Processate vs Non processate (conteggio e percentuale).
- Campi incompleti: `titolo` null, `durata_minuti` null.
- Periodo coperto: `min(data_trasmissione)` e `max(data_trasmissione)`.
- Anomalie base: `errori_processamento` non null.

## Servizi
- Aggiungere `getProgrammazioniHealth(campagnaId)` in `src/features/programmazioni/services/programmazioni.service.ts` che ritorna:
  - `total`, `processed`, `unprocessed`, `missing_title`, `missing_duration`, `errors_count`, `date_min`, `date_max`.
- Implementazione via Supabase:
  - Conteggi con `.select('*', { count: 'exact', head: true })` filtrati per `campagna_programmazione_id` e ulteriori condizioni.
  - Min/Max con `.select('min:data_trasmissione.min,max:data_trasmissione.max')`.

## UI
- In `src/app/dashboard/programmazioni/[id]/page.tsx` aggiungere una sezione “Data Health” sopra la tabella:
  - Griglia di 4–6 mini-card (`Card`/`Badge`) con valori e barre di progresso sottili.
  - Colori coerenti con dashboard (verde per completo, arancione/grigio per incompleto, blu per processato).
  - Stato caricamento con spinner minimo.

## Performance
- Query indicizzate su `campagna_programmazione_id` (indice `idx_programmazioni_campagna_created`).
- Range date usa indice su `data_trasmissione` (`idx_programmazioni_data`).
- Nessun offset o fetch massivo; solo aggregazioni.

## Passi
1. Aggiungere servizio `getProgrammazioniHealth`.
2. Integrare la chiamata nella pagina e stato/renderer del pannello “Data Health”.
3. Curare visual compatto (mini-card + barre) coerente con pattern esistenti.
4. Testare su campagne reali con dataset grande.

Procedo ad aggiungere servizio e UI del pannello nella pagina di dettaglio della campagna programmazione.