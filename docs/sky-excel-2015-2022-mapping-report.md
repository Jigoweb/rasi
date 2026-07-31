# SKY Excel 2015–2022 — report mapping e normalizzazione header

Report operativo per importare i file in `/Users/matteo/Downloads/SKY` (329 `.xlsx`, anni 2015–2022) con **una sola emittente SKY** e un unico mapping in piattaforma.

## Sintesi

| Voce | Valore |
|---|---|
| File totali | 329 |
| Firme header originali | 8 |
| Emittenti necessarie **dopo** normalizzazione | **1** (`SKY`) |
| File da normalizzare | **19** (13 SNAKE + 5 Primafila + 1 Cielo 2015 con CRLF) |
| File già allineati | 310 |

Dopo lo script di rename header, tutti i file condividono (almeno) le colonne Title Case usate dal mapping sotto. Colonne extra (`Produttore`, `Attore comprimario`, `Numero Episodio`, …) possono restare non mappate.

---

## 1. Emittente e mapping in piattaforma

### Dove

Dashboard → **Emittenti** → crea/modifica **SKY** → sezione **Mapping import** → *Configura mapping*.

### File campione consigliato

`2022/Sky Atlantic_2022.xlsx` (schema più ricco, include anche le colonne episodio dedicate).

### Mapping 1:1 (step 2 del wizard)

| Colonna Excel (dopo normalizzazione) | Campo template RASI | Transform |
|---|---|---|
| `Serie Programma Sistema` | `titolo` | — (**obbligatorio**) |
| `Serie Programma Originale` | `titolo_originale` | — |
| `Episodio Sistema` | `titolo_episodio` | — |
| `Episodio Originale` | `titolo_episodio_originale` | — |
| `Numero Episodio` | `numero_episodio` | — (**sì, mapparla**) |
| `Numero/Anno Stagione` | `numero_stagione` | — (**sì, mapparla**) |
| `Data Inizio` | `data_trasmissione` | **`us_date_short`** |
| `Ora Inizio` | `ora_inizio` | — |
| `Durata` | `durata_minuti` | **`hhmmss_to_minutes`** |
| `Tipologia` | `tipo` | — |
| `Anno` | `anno` | — |
| `Regista` | `regia` | — |
| `Nome Rete` | `canale` | — |

### Perché mappare `Numero Episodio` / `Numero/Anno Stagione`

Il matcher di individuazione, sulle serie, usa nell’ordine:

1. match esatto `numero_stagione` + `numero_episodio` → score episodio **1.0** (+15 sul totale)
2. solo `numero_episodio` → score **0.8**
3. similarità su `titolo_episodio` (≥ 0.6) → più fragile

Su Sky i titoli episodio sono spesso del tipo `Show Ep.08 - Titolo`, non allineati al titolo catalogo: senza i numeri dedicati il match a livello episodio degrada (più revisioni / match solo a livello serie).

Le colonne esistono solo dal **2021**. Su file pre-2021 l’upload mostrerà *Formato file cambiato*: si può **Procedere** — i campi mancanti restano vuoti, il resto del mapping resta valido. Non serve una seconda emittente solo per questo.

### Regole avanzate (step 3, consigliato)

Attiva il preset **Serie TV**: coalesce su titoli/episodi (Sistema → Originale). Utile sui file misti film+serie.

### Non mappare

`Dettagli`, `Nazionalità`, `Attore Primario`, `Produttore`, `Attore comprimario`, `Numero Canali`, `Numero Passaggi`.

### Transform critici

- Date Excel lette come `M/D/YY` (es. `6/1/15`) → `us_date_short`.
- Durata `H:MM:SS` (es. `1:40:13`) → `hhmmss_to_minutes`.

---

## 2. Renaming intestazioni (19 file)

Allineamento verso il Title Case SKY.

| Header originale | → Header normalizzato |
|---|---|
| `CANALE` | `Nome Rete` |
| `DATA_INIZIO` | `Data Inizio` |
| `ORA_INIZIO` | `Ora Inizio` |
| `ORE_INIZIO` | `Ora Inizio` |
| `DURATA` | `Durata` |
| `SERIE_ORIGINALE` | `Serie Programma Originale` |
| `SERIE_SISTEMA` | `Serie Programma Sistema` |
| `EPISODIO_ORIGINALE` | `Episodio Originale` |
| `EPISODIO_SISTEMA` | `Episodio Sistema` |
| `TIPOLOGIA` | `Tipologia` |
| `DETTAGLI` | `Dettagli` |
| `NAZIONALITA` | `Nazionalità` *(con accento)* |
| `ANNO` | `Anno` |
| `REGISTA` | `Regista` |
| `ATTORE_PRIMARIO` | `Attore Primario` |
| `PRODUTTORE` | `Produttore` |
| `Serie Programma\r\nOriginale` (ecc.) | stesso nome senza newline |

