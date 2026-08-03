# Rilancio individuazioni dopo matcher SKY gap (A/D)

Migration: `supabase/migrations/20260803120000_matcher_sky_gap_a_d.sql`  
(Applicata anche come `matcher_sky_gap_a_d_body` sul progetto remoto.)

## Cosa cambia al rilancio

| Fix | Effetto |
|---|---|
| A1/D2 | `"Vikings 5"` → chiave loose `vikings`; candidati anche via `match_key_loose/strict` |
| A2 | Se S+E fallisce ma c’è `numero_episodio`, fallback ep-only (0.75/0.8) |
| D3 | Film: niente hard-scarto anno oltre ±5; soft fallback produzione |

## Come rilanciare sulle programmazioni già caricate

Le campagne già `completata` **non** riscrivono i miss: serve una **nuova campagna individuazione** (o resume su ID non ancora processati) sullo stesso `campagne_programmazione` / emittente SKY.

1. Confermare che la migration è sul DB di destinazione (`v_prog_key_loose` presente nella 5-arg `match_programmazione_to_partecipazioni`).
2. Dal dashboard: crea/avvia campagne individuazione per gli anni SKY 2015–2019 già importati.
3. **Mandato**: gli artisti del manuale devono essere coperti da mandato per l’anno campagna. Sample replay: SINGH / BACKUS / SORVINO matchano in read-only ma avevano 0 righe nelle campagne del 2026-07-31 — senza mandato restano fuori anche col nuovo matcher.
4. Non filtrare `p_artista_ids` a un sottoinsieme troppo stretto se l’obiettivo è copertura manuale ampia.
5. Dopo il run: confrontare di nuovo col manuale (o rieseguire `scripts/diagnostics/sky_gap_simulator.py` sul nuovo export piattaforme).

## Fuori scope di questo fix

- Bucket **B** (cast assente) e **C** (catalogo assente): solo dati / perimetro collecting.
- Enrich `partecipazioni` (es. Shannara/REMAR).
