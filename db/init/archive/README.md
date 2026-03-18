# Archive — Migrazioni Storiche

Questi file rappresentano le modifiche incrementali applicate al DB Supabase tra 2024 e 2026.
Sono stati archiviati il 2026-03-18 dopo che `00_schema.sql` è stato riscritto per riflettere
la struttura corrente del database reale.

**Non applicare questi file su un DB già aggiornato.** Servono solo come riferimento storico.

## Cronologia

| File | Cosa ha fatto |
|---|---|
| `03_seed.sql` | Dati di esempio iniziali (schema vecchio — colonne rimosse) |
| `03_link_programmazioni.sql` | Aggiunto `campagna_programmazione_id` su programmazioni; CASCADE su individuazioni |
| `04_add_imdb_tconst_to_episodi.sql` | Aggiunta colonna `imdb_tconst` a episodi |
| `05_add_is_rasi_to_artisti.sql` | Aggiunta colonna `is_rasi` a artisti |
| `06_add_updated_by_to_partecipazioni.sql` | Aggiunta colonna `updated_by` a partecipazioni |
| `07_add_stato_validazione_to_opere_artisti.sql` | Aggiunta `stato_validazione` a opere e artisti |
| `08_remove_stato_validazione_from_partecipazioni.sql` | Rimossa `stato_validazione` da partecipazioni |
| `09_add_has_episodes_to_opere.sql` | Aggiunta colonna `has_episodes` a opere |
| `fix_trigger.sql` | Fix trigger `update_search_vector` (doppio di 03_link_programmazioni) |
