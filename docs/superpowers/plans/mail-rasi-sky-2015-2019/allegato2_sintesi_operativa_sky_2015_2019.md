# Sintesi operativa — SKY 2015–2019
## Confronto individuazioni piattaforma vs manuale Paolo (aggiornato dopo reaudit)

**Data:** 11 agosto 2026  
**Emittente:** SKY  
**Anni:** 2015–2019  
**Fonte manuale:** foglio individuazioni pulite (non aventi diritto esclusi)

---

## 1. Esito numerico

| Indicatore | Valore |
|---|---|
| Coverage pre-fix | 14,4% |
| Coverage post-rilancio | **16,4%** (+2 pp) |
| Coppie ancora omesse | **485** |
| Righe Excel ancora omesse | **14.367** |
| Individuazioni piattaforma post-rilancio | ~5.089 |
| Classificazioni corrette nel reaudit | 51 coppie |

Coverage indicativa per anno: 2015 ~8% · 2016 ~9% · 2017 ~15% · 2018 ~34% · 2019 ~38%.

---

## 2. Motivi aggiornati (dopo correzione Shannara e cast)

| Bucket | Significato | Coppie | Righe |
|---|---|---:|---:|
| A | episodio/serie | 35 | 656 |
| A+D | episodio + mandato/persistenza (cast OK) | 20 | 2.118 |
| B | cast ancora assente | 64 | 1.560 |
| C | catalogo assente / alias non anagrafici | 62 | 1.437 |
| D | non persistito (spesso mandato) | 304 | 8.596 |

---

## 3. Correzione principale: Shannara / REMAR

Nel report precedente Shannara era classificato come “cast assente”.  
Verifica catalogo: REMAR è presente sull’opera SHANNARA (William James Remar = Remar William James).  
L’`opera_id` della classifica storica puntava per errore a “I giorni del padrino”.  
**Blocco reale:** mandato dal 23/02/2023 → non entra nelle campagne 2015–2019.

Situazione analoga (cast OK, mandato successivo): Dexter / City on a Hill (REMAR), Vikings (SINGH), Sopranos (CASTELLUCCIO), Mothers and Daughters (BACKUS / SORVINO).

---

## 4. Top casi omessi (per volume)

| # | Anno | Artista | Titolo | Righe | Bucket | Motivo |
|---:|---:|---|---|---:|---|---|
| 1 | 2016 | REMAR WILLIAM JAMES | THE SHANNARA CHRONICLES 1 | 462 | D | cast presente; blocco mandato |
| 2 | 2017 | REMAR WILLIAM JAMES | THE SHANNARA CHRONICLES 1 | 458 | D | cast presente; blocco mandato |
| 3 | 2019 | REMAR WILLIAM JAMES | DEXTER 2 | 248 | A+D | cast OK; mandato + possibile gap episodio |
| 4 | 2018 | REMAR WILLIAM JAMES | THE SHANNARA CHRONICLES 1 | 242 | D | cast presente; blocco mandato |
| 5 | 2017 | DAVITIAN KENNETH | S.W.A.T. | 184 | C | opera/cast non riconciliati |
| 6 | 2019 | REMAR WILLIAM JAMES | CITY ON A HILL 1 | 164 | A+D | cast OK; mandato + possibile gap episodio |
| 7 | 2019 | SINGH MOSE | VIKINGS 5 | 160 | A+D | cast presente; blocco mandato |
| 8 | 2019 | REMAR WILLIAM JAMES | THE SHANNARA CHRONICLES 1 | 152 | D | cast presente; blocco mandato |
| 9 | 2016 | AUTUORO CRISTIAN | MA TU DI CHE SEGNO 6? | 150 | B | cast assente (caso ancora reale) |
| 10 | 2017 | BACKUS / SORVINO | MOTHERS AND DAUGHTERS | 124+124 | D | cast presente; blocco mandato |

Elenco completo: `allegato1_casi_omessi_sky_2015_2019.csv` / PDF.

---

## 5. Implementazioni piattaforma

### Matcher
- Normalizzazione titoli più robusta
- Fallback episodio migliorato
- Soft-match anno produzione sui film
- Campagne SKY 2015–2019 rilanciate dopo il rilascio

### Bulk operativo
- Import bulk programmazioni (multi-file Excel)
- Export bulk campagne individuazione
- Delete bulk campagne (blocco se in elaborazione)

---

## 6. Decisione richiesta a RASI

1. Artisti con mandato post-2019 ma nel foglio Paolo 2015–2019 → **override** o **escludere dal perimetro**?
2. Casi B/C ancora reali → **arricchire catalogo** o **lasciare fuori**?
3. Conferma a campione sui titoli già in piattaforma.
