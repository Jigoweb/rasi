# RASI — Recap formati file emittenti

> Documento generato il 2026-05-18 a partire dall'analisi diretta dei file forniti per l'anno 2024.  
> Scopo: guida di riferimento per configurare i mapping di import e implementare le trasformazioni necessarie alla conformità con il template RASI.

---

## Indice

1. [Template RASI (campi destinazione)](#1-template-rasi-campi-destinazione)
2. [Panoramica rapida](#2-panoramica-rapida)
3. [Trasformazioni comuni riutilizzabili](#3-trasformazioni-comuni-riutilizzabili)
4. [RAI](#4-rai--rai1-rai-premium)
5. [RTI-Mediaset](#5-rti-mediaset--canale5-cine-comico-infinity-free)
6. [SKY](#6-sky--sky-atlantic-sky-cinema-action-cielo-tv8)
7. [Netflix](#7-netflix)
8. [LA7](#8-la7)
9. [Discovery](#9-discovery--nove-giallo-warner-tv)
10. [Viacom](#10-viacom--comedy-central-nickelodeon-super)
11. [Disney Plus](#11-disney-plus)
12. [Amazon Video](#12-amazon-video--channels--tvod)
13. [Apple TV](#13-apple-tv--svod--tvod)
14. [TIMVision](#14-timvision--svod--tvod)
15. [CHILI](#15-chili--avod--tvod)
16. [Sony Culver Digital](#16-sony-culver-digital)
17. [Samsung TV Plus](#17-samsung-tv-plus)
18. [Italolive](#18-italolive)
19. [TV2000](#19-tv2000)
20. [Anomalie trasversali](#20-anomalie-trasversali)
21. [Matrice di conformità](#21-matrice-di-conformit%C3%A0)

---

## 1. Template RASI (campi destinazione)

Questi sono i campi accettati dal sistema come destinazione del mapping. Tutti gli import devono essere ricondotti a questi nomi.

| Campo | Tipo DB | Obbligatorio | Note |
|---|---|---|---|
| `titolo` | text | ✅ | Titolo italiano dell'opera/episodio |
| `titolo_originale` | text | | Titolo in lingua originale |
| `tipo` | text | ✅ | Tipologia opera (normalizzare, vedi §3) |
| `canale` | text | | Nome canale trasmittente |
| `emittente` | text | | Ragione sociale emittente |
| `data_trasmissione` | date | | Formato destinazione: `YYYY-MM-DD` |
| `ora_inizio` | time | | Formato destinazione: `HH:MM:SS` |
| `ora_fine` | time | | Formato destinazione: `HH:MM:SS` |
| `durata_minuti` | integer | | Minuti interi (arrotondare) |
| `numero_episodio` | integer | | |
| `titolo_episodio` | text | | Titolo italiano episodio |
| `titolo_episodio_originale` | text | | |
| `numero_stagione` | integer | | |
| `anno` | integer | | Anno di produzione |
| `production` | text | | Casa di produzione |
| `regia` | text | | Regista/i |
| `data_inizio` | date | | Per contratti/periodi |
| `data_fine` | date | | Per contratti/periodi |
| `retail_price` | decimal | | Prezzo vendita |
| `sales_month` | integer | | Formato: `YYYYMM` (es. `202401`) |
| `track_price_local_currency` | decimal | | |
| `views` | integer | | Visualizzazioni/stream |
| `total_net_ad_revenue` | decimal | | Ricavi netti advertising |
| `total_revenue` | decimal | | Ricavi totali |

> **Coercion automatica**: `durata_minuti`, `numero_episodio`, `numero_stagione`, `anno`, `views` → `parseInt`; prezzi/revenue → `parseFloat`; `data_*` → `validateDate`; `ora_*` → `validateTime`. Le trasformazioni riportate sotto vanno eseguite **prima** di passare i dati alla pipeline standard.

---

## 2. Panoramica rapida

| Emittente | File | Formato | Separatore | Header row | Durata — unità sorgente | Transform durata |
|---|---|---|---|---|---|---|
| RAI 1 / Premium | `.csv` | CSV | `;` | 0 | **Secondi interi** | `÷ 60 → int` |
| RTI-Mediaset (SVOD/AVOD) | `.csv` | CSV | `;` | 0 | Stringa `128'` (minuti+apostrofo) | `strip("'"`) → int |
| RTI-Mediaset (Canale5 lineare) | `.TXT` | Fixed-width proprietario | — | — | Minuti decimali (diritti musica) | Vedi §5 |
| SKY (tutti i canali) | `.txt` | TSV (tab) | `\t` | 0 | Stringa `HH:MM:SS` | `hhmmss_to_minutes` |
| Netflix | `.csv` | CSV | `,` | 0 | Minuti decimali (`89.3`) | `round → int` |
| LA7 | `.xlsx` | Excel | — | 0 | **Ore decimali** (`0.454h`) | `× 60 → int` |
| Discovery Nove | `.xls` | Excel legacy (BIFF8) | — | 0 | Stringa `HH:MM:SS` | `hhmmss_to_minutes` |
| Discovery Giallo | `.xlsx` | Excel | — | 0 | `datetime.time` da openpyxl | `h×60 + m + s÷60` |
| Discovery Warner TV | `.xlsx` | Excel | — | 0 | Stringa `HH:MM:SS` | `hhmmss_to_minutes` |
| Viacom (Comedy/Nick/Super) | `.xls` | Excel legacy (BIFF8) | — | **2** (data da 4) | Minuti decimali (`21.7`) | `round → int` |
| Disney Plus | `.xlsx` | Excel | — | 0 | ⚠️ Minuti cumulativi aggregati | Non utilizzare per durata unitaria |
| Amazon CHANNELS | `.csv` | CSV | `,` | 0 | Minuti interi | Già conformi |
| Amazon TVOD | `.csv` | CSV | **`;`** | 0 | Minuti interi | Già conformi |
| Apple SVOD | `.xlsx` | Excel | — | 0 | ISO 8601 (`PT0H22M0S`) | `iso8601_to_minutes` |
| Apple TVOD | `.xlsx` | Excel | — | 0 | **Millisecondi interi** | `÷ 60000 → int` |
| TIMVision SVOD | `.xlsx` sheet `SVOD` | Excel | — | 0 | Minuti interi (colonna `DURATA_MINUTI_CONTENUTO`) | Già conformi |
| TIMVision TVOD | `.xlsx` sheet `TVOD` | Excel | — | 0 | Minuti interi (stessa colonna) | Già conformi |
| CHILI AVOD | `.xlsx` | Excel | — | **2** | Minuti interi (`Track Duration`) | Già conformi |
| CHILI TVOD | `.xlsx` | Excel | — | **1** | **Frazione di giorno** (`0.0743...`) | `× 24 × 60 → int` |
| Sony Culver Digital | `.xlsx` | Excel | — | 0 | ❌ Assente | — |
| Samsung TV Plus | `.xlsx` | Excel | — | pivot | ❌ Assente (dati audience) | — |
| Italolive | `.xlsx` | Excel | — | **1** | ❌ Assente | — |
| TV2000 | `.xlsx` | Excel | — | 0 | `datetime.time` da openpyxl | `h×60 + m + s÷60` |

---

## 3. Trasformazioni comuni riutilizzabili

Implementare queste funzioni nel modulo `coercion.ts` / utility Python di pre-processing.

```python
# ─── DURATA ───────────────────────────────────────────────────────────────────

def hhmmss_to_minutes(v: str) -> int | None:
    """HH:MM:SS → minuti interi. Usato da: SKY, Discovery Nove/Warner."""
    if not v or not isinstance(v, str): return None
    parts = v.strip().split(":")
    if len(parts) != 3: return None
    h, m, s = int(parts[0]), int(parts[1]), int(parts[2])
    return round(h * 60 + m + s / 60)

def time_obj_to_minutes(t) -> int | None:
    """datetime.time → minuti interi. Usato da: Discovery Giallo, TV2000."""
    if t is None: return None
    return round(t.hour * 60 + t.minute + t.second / 60)

def seconds_to_minutes(v) -> int | None:
    """Secondi interi → minuti. Usato da: RAI."""
    try: return round(int(v) / 60)
    except: return None

def fractional_hours_to_minutes(v) -> int | None:
    """Ore decimali → minuti. Usato da: LA7 (0.454 h → 27 min)."""
    try: return round(float(v) * 60)
    except: return None

def fractional_day_to_minutes(v) -> int | None:
    """Frazione di giorno → minuti. Usato da: CHILI TVOD (0.0743 → 107 min)."""
    try: return round(float(v) * 24 * 60)
    except: return None

def milliseconds_to_minutes(v) -> int | None:
    """Millisecondi → minuti. Usato da: Apple TVOD (6014000 ms → 100 min)."""
    try: return round(int(v) / 60000)
    except: return None

def decimal_minutes_to_int(v) -> int | None:
    """Minuti decimali → minuti interi. Usato da: Viacom (21.683 → 22), Netflix (89.3 → 89)."""
    try: return round(float(v))
    except: return None

def iso8601_duration_to_minutes(v: str) -> int | None:
    """PT0H22M0S → minuti. Usato da: Apple SVOD."""
    import re
    if not v: return None
    m = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', str(v))
    if not m: return None
    h = int(m.group(1) or 0)
    mi = int(m.group(2) or 0)
    s = int(m.group(3) or 0)
    return round(h * 60 + mi + s / 60)

def rti_duration_string(v: str) -> int | None:
    """'128'' → 128. Stringa minuti con apostrofo finale. Usato da: RTI-Mediaset CSV."""
    if not v: return None
    return int(str(v).replace("'", "").strip())

# ─── DATE ─────────────────────────────────────────────────────────────────────

def xls_serial_to_date(v, datemode=0) -> str | None:
    """Excel serial float → YYYY-MM-DD. Usato da: Viacom, Discovery Nove (xlrd)."""
    import xlrd
    if not isinstance(v, (int, float)): return None
    try:
        dt = xlrd.xldate_as_datetime(v, datemode)
        return dt.date().isoformat()
    except: return None

def us_date_to_iso(v: str) -> str | None:
    """MM/DD/YYYY → YYYY-MM-DD. Usato da: Netflix (end_date)."""
    if not v: return None
    from datetime import datetime
    try: return datetime.strptime(str(v).strip(), "%m/%d/%Y").date().isoformat()
    except: return None

def yyyymmdd_int_to_iso(v) -> str | None:
    """20231231 → 2023-12-31. Usato da: Apple TVOD (release_date)."""
    s = str(int(v))
    if len(s) != 8: return None
    return f"{s[:4]}-{s[4:6]}-{s[6:8]}"

# ─── ORA ──────────────────────────────────────────────────────────────────────

def xls_fraction_to_time(v) -> str | None:
    """Frazione di giorno → HH:MM:SS. Usato da: Viacom (0.25 → 06:00:00)."""
    if not isinstance(v, (int, float)): return None
    from datetime import timedelta, datetime
    dt = datetime(1899, 12, 30) + timedelta(days=float(v))
    return dt.strftime("%H:%M:%S")

# ─── VALORI NULLI ─────────────────────────────────────────────────────────────

def null_if_NA(v):
    """'N/A' → None. Usato da: Discovery."""
    return None if str(v).strip().upper() in ("N/A", "N.A.", "") else v

def null_if_ND(v):
    """'N.D.' / 'N.D' → None. Usato da: TIMVision."""
    return None if str(v).strip().upper() in ("N.D.", "N.D", "ND", "") else v

def null_if_NULL_str(v):
    """'NULL' (stringa) → None. Usato da: Disney Plus."""
    return None if str(v).strip().upper() == "NULL" else v

# ─── EPISODIO ─────────────────────────────────────────────────────────────────

def netflix_episode_nbr(v) -> int | None:
    """'--' → None, altrimenti int. Usato da: Netflix."""
    if str(v).strip() == "--": return None
    try: return int(v)
    except: return None

def xls_float_to_int(v) -> int | None:
    """Float Excel → int (per episodio/stagione/anno). Usato da: Viacom, Discovery."""
    if v is None or v == "": return None
    try:
        f = float(v)
        return int(f) if f > 0 else None
    except: return None

def apple_season_str(v: str) -> int | None:
    """'Season 2' → 2. Usato da: Apple SVOD (SeasonNumber/ReleaseSubTitle)."""
    if not v: return None
    import re
    m = re.search(r'\d+', str(v))
    return int(m.group()) if m else None
```

---

## 4. RAI — RAI1, RAI Premium

| Proprietà | Valore |
|---|---|
| File | `RAI1 2024_ANNO INTERO.csv`, `RAI PREMIUM 2024.csv` |
| Formato | CSV, separatore `;` |
| Encoding | UTF-8 (con BOM su Premium) |
| Header row | 0 |
| Quoting | RAI1: nessuno; RAI Premium: `"` su tutti i campi |

### Colonne RAI1 (campione)
```
Canale ; Genere trasmissione ; Titolo trasmissione ; Titolo originale trasmissione ;
Data inizio trasmissione ; Orario inizio trasmissione ; Orario fine trasmissione ;
Durata trasmissione ; PrimaReplica ; Tipologia ; [Paese] ; [Anno] ; [Produttore] ;
[Regia] ; [Attori]
```
> ⚠️ Le colonne dalla 10 in poi non hanno intestazione nel campione — verificare il conteggio esatto sul file completo.

### Colonne RAI Premium (campione)
```
Canale ; Genere trasmissione ; Titolo trasmissione ; Titolo originale trasmissione ;
Data inizio trasmissione ; Orario inizio trasmissione ; Orario fine trasmissione ;
Durata trasmissione ; [PrimaReplica] ; [?] ; [Paese] ; [Anno] ; [?] ; [Attori] ; [?] ;
Titolo episodio ; Titolo originale episodio ; Numero episodio ; [?] ; [?] ; [Anno prod]
```

### Mapping destinazione
| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `Canale` | `canale` | — |
| `Titolo trasmissione` | `titolo` | `toTitleCase` |
| `Titolo originale trasmissione` | `titolo_originale` | `toTitleCase` |
| `Data inizio trasmissione` | `data_trasmissione` | `validateDate` (RAI1: `DD/MM/YYYY`; Premium: `YYYY-MM-DD`) |
| `Orario inizio trasmissione` | `ora_inizio` | `validateTime` (già `HH:MM:SS`) |
| `Orario fine trasmissione` | `ora_fine` | `validateTime` |
| `Durata trasmissione` | `durata_minuti` | `seconds_to_minutes` ← **secondi interi** |
| `Titolo episodio` | `titolo_episodio` | — (solo Premium) |
| `Numero episodio` | `numero_episodio` | `parseInt` |

### Anomalie
- **Durata in secondi** (campo `Durata trasmissione`): `5670` = 94.5 min, `2400` = 40 min. Dividere per 60.
- **RAI Premium**: `Durata trasmissione` spesso `0` per trasmissioni corte o spot — filtrare.
- **Date difformi tra i due file**: RAI1 usa `DD/MM/YYYY`, Premium usa `YYYY-MM-DD`.
- Valori `Genere trasmissione` sono codici numerici (`1502`, `1022`), non stringhe descrittive.
- `PrimaReplica`: codice numerico (es. `5`, `2`, `3`), non stringa — mappatura codice→label non disponibile.
- Alcuni campi trailing (attori, regia) non hanno intestazione → trattare come colonne posizionali.

---

## 5. RTI-Mediaset — Canale5, Cine Comico, Infinity Free

Tre formati distinti dallo stesso emittente.

### 5a. CSV (`CINE COMICO`, `MEDIASET INFINITY FREE`)

| Proprietà | Valore |
|---|---|
| Separatore | `;` |
| Encoding | Latin-1 / CP1252 |
| Header row | 0 |
| Struttura righe | **Una riga per autore/attore** → stesso titolo ripetuto N volte |

**Colonne**:
```
CODICEF ; SUBSCRIPTION ; SERVICE_TYPE ; SALES_START_PERIOD ; SALES_END_PERIOD ;
RETAIL_PRICE ; SALES_COUNT ; TIPOLOGIA_DESC ; CODICE PRODOTTO ; EDIZIONE ;
TITOLO ITALIANO ; TITOLO ORIGINALE ; EPISODIO ; TITOLO EPIS ITALIANO ;
TITOLO EPIS ORIGINALE ; PAESE1 ; PAESE2 ; PAESE3 ; ANNO PROD ;
[Prima/Replica] ; [Durata con apostrofo] ; [N. riga per opera] ; [Ruolo] ;
[Cognome] ; [Nome] ; [?] ; [Casa produzione]
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `TITOLO ITALIANO` | `titolo` | `toTitleCase` |
| `TITOLO ORIGINALE` | `titolo_originale` | `toTitleCase` |
| `TITOLO EPIS ITALIANO` | `titolo_episodio` | — |
| `EPISODIO` | `numero_episodio` | `parseInt` |
| `ANNO PROD` | `anno` | `parseInt` |
| `TIPOLOGIA_DESC` | `tipo` | `toTitleCase` |
| `RETAIL_PRICE` | `retail_price` | `parseFloat` |
| `SALES_COUNT` | `views` | `parseInt` |
| `SALES_START_PERIOD` | `data_inizio` | `validateDate` (`DD/MM/YYYY`) |
| `SALES_END_PERIOD` | `data_fine` | `validateDate` |
| Colonna durata (posizionale) | `durata_minuti` | `rti_duration_string` (`128'` → 128) |

### Anomalie CSV
- **Righe duplicate per autore**: ogni titolo ha una riga per ogni attore/regista (`RUOLO` = `AT`, `RE`, `SO`...). Bisogna **de-duplicare** raggruppando per `CODICEF + EDIZIONE + EPISODIO` prima dell'import, altrimenti lo stesso film viene importato N volte.
- **Durata con apostrofo**: `128'` = 128 minuti. Strip del `'` finale.
- **`PAESE1`/`2`/`3`**: codici paese (`I`, `F`, `E`, `USA`...), non nomi per esteso.

### 5b. TXT fixed-width (`9156338_AIE_GEN_C5_GEN.TXT`)

| Proprietà | Valore |
|---|---|
| Formato | Fixed-width proprietario (formato AIE/IMAIE) |
| Encoding | Latin-1 |

**Layout colonne** (offset carattere):
```
[0-2]   Tipo record
[3-4]   Codice
[5-7]   Canale (es. "C5")
[8-17]  Data trasmissione (DD/MM/YYYY)
[19-26] Orario inizio (HH:MM:SS)
[28-35] Orario fine (HH:MM:SS)
[37-39] Codice genere
[40-45] Durata diritti musica (minuti decimali, es. "49.55")
[46]    SIAE code
[48]    Prima/Replica flag
[51-...]  Titolo italiano (larghezza fissa ~60 chars)
[111-...] Titolo originale (larghezza fissa)
```

> ⚠️ **Questo file riporta dati musica/diritti IMAIE, non dati di palinsesto generali.** La `Durata` rappresenta i minuti di musica/opere attribuiti all'interno della trasmissione, non la durata totale del programma. Richiede un parser custom con offset fissi.

### Anomalie TXT
- Durata = diritti-attribuita (può essere inferiore alla durata effettiva trasmissione)
- Una riga per opera musicale all'interno del programma → possibili N righe con stesso titolo
- Non contiene `numero_episodio`, `numero_stagione`, `anno_produzione`

---

## 6. SKY — Sky Atlantic, SKY Cinema Action, Cielo, TV8

| Proprietà | Valore |
|---|---|
| File | `Sky_Atlantic_AIE.txt`, `SKY_CINEMA_ACTION_AIE.txt`, `Cielo_AIE.txt`, `TV8_AIE.txt` |
| Formato | TSV (Tab-separated values) |
| Encoding | UTF-8 |
| Header row | 0 |
| Canali nel file | Uno per file (canale in colonna `Canale`) |

### Colonne (identiche per tutti i canali Sky)
```
Canale \t Data inizio trasmissione \t Orario inizio trasmissione \t Durata trasmissione \t
Titolo originale trasmissione \t Titolo trasmissione \t Titolo originale episodio \t
Titolo episodio \t Tipologia \t Dettagli \t Paese di produzione \t Anno produzione \t
Regia \t Attori \t [?] \t [Doppiatori?]
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `Canale` | `canale` | — |
| `Titolo trasmissione` | `titolo` | `toTitleCase` |
| `Titolo originale trasmissione` | `titolo_originale` | — |
| `Titolo episodio` | `titolo_episodio` | — |
| `Titolo originale episodio` | `titolo_episodio_originale` | — |
| `Data inizio trasmissione` | `data_trasmissione` | `validateDate` (`DD/MM/YYYY`) |
| `Orario inizio trasmissione` | `ora_inizio` | `validateTime` (`HH:MM:SS`) |
| `Durata trasmissione` | `durata_minuti` | `hhmmss_to_minutes` (`01:04:51` → 65) |
| `Anno produzione` | `anno` | `parseInt` |
| `Paese di produzione` | — | — |
| `Tipologia` | `tipo` | — (`Fiction`, `Film`...) |
| `Dettagli` | — | Sottocategoria (`Film cinematografici`, `Miniserie`...) |
| `Regia` | `regia` | — |

### Anomalie
- **Durata in formato `HH:MM:SS`** (non minuti): `01:04:51` = 64.85 min → applicare `hhmmss_to_minutes`.
- `Titolo originale trasmissione` può essere vuoto (per produzioni italiane).
- I file coprono solo 6 mesi (luglio 2024 in avanti nel campione) — il dato annuale potrebbe richiedere unione di più file mensili.
- Attenzione: i titoli episodio Sky seguono il pattern `"House Of The Dragon 02 Ep.02 - Rhaenyra La Crudele"` — il numero episodio non ha colonna dedicata ma è embedded nel titolo.

---

## 7. Netflix

| Proprietà | Valore |
|---|---|
| File | `NETFLIX_2024 ANNO INTERO_updated.csv` |
| Formato | CSV con campi quotati |
| Separatore | `,` |
| Encoding | UTF-8 con BOM |
| Header row | 0 |

### Colonne
```
end_date , viewing_country , show_id , show_name , series_id , series_name ,
netflix_id , episode_name , episode_nbr , release_year , episode_runtime ,
distributor , country_of_origin , content_type , [genre] , [season_nbr] ,
[is_original] , [?×8]
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `show_name` | `titolo` | Stringa già pulita |
| `series_name` | `titolo` (serie) | Fallback se `episode_name` assente |
| `episode_name` | `titolo_episodio` | — |
| `episode_nbr` | `numero_episodio` | `netflix_episode_nbr` (`"--"` → None) |
| `release_year` | `anno` | `parseInt` |
| `episode_runtime` | `durata_minuti` | `decimal_minutes_to_int` (`89.3` → 89) |
| `distributor` | `production` | — |
| `country_of_origin` | — | Codice paese ISO |
| `content_type` | `tipo` | `"Non-TV"`, `"TV"` |
| `end_date` | — | `us_date_to_iso` (`MM/DD/YYYY`) |

### Anomalie
- **Formato data americano**: `end_date` = `"12/31/2024"` (MM/DD/YYYY) → inversione mese/giorno richiesta. Non mappare come `data_trasmissione` (è data fine periodo rendicontazione, non data singola trasmissione).
- **`episode_nbr = "--"`** per film e contenuti non-seriali → trattare come None.
- `episode_runtime` è un decimale float (`89.3`, `98.3`) → arrotondare a int.
- Non c'è `data_trasmissione` precisa — solo `end_date` che è la fine del periodo annuale.
- I titoli possono contenere virgolette doppie escapate (`"""Sr."""`).

---

## 8. LA7

| Proprietà | Valore |
|---|---|
| File | `LA7 2024_ANNO INTERO.xlsx` |
| Formato | Excel (XLSX) |
| Sheet | `Foglio1` |
| Header row | 0 |
| Colonne effettive | 18 (+ ~38 colonne vuote trailing) |

### Colonne (prime 18 significative)
```
Emittente | Data trasmissione | Orario | Durata netta | Prima/Replica |
Titolo originale | Titolo italiano | Tipologia opera | Numero episodio |
Numero/Anno stagione | Titolo episodio italiano | Titolo episodio originale |
Anno | Paesi di produzione | Produttore | Regia | Attori principali |
Doppiatori principali
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `Emittente` | `canale` | — (`La7`) |
| `Data trasmissione` | `data_trasmissione` | Già `datetime` da openpyxl → `.date().isoformat()` |
| `Orario` | `ora_inizio` | Già stringa `HH:MM:SS` |
| `Durata netta` | `durata_minuti` | `fractional_hours_to_minutes` ← **ore decimali** (`0.454` → 27 min) |
| `Titolo italiano` | `titolo` | `toTitleCase` |
| `Titolo originale` | `titolo_originale` | — |
| `Tipologia opera` | `tipo` | — |
| `Numero episodio` | `numero_episodio` | `xls_float_to_int` |
| `Numero/Anno stagione` | `numero_stagione` | `xls_float_to_int` |
| `Titolo episodio italiano` | `titolo_episodio` | — |
| `Titolo episodio originale` | `titolo_episodio_originale` | — |
| `Anno` | `anno` | Già stringa `'2023'` → `parseInt` |
| `Produttore` | `production` | — |
| `Regia` | `regia` | — |

### Anomalie
- **`Durata netta` in ore decimali**: `0.454` = 27.24 min, `0.086` = 5.16 min, `0.502` = 30.1 min. **Non confondere con Viacom** che usa minuti decimali.
- Molte righe hanno `Titolo italiano = None` — sembrano trasmissioni senza titolo catalogato (spot, promo). Scartare le righe senza titolo.
- 38 colonne vuote trailing → ignorare.
- `Anno` è stringa (`'2023'`, `'2017'`) non intero — `parseInt`.
- `Prima/Replica`: `'R'` = Replica, `'P'` = Prima. Standard.

---

## 9. Discovery — Nove, Giallo, Warner TV

Tre canali con schemi molto simili ma formati file diversi.

### 9a. Discovery Nove — `Nove 2024.xls` (Excel legacy BIFF8)

| Proprietà | Valore |
|---|---|
| Formato | XLS legacy (BIFF8) — reader: **xlrd** |
| Sheet | `NOVE 2024` |
| Righe | ~65.535 (limite BIFF8) |
| Header row | 0 |

**Colonne**:
```
EMITTENTE | DATA DI TRASMISSIONE | DURATA | TITOLO ITALIANO | TITOLO ORIGINALE |
NUMERO EPISODIO | ANNO/STAGIONE | TITOLO EPISODIO ITALIANO | TITOLO EPISODIO ORIGINALE |
ANNO DI PRODUZIONE | PAESE DI PRODUZIONE | PRODUTTORE | REGIA | INTERPRETI PRINCIPALI
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `EMITTENTE` | `canale` | — |
| `DATA DI TRASMISSIONE` | `data_trasmissione` | `xls_serial_to_date` (serial float 45292 → `2024-01-01`) |
| `DURATA` | `durata_minuti` | `hhmmss_to_minutes` (stringa `'02:52:16'`) |
| `TITOLO ITALIANO` | `titolo` | `toTitleCase` |
| `TITOLO ORIGINALE` | `titolo_originale` | — |
| `NUMERO EPISODIO` | `numero_episodio` | `xls_float_to_int` |
| `ANNO/STAGIONE` | `numero_stagione` | `xls_float_to_int` |
| `TITOLO EPISODIO ITALIANO` | `titolo_episodio` | — |
| `TITOLO EPISODIO ORIGINALE` | `titolo_episodio_originale` | — |
| `ANNO DI PRODUZIONE` | `anno` | `xls_float_to_int` |
| `PRODUTTORE` | `production` | — |
| `REGIA` | `regia` | `null_if_NA` |
| `INTERPRETI PRINCIPALI` | — | Lista separata da `,` — non mappare |

### 9b. Discovery Giallo — `GIALLO 2024.xlsx`

Stesso schema di Nove, ma:
- Formato: XLSX (non XLS) → reader: openpyxl
- `DATA DI TRASMISSIONE`: già `datetime` da openpyxl → `.date().isoformat()`
- `DURATA`: **`datetime.time` da openpyxl** → `time_obj_to_minutes`
- Colonna extra in posizione 14: attori/doppiatori italiani (senza intestazione)
- `ANNO/STAGIONE`: intero numerico

### 9c. Discovery Warner TV — `WARNER TV 2024.xlsx`

Stesso schema di Giallo:
- Formato: XLSX
- `DURATA`: stringa `'01:22:55'` → `hhmmss_to_minutes`
- `ANNO/STAGIONE` = `None` per film (non seriali) — gestire con `xls_float_to_int` che ritorna None per valori vuoti

### Anomalie Discovery (tutti)
- **Schema `ANNO/STAGIONE`**: contiene il numero di stagione (non l'anno). Nome colonna fuorviante.
- `REGIA`, `INTERPRETI PRINCIPALI`, `PRODUTTORE` spesso `'N/A'` → `null_if_NA`.
- Titoli TUTTI IN MAIUSCOLO → applicare `toTitleCase`.
- Tre file con tre formati diversi (`.xls`, `.xlsx`, `.xlsx`) pur essendo dello stesso gruppo — reader da selezionare dinamicamente su estensione.

---

## 10. Viacom — Comedy Central, Nickelodeon, Super!

| Proprietà | Valore |
|---|---|
| File | `Modello rendiconti emittenti REV.2_COMEDY_2024.xls`, `_NICK_2024.xls`, `_SUPER_2024.xls` |
| Formato | XLS legacy (BIFF8) — reader: **xlrd** |
| Header row | **2** (0-indexed) |
| Descrizioni colonne | Row 3 (da skippare) |
| Dati | Da row 4 in poi |
| Righe dati | Comedy ~11.207, Nick ~29.706, Super! ~20.468 |

### Colonne (header a row 2)
```
Emittente | Data trasmissione | Orario | Durata Netta | Prima/Replica |
Titolo Originale | Titolo Italiano | Tipologia opera | Numero Episodio |
Numero/Anno stagione | Titolo Episodio Italiano | Titolo Episodio Originale |
Anno | Paesi di Produzione | Produttore | Regia | Attori principali |
Doppiatori Principali
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `Emittente` | `canale` | — (`Comedy Central`, `Nickelodeon`, `Super!`) |
| `Data trasmissione` | `data_trasmissione` | `xls_serial_to_date` (float `45292.0` → `2024-01-01`) |
| `Orario` | `ora_inizio` | `xls_fraction_to_time` (float `0.25` → `06:00:00`) |
| `Durata Netta` | `durata_minuti` | `decimal_minutes_to_int` ← **minuti decimali** (`21.683` → 22) |
| `Titolo Originale` | `titolo_originale` | — |
| `Titolo Italiano` | `titolo` | — |
| `Tipologia opera` | `tipo` | — (`SIT COM`, `CAR`, `DOC`...) |
| `Numero Episodio` | `numero_episodio` | `xls_float_to_int` |
| `Numero/Anno stagione` | `numero_stagione` | `xls_float_to_int` |
| `Titolo Episodio Italiano` | `titolo_episodio` | — |
| `Titolo Episodio Originale` | `titolo_episodio_originale` | — |
| `Anno` | `anno` | `xls_float_to_int` |
| `Produttore` | `production` | — |
| `Regia` | `regia` | — |

### Anomalie
- **Header a row 2, non row 0**: row 0 = nota legale, row 1 = raggruppamento, row 3 = descrizioni delle colonne (da saltare). Configurare `header_row=2`, `skip_rows=[3]`, `data_start_row=4`.
- **`Durata Netta` in minuti decimali** (non ore, non secondi): `21.683` = 21 min 41 sec → `round()` a int.
- **`Data trasmissione` serial Excel**: float xlrd, richiede `xlrd.xldate_as_datetime(v, wb.datemode)`.
- **`Orario` come frazione di giorno**: `0.25` = 6 ore = `06:00:00`. `xls_fraction_to_time`.
- Tutti i valori numerici (episodio, stagione, anno) sono float Excel → cast a int.
- `Attori principali` separati da `;` — non mappare direttamente.
- Formato identico per i 3 canali; il campo `Emittente` discrimina il canale.

---

## 11. Disney Plus

| Proprietà | Valore |
|---|---|
| File | `DISNEY PLUS 2024 _ANNO INTERO.xlsx` |
| Formato | Excel (XLSX) — 79 MB |
| Sheet | `202401_disney_content_metrics_I` |
| Righe dati | ~436.186 |
| Header row | 0 |

### Colonne (34 totali)
```
REPORT_PERIOD | PROGRAM_ID | PROGRAM_NAME | SERIES_NAME | SEASON_EPISODE_NUMBER |
PRODUCTION_YEAR | RELEASE_DATE | PERFORMANCE_COUNT | DISTRIBUTOR | NETWORK |
PRODUCTION_NUMBER | PRODUCTION_TYPE | IS_EXCLUSIVE | RAPIDCUE_SHEET_NUM |
PROGRAM_TMS_ID | ISAN | EIDR | PRODUCTION_CATEGORY | PRODUCTION_COMPANY |
CMO_COUNTRY | SERIES_AKA | SEASON_NUMBER | AIR_DATE | PERFORMANCE_CATEGORY |
RUN_TIME_DURATION_MINS | DELIVERED_DURATION_MINS | SEASON_EIDR | SERIES_EIDR |
COUNTRY_OF_ORIGIN | PREMIER_ACCESS_AIR_DATE | PREMIER_ACCESS_EXPIRATION_DATE |
QUARTER_BUSINESS_EST_DATE | PREMIER_ACCESS_PERFORMANCE_COUNT |
GENERAL_ACCESS_PERFORMANCE_COUNT
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `PROGRAM_NAME` | `titolo` | — |
| `SERIES_NAME` | `titolo_episodio` (se serie) | Fallback / titolo serie |
| `SEASON_EPISODE_NUMBER` | `numero_episodio` | `null_if_NULL_str` → `parseInt` |
| `SEASON_NUMBER` | `numero_stagione` | `null_if_NULL_str` → `parseInt` |
| `PRODUCTION_YEAR` | `anno` | `parseInt` |
| `AIR_DATE` | `data_trasmissione` | Già `datetime` da openpyxl |
| `PRODUCTION_TYPE` | `tipo` | — (`series`, `movie`, `other`, `clip`) |
| `PRODUCTION_COMPANY` | `production` | — |
| `NETWORK` | `canale` | `Disney Plus` sempre |
| `PERFORMANCE_COUNT` | `views` | `parseInt` |
| `EIDR` / `SEASON_EIDR` / `SERIES_EIDR` | — | Identificatori standard, non mappati |

### Anomalie
- ⚠️ **`RUN_TIME_DURATION_MINS` NON è la durata per episodio**: è il totale cumulativo di minuti di fruizione (es. `23.153.667` per un episodio con 6 stream). **Non usare per `durata_minuti`**. La durata unitaria del contenuto non è presente in questo file.
- `SEASON_EPISODE_NUMBER`, `PRODUCTION_NUMBER`, ecc. hanno valore stringa `'NULL'` (non Python `None`) → applicare `null_if_NULL_str`.
- `REPORT_PERIOD` = `M1-2024` → rendicontazione mensile; ogni riga è l'aggregato mensile per quel contenuto.
- `PRODUCTION_CATEGORY` = `NULL` per la maggior parte delle righe.
- File molto grande (79MB): aprire in `read_only=True` con openpyxl.

---

## 12. Amazon Video — CHANNELS & TVOD

### 12a. Amazon CHANNELS — `Amazon_Video_RASI_IT_2024_CHANNELS_Content.csv`

| Proprietà | Valore |
|---|---|
| Formato | CSV, separatore `,` |
| Encoding | UTF-8 |
| Dimensione | ~95 MB |
| Header row | 0 |

**Colonne**:
```
reportingyear , reportingperiod , country , service_name , channel_name ,
content_type , series_or_movie_name , title_name , episode_number , season_number ,
production_year , maxgti , studio_name , production_company , production_country ,
runtime_minutes , director
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `title_name` | `titolo` | — |
| `series_or_movie_name` | Titolo serie (contestuale) | — |
| `episode_number` | `numero_episodio` | `str_to_int` |
| `season_number` | `numero_stagione` | `str_to_int` |
| `production_year` | `anno` | `str_to_int` |
| `runtime_minutes` | `durata_minuti` | `str_to_int` ← **già in minuti** |
| `production_company` | `production` | — |
| `director` | `regia` | — |
| `channel_name` | `canale` | Es. `History Play`, `Anime Generation` |
| `content_type` | `tipo` | `TV`, `MOVIE` |
| `maxgti` | — | ID Amazon interno |

### 12b. Amazon TVOD — `Amazon_Video_RASI_IT_2024_TVOD_Content.csv`

| Proprietà | Valore |
|---|---|
| Formato | CSV, separatore **`;`** (diverso da CHANNELS!) |
| Encoding | UTF-8 |
| Header row | 0 |

**Colonne**:
```
reporting_year ; reporting_period ; country ; service_name ; series_or_movie_name ;
production_year ; maxgti ; studio_name ; production_company ; production_country ;
runtime_minutes ; director ; buy_or_rental
```

> Schema ridotto rispetto a CHANNELS: mancano `title_name`, `episode_number`, `season_number`, `channel_name`; aggiunto `buy_or_rental` (`PURCHASE`, `RENTAL`).

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `series_or_movie_name` | `titolo` | — |
| `production_year` | `anno` | `str_to_int` |
| `runtime_minutes` | `durata_minuti` | `str_to_int` |
| `production_company` | `production` | — |
| `director` | `regia` | — |

### Anomalie Amazon
- ⚠️ **Separatore diverso tra CHANNELS (`,`) e TVOD (`;`)** — parser da configurare separatamente.
- **Nessuna data di trasmissione** — solo `reportingperiod` trimestrale (`Q1`–`Q4`).
- `runtime_minutes` è stringa → `str_to_int`.
- File CHANNELS molto grande (95MB): usare lettura per chunk o `pandas.read_csv(chunksize=...)`.

---

## 13. Apple TV — SVOD & TVOD

### 13a. Apple TV+ SVOD — `ANNO INTERO - AppleTVPlusSVOD_2024_IT.xlsx`

| Proprietà | Valore |
|---|---|
| Sheet | `CONFIDENTIAL - AppleTVPlus_2024` |
| Colonne | 47 (+ 2 vuote trailing) |
| Header row | 0 |

**Colonne chiave** (selezione dalle 47):
```
DspResourceId | ISAN | EIDR | ProprietaryResourceId | VideoType | ResourceTitle |
ResourceSubTitle | ResourceOriginalTitle | EpisodeNumber | SeasonNumber | Genre |
Duration | ResourceDisplayArtistName | ProducerName | DirectorName | ActorName |
ProductionCompanyName | DateOfProductionOrRelease | CountryOfProduction |
OriginalBroadcastChannel | DspReleaseId | ReleaseTitle | ReleaseSubTitle |
SeriesTitle | ReleaseType | DataProvider | NumberOfStreams | ...
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `ResourceTitle` | `titolo` | — (titolo episodio) |
| `SeriesTitle` | `titolo` (serie, se `VideoType=Episode`) | — |
| `EpisodeNumber` | `numero_episodio` | `parseInt` |
| `SeasonNumber` | `numero_stagione` | `apple_season_str` (se stringa `"Season 2"`) o `parseInt` |
| `Duration` | `durata_minuti` | `iso8601_duration_to_minutes` (`PT0H22M0S` → 22) |
| `DateOfProductionOrRelease` | `data_trasmissione` | Già `datetime` da openpyxl |
| `CountryOfProduction` | — | Codice ISO |
| `DirectorName` | `regia` | — |
| `ProductionCompanyName` | `production` | — |
| `NumberOfStreams` | `views` | `parseInt` |
| `Genre` | `tipo` | — (`animation`, `drama`, `kids_and_family`...) |
| `VideoType` | — | `Episode`, `Movie` |
| `ISAN` | — | Identificatore standard |

### 13b. Apple TVOD — `ANNO INTERO_APPLE TVOD.xlsx`

| Proprietà | Valore |
|---|---|
| Sheet | `CONFIDENTIAL - ITATVMovieSales2` |
| Colonne | 39 |
| Header row | 0 |

**Colonne chiave**:
```
country | sales_month | local_currency | report_ref_id | track_adam_id | track_name |
isan | track_upc | video_subtype | directors | actors | dubber | cue_count |
content_provider_name | label_name | sales_count | track_price_local_currency |
transaction_type | track_media_type | track_duration | series_name | ...
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `track_name` | `titolo` | — |
| `series_name` | Titolo serie | — |
| `sales_month` | `sales_month` | Già intero `202401` → conforme |
| `sales_count` | `views` | `parseInt` |
| `track_price_local_currency` | `track_price_local_currency` | Stringa `'10.65'` → `parseFloat` |
| `track_duration` | `durata_minuti` | `milliseconds_to_minutes` ← **millisecondi** (`6014000` → 100 min) |
| `directors` | `regia` | — |
| `content_provider_name` | `production` | — |
| `release_date` | `data_trasmissione` | `yyyymmdd_int_to_iso` (intero `20231231` → `2023-12-31`) |

### Anomalie Apple
- **SVOD `Duration` in ISO 8601**: `PT0H22M0S` = 22 min, `PT0H48M0S` = 48 min → `iso8601_duration_to_minutes`.
- **TVOD `track_duration` in millisecondi**: `6014000` ms ÷ 60000 = 100.2 min → `milliseconds_to_minutes`.
- **TVOD `release_date`** è un intero `20231231` (YYYYMMDD) non una data → `yyyymmdd_int_to_iso`.
- `track_price_local_currency` arriva come stringa `'10.65'` (con virgolette).
- I campi `ISAN`, `EIDR`, `DspResourceId` sono utili come chiavi di matching con il catalogo opere.

---

## 14. TIMVision — SVOD & TVOD

| Proprietà | Valore |
|---|---|
| File | `TIMVISION SVOD-TVOD 2024.xlsx` |
| Sheet | `SVOD` e `TVOD` (due sheet nello stesso file) |
| Header row | 0 (entrambi) |

### Colonne (identiche per SVOD e TVOD)
```
ASSET_ID | MACRO_CATEGORIA_EDITORIALE | CATEGORIA_EDITORIALE |
CATEGORIA_EDITORIALE_DETTAGLIO | TITOLO | TITOLO_ORIGINALE |
PAESE_PRODUZIONE_1..7 | REGISTA_1 | REGISTA_2 | REGISTA_3 |
MODALITA_ACQUISTO | NOME_SERIE | NUMERO_STAGIONE | NUMERO_EPISODIO |
ANNO_DI_RIFERIMENTO | ANNO_RILASCIO_ITALIA | ANNO_RILASCIO |
DURATA_MINUTI_CONTENUTO | PROVIDER | SUBPROVIDER |
FRUIZIONI_UNICHE | DURATA_ORE | DURATA_MINUTI
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `TITOLO` | `titolo` | `null_if_ND` poi `toTitleCase` |
| `TITOLO_ORIGINALE` | `titolo_originale` | `null_if_ND` |
| `NOME_SERIE` | Titolo serie | `null_if_ND` |
| `NUMERO_STAGIONE` | `numero_stagione` | `null_if_ND` → `parseInt` |
| `NUMERO_EPISODIO` | `numero_episodio` | `null_if_ND` → `parseInt` |
| `ANNO_DI_RIFERIMENTO` | `anno` | `parseInt` |
| `DURATA_MINUTI_CONTENUTO` | `durata_minuti` | `parseInt` ← **già in minuti** |
| `REGISTA_1` + `REGISTA_2` + `REGISTA_3` | `regia` | Join con `;` dopo `null_if_ND` |
| `PAESE_PRODUZIONE_1..7` | — | Più colonne da unire se necessario |
| `FRUIZIONI_UNICHE` | `views` | `parseInt` |
| `CATEGORIA_EDITORIALE_DETTAGLIO` | `tipo` | — (`Film`, `Serie TV`...) |
| `DURATA_ORE` + `DURATA_MINUTI` | — | Durata totale viewing aggregata (non per-contenuto) |

### Anomalie
- **`N.D.` / `N.D`** come valore null in quasi tutti i campi facoltativi — applicare `null_if_ND` prima del mapping.
- `PAESE_PRODUZIONE_*`: 7 colonne separate per paese → unire in stringa unica.
- `REGISTA_*`: 3 colonne separate → unire in stringa unica.
- `DURATA_ORE` e `DURATA_MINUTI` sono il totale aggregato di fruizione (es. 199 ore e 11954 min per I Goonies con 169 fruizioni) — non usare come durata contenuto.
- `DURATA_MINUTI_CONTENUTO` è la durata effettiva del singolo contenuto — **questa è quella corretta**.
- Nessuna data di trasmissione — solo dati SVOD/TVOD aggregati.

---

## 15. CHILI — AVOD & TVOD

### 15a. CHILI AVOD — `CHILI_RASI_ALLEGATO A - Rendicontazione AVOD I TRIM. 2024.xlsx`

| Proprietà | Valore |
|---|---|
| Sheet | `RENDICONTAZONE AVOD Q1 2024` |
| Header row | **2** (row 0 = totali, row 1 = vuota) |
| Dati da | Row 3 |

**Colonne**:
```
Reference Year | Original Title | Italian Title | Year of Production |
Territory | Total Net Ad Revenue | Views | Track Duration | Production Country
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `Italian Title` | `titolo` | — |
| `Original Title` | `titolo_originale` | — |
| `Year of Production` | `anno` | Stringa `'2007'` → `parseInt` |
| `Track Duration` | `durata_minuti` | **Già in minuti interi** (`121`, `100`, `95`) → `parseInt` |
| `Total Net Ad Revenue` | `total_net_ad_revenue` | `parseFloat` |
| `Views` | `views` | `parseInt` |

### 15b. CHILI TVOD — `CHILI_RASI_ALLEGATO A - Rendicontazione TVOD I TRIM. 2024.xlsx`

| Proprietà | Valore |
|---|---|
| Sheet | `REDNICONTAZIONE TVOD Q1 2024` (sic — typo nel nome sheet) |
| Header row | **1** (row 0 = totali) |
| Dati da | Row 2 |

**Colonne**:
```
Reference Year | Original Title | Italian Title | Year Of Production |
Territory | Retail Price | Sales Count | Truck Duration | Production Country |
Total Revenues (€)
```

> ⚠️ `Truck Duration` (typo di "Track Duration") — nome identico all'AVOD ma unità completamente diversa.

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `Italian Title` | `titolo` | — |
| `Original Title` | `titolo_originale` | — |
| `Year Of Production` | `anno` | Stringa `'2023'` → `parseInt` |
| `Truck Duration` | `durata_minuti` | `fractional_day_to_minutes` ← **frazione di giorno** (`0.0743` → 107 min) |
| `Retail Price` | `retail_price` | `parseFloat` |
| `Sales Count` | `views` | `parseInt` |
| `Total Revenues (€)` | `total_revenue` | `parseFloat` |

### Anomalie CHILI
- ⚠️ **Durata AVOD vs TVOD — unità diverse nello stesso emittente**:
  - AVOD: `Track Duration` = minuti interi (`121`)
  - TVOD: `Truck Duration` = frazione di giorno (`0.0743` × 24 × 60 = 107 min)
- ⚠️ **Typo nel nome colonna TVOD**: `Truck Duration` invece di `Track Duration`.
- ⚠️ **Typo nel nome sheet TVOD**: `REDNICONTAZIONE` invece di `RENDICONTAZIONE`.
- **Header row diversa tra i due file**: AVOD = row 2, TVOD = row 1.
- Rendicontazione **trimestrale** (Q1 nel campione) — file multipli per anno.
- Nessuna data di trasmissione precisa.

---

## 16. Sony Culver Digital

| Proprietà | Valore |
|---|---|
| File | `SONY CULVER DIGITAL.xlsx` |
| Sheet attivo | `Jan - Dec 2024` (+ 3 sheet anni precedenti) |
| Header row | 0 |
| Colonne | 4 |

**Colonne**:
```
Product Name | Italian Name | Year | Type
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `Italian Name` | `titolo` | — |
| `Product Name` | `titolo_originale` | — |
| `Year` | `anno` | `parseInt` |
| `Type` | `tipo` | — (`Film`) |

### Anomalie
- **Schema minimalista**: nessuna data, nessuna durata, nessun episodio, nessun produttore/regia.
- Funziona come **lista di catalogo** più che come rendicontazione di trasmissioni.
- Titolo italiano (`Italian Name`) non sempre è in italiano — alcuni sono in spagnolo (`"El Sueño De Mi Vida"`).
- Utile per il matching con il catalogo opere, non per il palinsesto.

---

## 17. Samsung TV Plus

| Proprietà | Valore |
|---|---|
| File | `Samsung TV Plus - Channel list for Italy - Active Users data.xlsx` |
| Sheet | `Sheet1` |
| Struttura | Pivot: canali in righe, anni in colonne |

**Struttura**:
```
Row 0: header ("Channel Name", "Users who view... ≥15min", None×4)
Row 1: sub-header (None, 2020, 2021, 2022, 2023, "2024 (Jan-Nov)")
Row 3+: dati (Nome canale, None, int, int, int, int)
```

> ⚠️ **Non è un file di palinsesto**. Contiene solo dati di audience aggregati per canale e anno (utenti unici che hanno visto il canale ≥15 minuti). Non contiene titoli di opere, date di trasmissione né durate.

### Utilizzo possibile
- Utile per **validare quali canali Samsung sono attivi** e quanti utenti hanno.
- Non importabile come programmazione nel senso RASI.
- Se necessario usare: de-pivottare (melt) righe→colonne per ottenere `(channel, year, users)`.

---

## 18. Italolive

| Proprietà | Valore |
|---|---|
| File | `Italolive 2024.xlsx` |
| Sheet | `Table 3` |
| Header row | **1** (row 0 = "ITALOLIVE_REPORT VIDEO 2024") |
| Colonne | 3 |

**Colonne**:
```
TITOLO | ANNO | VISUALIZZAZIONI
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `TITOLO` | `titolo` | — |
| `ANNO` | `anno` | `parseInt` |
| `VISUALIZZAZIONI` | `views` | Float (8.083, 10.67) → `parseInt` o `round` |

### Anomalie
- **Schema ultra-minimalista**: solo titolo, anno, visualizzazioni.
- `VISUALIZZAZIONI` è decimale (8.083, 10.67) — probabile arrotondamento in migliaia (8.083k views) o reale numero con decimali. Verificare con l'emittente.
- Nessuna data di trasmissione, durata, episodio, tipo.
- Utile solo come lista di opere con conteggio view — non come palinsesto.

---

## 19. TV2000

| Proprietà | Valore |
|---|---|
| File | `TV2000 GEN 2024 - report.xlsx` |
| Sheet | `GEN 24 originale` |
| Header row | 0 |
| Periodo coperto | Solo Gennaio 2024 (nel campione) |

### Colonne
```
Canale | Titolo trasmissione | Titolo originale trasmissione |
Data inizio trasmissione | Orario inizio trasmissione | Orario fine trasmissione |
Durata trasmissione | Replica o prima esecuzione | Paese di produzione |
Anno di produzione | Produttore | Regista | Titolo episodio |
Titolo originale episodio | Numero progressivo episodio
```

| Colonna sorgente | Campo RASI | Transform |
|---|---|---|
| `Canale` | `canale` | — (`TV2000`) |
| `Titolo trasmissione` | `titolo` | `toTitleCase` |
| `Titolo originale trasmissione` | `titolo_originale` | — |
| `Data inizio trasmissione` | `data_trasmissione` | Già `datetime` da openpyxl → `.date().isoformat()` |
| `Orario inizio trasmissione` | `ora_inizio` | `datetime.time` → `strftime('%H:%M:%S')` |
| `Orario fine trasmissione` | `ora_fine` | idem |
| `Durata trasmissione` | `durata_minuti` | `time_obj_to_minutes` (`datetime.time(0,29,4)` → 29) |
| `Replica o prima esecuzione` | — | Intero (`1` = replica?) — mappatura codice da definire |
| `Anno di produzione` | `anno` | `parseInt` |
| `Produttore` | `production` | — |
| `Regista` | `regia` | — |
| `Titolo episodio` | `titolo_episodio` | — |
| `Numero progressivo episodio` | `numero_episodio` | `parseInt` |

### Anomalie
- **Date e orari già come oggetti Python** (`datetime.datetime`, `datetime.time`) tramite openpyxl — nessuna conversione stringa necessaria.
- `Durata trasmissione` è un `datetime.time` (`0:29:04`) → `time_obj_to_minutes`.
- **Una riga per segmento**: lo stesso film è spezzato in segmenti (`0:29:04`, `0:30:57`, `0:34:50`...) — necessaria aggregazione per `Titolo + Data` per ottenere la durata totale, o importare i segmenti as-is.
- `Replica o prima esecuzione`: valore intero (`1`) — significato codice non esplicitato nel file.
- Probabile disponibilità solo mensile (un file per mese).

---

## 20. Anomalie trasversali

### 20.1 Durata — 8 unità diverse tra gli emittenti

| Unità | Emittenti | Transform |
|---|---|---|
| Secondi interi | RAI | `÷ 60 → int` |
| Minuti interi | Amazon, TIMVision, CHILI AVOD, Sony (N/A) | `parseInt` |
| Minuti decimali | Netflix, Viacom | `round → int` |
| Ore decimali | LA7 | `× 60 → int` |
| Frazione di giorno | CHILI TVOD | `× 24 × 60 → int` |
| Stringa `HH:MM:SS` | SKY, Discovery Nove, Discovery Warner | `hhmmss_to_minutes` |
| `datetime.time` | Discovery Giallo, TV2000 | `h×60+m+s÷60 → int` |
| ISO 8601 (`PT0H22M0S`) | Apple SVOD | `iso8601_to_minutes` |
| Millisecondi interi | Apple TVOD | `÷ 60000 → int` |
| Stringa `128'` (apostrofo) | RTI-Mediaset CSV | `strip("'") → int` |
| ❌ Assente / non unitaria | Disney Plus, Samsung, Italolive, Sony | Non importare |

### 20.2 Data trasmissione — 6 formati diversi

| Formato | Emittenti | Transform |
|---|---|---|
| `YYYY-MM-DD` (ISO) | RAI Premium, già conforme | Nessuna |
| `DD/MM/YYYY` | RAI1, SKY, RTI-Mediaset | `validateDate` esistente |
| `DD/MM/YY` | Possibile variante | `validateDate` esistente |
| `MM/DD/YYYY` (americano) | Netflix `end_date` | `us_date_to_iso` |
| Serial Excel float | Viacom, Discovery Nove (xlrd) | `xls_serial_to_date` |
| `datetime` object | LA7, Discovery Giallo, TV2000, Disney (openpyxl) | `.date().isoformat()` |
| Intero `20231231` | Apple TVOD | `yyyymmdd_int_to_iso` |
| Periodo trimestrale `Q1-Q4` | Amazon, Netflix (end_date) | Non mappare come data precisa |

### 20.3 Header row non standard

| Emittente | Header row | Problema |
|---|---|---|
| Viacom | 2 | Righe 0-1 note legali/raggruppamento; row 3 = descrizioni colonne da skippare |
| CHILI AVOD | 2 | Row 0 = totali aggregati |
| CHILI TVOD | 1 | Row 0 = totali aggregati |
| Italolive | 1 | Row 0 = titolo report |
| Sony | 0 | Ma ci sono 4 sheet (anni) — usare solo l'anno corretto |
| Samsung | Pivot | Struttura non tabellare standard |

### 20.4 Formati file non standard

| Formato | Emittenti | Reader richiesto |
|---|---|---|
| `.xls` (BIFF8 legacy) | Viacom (3 file), Discovery Nove | `xlrd` (non openpyxl) |
| Fixed-width `.TXT` | RTI-Mediaset Canale5 | Parser custom con offset fissi |
| TSV (`.txt` con tab) | SKY (4 file) | `csv.reader(delimiter='\t')` o `pandas.read_csv(sep='\t')` |
| CSV con `;` | RAI, RTI-Mediaset CSV, Amazon TVOD | `delimiter=';'` |
| CSV con `,` | Netflix, Amazon CHANNELS | Standard |

### 20.5 Righe duplicate / struttura non normale

| Emittente | Problema | Soluzione |
|---|---|---|
| RTI-Mediaset CSV | Una riga per autore (stessa trasmissione N volte) | De-duplicare per `CODICEF+EDIZIONE+EPISODIO`, tenere prima riga |
| TV2000 | Una riga per segmento dello stesso film | Aggregare per `Titolo+Data` se serve durata totale |
| Samsung | Dati pivot (canali×anni) | De-pivottare o non importare come palinsesto |

### 20.6 Campi con valori null non standard

| Valore null | Emittenti | Transform |
|---|---|---|
| `'N.D.'` / `'N.D'` | TIMVision | `null_if_ND` |
| `'N/A'` | Discovery | `null_if_NA` |
| `'NULL'` (stringa) | Disney Plus | `null_if_NULL_str` |
| `'--'` | Netflix `episode_nbr` | `netflix_episode_nbr` |
| Stringa vuota `''` | Viacom, vari | Già gestita da `coerce()` |

### 20.7 Encoding problematici

| Emittente | Encoding | Note |
|---|---|---|
| RAI Premium | UTF-8 con BOM (`utf-8-sig`) | Evitare intestazione spuria `ï»¿` |
| RTI-Mediaset `.TXT` | Latin-1 / CP1252 | Caratteri accentati italiani |
| Viacom `.xls` | Latin-1 (xlrd gestisce automaticamente) | — |
| CHILI | UTF-8 | — |

---

## 21. Matrice di conformità

Campi RASI presenti (✅), assenti (❌), o parziali/anomali (⚠️) per emittente.

| Emittente | titolo | data_trasmissione | ora_inizio | durata_minuti | numero_episodio | numero_stagione | anno | tipo | views | revenue |
|---|---|---|---|---|---|---|---|---|---|---|
| RAI | ✅ | ✅ `DD/MM/YYYY` | ✅ | ⚠️ secondi | ⚠️ posizionale | ⚠️ | ✅ | ⚠️ codice numerico | ❌ | ❌ |
| RTI CSV | ✅ | ✅ periodo | ❌ | ⚠️ apostrofo | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| RTI TXT | ✅ | ✅ | ✅ | ⚠️ diritti musica | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| SKY | ✅ | ✅ `DD/MM/YYYY` | ✅ | ⚠️ `HH:MM:SS` | ⚠️ embedded nel titolo | ⚠️ | ✅ | ✅ | ❌ | ❌ |
| Netflix | ✅ | ⚠️ solo fine periodo | ❌ | ⚠️ decimale | ⚠️ `"--"` | ❌ | ✅ | ✅ | ❌ | ❌ |
| LA7 | ✅ | ✅ datetime | ✅ | ⚠️ ore decimali | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Discovery Nove | ✅ | ⚠️ serial XLS | ❌ | ⚠️ `HH:MM:SS` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Discovery Giallo | ✅ | ✅ datetime | ❌ | ⚠️ time obj | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Discovery Warner | ✅ | ✅ datetime | ❌ | ⚠️ `HH:MM:SS` | ✅ | ⚠️ None se film | ✅ | ❌ | ❌ | ❌ |
| Viacom | ✅ | ⚠️ serial XLS | ⚠️ frazione giorno | ⚠️ minuti decimali | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Disney Plus | ✅ | ⚠️ release date | ❌ | ❌ non unitaria | ⚠️ `'NULL'` | ✅ | ✅ | ✅ | ✅ | ❌ |
| Amazon CHANNELS | ✅ | ⚠️ solo trimestre | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Amazon TVOD | ✅ | ⚠️ solo trimestre | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Apple SVOD | ✅ | ⚠️ release date | ❌ | ⚠️ ISO 8601 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Apple TVOD | ✅ | ⚠️ intero YYYYMMDD | ❌ | ⚠️ millisecondi | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| TIMVision | ✅ | ❌ | ❌ | ✅ | ⚠️ `N.D.` | ⚠️ `N.D.` | ✅ | ✅ | ✅ | ❌ |
| CHILI AVOD | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| CHILI TVOD | ✅ | ❌ | ❌ | ⚠️ frazione giorno | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Sony | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Samsung | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ audience | ❌ |
| Italolive | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| TV2000 | ✅ | ✅ datetime | ✅ time obj | ⚠️ time obj | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

---

*Fine documento — versione 1.0 — 2026-05-18*
