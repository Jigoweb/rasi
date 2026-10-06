# Report: simulazione chiusura gap SKY 2015–2019

Spec: [2026-08-03-sky-gap-closure-simulation-design.md](../specs/2026-08-03-sky-gap-closure-simulation-design.md)

Harness: [`scripts/diagnostics/sky_gap_simulator.py`](../../../scripts/diagnostics/sky_gap_simulator.py)

Fixture: [`scripts/diagnostics/fixtures/sky_gap_sim_report.json`](../../../scripts/diagnostics/fixtures/sky_gap_sim_report.json)

## Baseline

| | Valore |
|---|---|
| Righe manuali | 17.495 |
| Hit stretti piattaforma | 2.523 righe (14,42%) / 127 coppie |
| Miss classificate | 14.972 righe / 494 coppie |

Miss per bucket: A 3.364 · B 2.874 · C 1.537 · D 7.197

## Delta scenari (deterministico)

| Scenario | Righe recuperate | % miss | Copertura manuale proiettata | Residuo in-scope | Fuori scope |
|---|---:|---:|---:|---:|---:|
| **S0** baseline | 0 | 0% | **14,42%** | 14.972 | 0 |
| **S1** codice A+D | 10.561 | 70,54% | **74,79%** | 4.411 (B+C) | 0 |
| **S2** S1 + enrich B | 13.435 | 89,73% | **91,21%** | 1.537 (C) | 0 |
| **S3** ceiling eleggibile | 13.435 | 89,73% | **91,21%** | 0 | 1.537 (C) |

Interpretazione S3: se C (catalogo assente) è fuori perimetro collecting, il tetto realistico con codice+cast enrich è **100% del gap in-scope** (A+B+D) e ~91% delle righe manuali totali.

### Breakdown recupero S1

| Bucket | Coppie | Righe | Natura recupero |
|---|---:|---:|---|
| A | 63 | 3.364 | regole episodio + strip stagione (upper bound) |
| D | 298 | 7.197 | dual-key / normalize / year soft + riesecuzione (upper bound) |

### Residui S1 (da non aspettarsi dal solo codice matcher)

| Motivo | Coppie | Righe |
|---|---:|---:|
| cast_assente (B) | 68 | 2.874 |
| catalogo (C) | 65 | 1.537 |

## Sample replay matcher (read-only)

Chiamate a `match_programmazione_to_partecipazioni(..., 0.7, NULL, 3, 5)` senza write.

| Sample | Bucket | Matcher | Artisti | Score | Indiv. campagna SKY |
|---|---|---|---|---:|---|
| Vikings 5 Ep.01 | A | 1 match | SINGH | 72,5 | 0 per SINGH (ZUCCA sì su Vikings*) |
| Mothers And Daughters | D | 2 match | BACKUS, SORVINO | 80 | 0 |

Implicazioni:

1. Su questi titoli il matcher **live già produce** i match attesi: parte del gap A/D è **persistenza campagna / filtro mandato artisti**, non solo similarità.
2. S1 è un upper bound che include “rieseguire campagne con artisti in mandato” oltre ai fix A1–A3 / D1–D3.
3. Serie tipo Sopranos/Dexter/Romanzo: poche o nulle programmazioni SKY 2015–2019 con quei pattern titolo → recupero dipende da presenza upload o alias.

Dettaglio: [`sky_gap_sample_replay.json`](../../../scripts/diagnostics/fixtures/sky_gap_sample_replay.json)

## Raccomandazione

1. **Codice D** (dual-key + normalize + year) — massimo volume miss tecnico.
2. **Codice A** (fallback episodio + strip stagione nel titolo).
3. **Ops**: riesecuzione campagne SKY assicurando gli artisti manuali eleggibili nel mandato (sample SINGH/BACKUS/SORVINO).
4. **Dati B** selettivo (es. Shannara/REMAR se diritti).
5. **C** fuori scope salvo decisione collecting.

## Riproduzione

```bash
python3 -m unittest discover -s scripts/diagnostics -p 'test_sky_gap_simulator.py' -v
python3 scripts/diagnostics/sky_gap_simulator.py \
  --input scripts/diagnostics/fixtures/sky_gap_classified.json \
  --output /tmp/sky-compare/sim_report.json
```