### File interessati (dry-run: 19)

- **SNAKE (13):** es. `2015/Sky Atlantic +1…`, `2016/Sky Cinema Hits_2016.xlsx`, `2017/Sky Cinema Oscar…`, ecc.
- **Primafila (5):** `2018/Sky PrimaFila_…`, `2019/PRIMAFILA_2019.xlsx`, `2020–2022/VETRINA PRIMAFILA` / `PRIMAFILA_2022.xlsx`
- **CRLF (1):** `2015/Cielo 2015 File grezzo.xlsx`

---

## 3. Script e come lanciarlo

Script nel repo: [`scripts/normalize-sky-excel-headers.mjs`](../scripts/normalize-sky-excel-headers.mjs)

Dipendenza: usa `xlsx` già presente nel progetto (`npm install` nella root se manca).

### Dry-run (consigliato prima)

```bash
cd /Users/matteo/rasi

node scripts/normalize-sky-excel-headers.mjs \
  --input "/Users/matteo/Downloads/SKY" \
  --output "/Users/matteo/Downloads/SKY_normalized" \
  --dry-run
```

Atteso: `rewritten: 19`, `unchanged: 310`.

### Scrittura su cartella nuova (consigliato)

```bash
node scripts/normalize-sky-excel-headers.mjs \
  --input "/Users/matteo/Downloads/SKY" \
  --output "/Users/matteo/Downloads/SKY_normalized"
```

Copia l’albero anni/file in `SKY_normalized`, riscrivendo solo i 19 file che cambiano header. I file già ok **non** vengono copiati in dry-run report ma in modalità `--output` solo i file *rewritten* vengono scritti.

> Se ti serve l’intero dataset unificato in una sola cartella, dopo lo script copia anche i 310 invariati, oppure rilancia con una copia completa della cartella come input e `--in-place` su quella copia.

### Workflow consigliato (copia completa + in-place)

```bash
# 1) Copia di lavoro
cp -R "/Users/matteo/Downloads/SKY" "/Users/matteo/Downloads/SKY_normalized"

# 2) Normalizza in-place sulla copia (crea .bak accanto a ogni file modificato)
node scripts/normalize-sky-excel-headers.mjs \
  --input "/Users/matteo/Downloads/SKY_normalized" \
  --in-place

# 3) Verifica
node scripts/normalize-sky-excel-headers.mjs \
  --input "/Users/matteo/Downloads/SKY_normalized" \
  --output "/tmp/sky_check" \
  --dry-run
# atteso: rewritten: 0
```

### Opzioni

| Flag | Effetto |
|---|---|
| `--input <dir>` | Cartella root (obbligatorio) |
| `--output <dir>` | Scrive i file modificati sotto questa root |
| `--in-place` | Sovrascrive i sorgenti (prima crea `.bak` se assente) |
| `--dry-run` | Solo JSON report, nessuna scrittura |
| `--all-sheets` | Rinomina header su tutti i fogli (default: solo il primo) |

---

## 4. Checklist operativa

1. Eseguire dry-run → confermare 19 file.
2. Normalizzare su una **copia** della cartella SKY.
3. In piattaforma: una emittente **SKY**, mapping della sezione 1, transform data/durata.
4. Upload di prova: 1 file Title Case 2022 + 1 ex-SNAKE + 1 Primafila.
5. Controllare date (`data_trasmissione`) e `durata_minuti` su qualche riga campione.
6. Procedere con l’import a batch (UI: Programmazioni → **Import bulk**).

---

## 5. Nota su `Numero Episodio` (2021–2022)

Presente solo su ~83 file (2021–2022). **Vanno mappate** per l’individuazione (vedi sopra). Su upload di anni precedenti: dialog di warning → *Procedere* (campi episodio numerici vuoti su quelle righe; `titolo_episodio` da `Episodio Sistema` resta disponibile quando presente).
