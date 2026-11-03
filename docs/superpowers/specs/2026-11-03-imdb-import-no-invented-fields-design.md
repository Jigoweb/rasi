# Import IMDb/OMDb: non inventare campi assenti

**Data:** 2026-11-03  
**Stato:** Design approvato (opzione C)

## Contesto

Casistica Don Matteo / *Un sogno rubato*: OMDb ha listing stagioni lacunose e, sul dettaglio episodio, `Season`/`Episode` spesso `N/A`. L’audit ha trovato anche punti in cui, a dato assente, il codice **inventava** valori (data 01-01, tipo `film`, titolo IMDb come titolo originale).

## Decisione

**Opzione C:** correggere solo i punti che inventano dati. Niente warning su listing incomplete, niente enrich per-tconst episodio in questo intervento.

**Regola:** se la sorgente non fornisce un dato usabile → `null` / non scrivere / non sovrascrivere. Mai default inventati (`|| 1`, `|| 'film'`, copia titolo → titolo originale).

## In scope

1. **Data messa in onda (import episodi UI)**  
   Persistare ISO `YYYY-MM-DD` solo se `year`, `month` e `day` sono tutti presenti. Altrimenti `null`.

2. **`parseReleased`**  
   Accettare anche `"20 Mar 2008"` (formato dettaglio OMDb). Non parsabile → `null`.

3. **Tipo opera**  
   - `mapImdbToOpera` / helper dedicato: tipi noti → `film` | `serie_tv` | `animazione`; assente/sconosciuto/`tvEpisode` → `null` (non default `film`, non classificare gli episodi come serie).  
   - Lookup tconst sul form opere: aggiornare `tipo` / `has_episodes` solo se il mapping restituisce un valore.

4. **Titolo originale**  
   In import scheda opera: offrire/scrivere `titolo_originale` solo se `originalTitle` è valorizzato. Non usare `title` come sostituto.

## Fuori scope

- Warning “stagione incompleta”
- Enrich S/E da tconst episodio
- Cast Primario / nconst OMDb
- Cambiare la strategia di import parziale delle listing stagione

## Verifica

Test unitari su `parseReleased`, helper data completa, mapping tipo, `mapImdbToOpera`. Nessuna migrazione DB.
