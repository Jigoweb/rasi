# Design: chiusura gap SKY 2015–2019 e simulazione deterministica

## Contesto

Confronto tra individuazioni manuali Excel RASI (SKY 2015–2019) e individuazioni piattaforma (campagne emittente SKY create 2026-07-31).

| Metrica | Valore |
|---|---|
| Righe manuali | 17.495 |
| Coppie uniche (anno+titolo+artista) | ~828 |
| Hit stretti piattaforma | ~14,4% righe / ~17,4% coppie |
| Miss stretti classificate | 494 coppie / 14.972 righe |

## Non-obiettivi

- **Non** azzerare B+C senza decisione collecting: catalogo/cast assenti riflettono spesso assenza aventi diritto.
- **Non** uguagliare riga-Excel ↔ riga-DB: la metrica è copertura delle **coppie manuali**.
- **Non** scrivere `individuazioni` / rieseguire campagne in questa fase.

## Bucket miss (baseline classificata)

| Bucket | Coppie | Righe | % righe miss | Natura | Azzerabile come? |
|---|---:|---:|---:|---|---|
| A episodio | 63 | 3.364 | 22,5% | tecnico | codice matcher + import |
| B cast | 68 | 2.874 | 19,2% | atteso | solo dati `partecipazioni` |
| C catalogo | 65 | 1.537 | 10,3% | atteso | solo catalogo se diritti |
| D film match | 298 | 7.197 | 48,1% | tecnico | codice matcher (+ alias) |

Rollup: **atteso B+C ≈ 29,5%** righe miss; **tecnico A+D ≈ 70,5%**.

## Mappa interventi → bucket → impatto atteso

### A – Episodio (codice + import)

| ID | Intervento | Dove | Impatto atteso |
|---|---|---|---|
| A1 | Strip stagione/parte dal titolo opera oltre `: Season…` (trailing ` 4`, `Stagione N`) | matcher SQL + allineo a `title-normalize.ts` loose | sblocca match opera su Vikings/Sopranos/… |
| A2 | Fallback ep-only / titolo-ep anche se `numero_stagione` valorizzato ma S+E fallisce | `match_programmazione_to_partecipazioni` | recupera overlap episodio oggi ≈ 0 |
| A3 | Derive/backfill segnali episodio più aggressivo su storici | `derive_programmazione_episode_signals` + backfill | più S/E popolati a import |
| A4 | Alias titoli episodio SKY ↔ catalogo | dati | residuo dopo A1–A3 |

**Stima upper-bound S1 su A:** tutte le 63 coppie / 3.364 righe A (hanno già opera+episodi+cast).

### D – Film match (codice, max righe)

| ID | Intervento | Dove | Impatto atteso |
|---|---|---|---|
| D1 | Dual-key / `find_opera_candidates` nel matcher live | SQL matcher | titoli normalizzati matchano opere già in catalogo |
| D2 | Normalizzazione piena a match-time | SQL mirror di `normalizeTitle` / `buildMatchKey` | riduce miss per cruft emittente |
| D3 | Year soft / tolleranza trasmissione ≠ uscita | matcher year semantics | evita hard-skip ±5 |
| D4 | Alias titoli mirati sulle coppie D | dati opere | residuo post D1–D3 |

**Stima upper-bound S1 su D:** 298 coppie / 7.197 righe (opera+cast già presenti).

### B – Cast (solo dati)

Aggiungere `partecipazioni` dove i diritti esistono. Caso dominante: *The Shannara Chronicles* / REMAR (~1.314 righe, ~46% di B).

**Stima S2:** +68 coppie / +2.874 righe se si arricchisce tutto B (opt-in; non automatico dal matcher).

### C – Catalogo (solo perimetro)

Inserire opera/episodi/artista solo con interesse collecting. Altrimenti gap **corretto**.

**S3:** C escluso dal denominatore “da chiudere”; non recuperato.

## Priorità raccomandata

1. **Codice D** (maggior volume miss tecnico)
2. **Codice A** (serie ad alto volume: Sopranos, Romanzo Criminale, Dexter, Vikings)
3. **Dati B selettivo** (solo titoli con diritti, partendo da Shannara se in perimetro)
4. **C** fuori scope salvo decisione collecting

## Simulazione deterministica

Harness: [`scripts/diagnostics/sky_gap_simulator.py`](../../scripts/diagnostics/sky_gap_simulator.py)

Input: snapshot classificato miss (`classified.json`: bucket, rows, opera/cast flags).

Scenari:

| Scenario | Regola recupero | Denominatore “da chiudere” |
|---|---|---|
| S0 baseline | nessuna miss recuperata | A+B+C+D |
| S1 codice A+D | recupera A e D | A+B+C+D |
| S2 = S1 + enrich B | recupera A+D+B | A+B+C+D |
| S3 ceiling eleggibile | come S2; C fuori scope | A+B+D (C escluso) |

Output: delta coppie/righe, % su miss e su totale manuale 17.495, residui per motivo.

Validazione a campione: `match_programmazione_to_partecipazioni` read-only su programmazioni SKY per titoli A/D.

## Limiti

- Upper bound: assume che, con le regole simulate, esista programmazione matchabile e segnali episodio derivabili.
- Canali/titoli solo-manuale senza programmazione restano irrecuperabili dal matcher.
- Stesso input → stesso output (nessuna randomness).
- Sample replay (Vikings 5, Mothers And Daughters): il matcher live **già** restituisce gli artisti manuali, ma le campagne SKY 2026-07-31 non hanno persistito quelle individuazioni (0 righe per SINGH/BACKUS/SORVINO). Quindi S1 include anche riesecuzione campagne / mandato artisti, non solo patch SQL future.

## Report

Risultati numerici e delta S0–S3: [2026-08-03-sky-gap-closure-simulation-report.md](../plans/2026-08-03-sky-gap-closure-simulation-report.md).
