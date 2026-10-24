# Checklist decisioni — Matching equilibrato

**Data:** 2026-09-17  
**Stato:** Bozza per riunione (solo decisioni, nessuna implementazione)  
**Contesto:** Briefing banca dati + algoritmo individuazioni; regola larga episodi nata da Netflix 2025  
**Obiettivo del documento:** ottenere sì/no espliciti su modello a fasce, perimetro catalogo e criteri di accettazione, prima di qualsiasi sviluppo.

---

## Come usare questa checklist in riunione

1. Percorrere le sezioni in ordine (A → F).
2. Per ogni riga: segnare **Sì / No / Rimandato** e, se serve, una nota di una riga.
3. Le decisioni **Rimandato** devono avere owner e data di ripresa.
4. Fine riunione: firmare il riquadro in fondo; senza riquadro firmato non si apre lavoro di implementazione.

---

## A. Principio guida (modello a esiti)

| # | Decisione | Sì | No | Rimandato | Note |
|---|---|---|---|---|---|
| A1 | Ogni riga di palinsesto deve chiudere con un esito **esplicito** (mai scarto silenzioso) | ☐ | ☐ | ☐ | |
| A2 | Adottare le 4 fasce: **Certo** / **Probabile** / **Ambiguo** / **Non identificabile** | ☐ | ☐ | ☐ | |
| A3 | Solo fascia **Certo** genera auto-individuazione “confermata” senza revisione obbligatoria | ☐ | ☐ | ☐ | |
| A4 | Fascia **Probabile** crea individuazione ma resta in coda di revisione leggera | ☐ | ☐ | ☐ | |
| A5 | Fascia **Ambiguo** (più candidati o segnale debole) non auto-sceglie: solo revisione | ☐ | ☐ | ☐ | |
| A6 | Fascia **Non identificabile** resta tracciata con motivo (catalogo, mandato, titolo, episodio, …) | ☐ | ☐ | ☐ | |
| A7 | La regola “larga” Netflix (match a livello serie se episodio non allineato) resta **solo** come Probabile/`episodio_mancante`, non come Certo | ☐ | ☐ | ☐ | |

**Decisione sintetica A:** _________________________________  
**Owner:** _________________ **Data:** ________

---

## B. Banca dati / catalogo (prerequisito al matcher)

| # | Decisione | Sì | No | Rimandato | Note |
|---|---|---|---|---|---|
| B1 | Priorità recupero lacune migrazione confermate: LASARDO, BROWNING, PARÈ, SEAGAL | ☐ | ☐ | ☐ | |
| B2 | CURRIE GRAHAM: cliente fornisce grafia/alias entro ____ | ☐ | ☐ | ☐ | |
| B3 | Delta tipo DE STEPHANIS / CASTELNUOVO: **non** reimportare senza checklist titolo-per-titolo del cliente | ☐ | ☐ | ☐ | |
| B4 | Dopo recupero catalogo, Supabase è source of truth operativo | ☐ | ☐ | ☐ | |
| B5 | Noco resta in sola lettura / archivio dopo il recupero (o altra policy: ____) | ☐ | ☐ | ☐ | |
| B6 | Arricchire catalogo episodi con numerazione continua / alias titolo episodio dove serve alle soap/VOD | ☐ | ☐ | ☐ | |
| B7 | Se manca partecipazione/episodio in catalogo, l’esito è “catalogo incompleto”, non “fallimento matching” | ☐ | ☐ | ☐ | |

**Decisione sintetica B:** _________________________________  
**Owner catalogo:** _________________ **Owner dati cliente:** _________________

---

## C. Regole per tipo opera (precision vs recall)

### C1 — Film

| # | Decisione | Sì | No | Rimandato | Note |
|---|---|---|---|---|---|
| C1.1 | Candidati opera in cascata: ID/ISAN → alias emittente → `match_key_strict` → `match_key_loose` + originale → fuzzy | ☐ | ☐ | ☐ | |
| C1.2 | Sequel: chiave **strict** obbligatoria prima della loose | ☐ | ☐ | ☐ | |
| C1.3 | Film **senza anno e senza regia** → mai Certo (max Probabile/Ambiguo) | ☐ | ☐ | ☐ | |
| C1.4 | Due o più opere sopra soglia → Ambiguo, nessuna auto-scelta | ☐ | ☐ | ☐ | |
| C1.5 | Omonimi con anno+regia coerenti → possono essere Certo | ☐ | ☐ | ☐ | |

### C2 — Serie TV / episodi

| # | Decisione | Sì | No | Rimandato | Note |
|---|---|---|---|---|---|
| C2.1 | Strategie episodio in ordine: S+E esatto → numerazione continua mappata → solo ep/titolo ep → livello serie → non identificabile | ☐ | ☐ | ☐ | |
| C2.2 | S+E esatto (e mappa continua confermata) → possono essere Certo | ☐ | ☐ | ☐ | |
| C2.3 | Solo titolo episodio / ep-only debole → Probabile, non Certo | ☐ | ☐ | ☐ | |
| C2.4 | Match solo a livello serie (`episodio_mancante`) → Probabile + revisione, cast distinto, punteggio ridotto | ☐ | ☐ | ☐ | |
| C2.5 | Non tornare allo scarto duro “episodio obbligatorio o zero” (comportamento pre-Netflix) | ☐ | ☐ | ☐ | |

**Decisione sintetica C:** _________________________________

---

## D. Profili emittente e import

| # | Decisione | Sì | No | Rimandato | Note |
|---|---|---|---|---|---|
| D1 | Ogni emittente ha un profilo configurabile (numerazione, titoli, campi affidabili) | ☐ | ☐ | ☐ | |
| D2 | All’import si arricchiscono stagione/episodio derivati **senza** cancellare il grezzo | ☐ | ☐ | ☐ | |
| D3 | Priorità profili da definire subito: Netflix, SKY, almeno 1 soap (es. Un posto al sole), 1 generalista | ☐ | ☐ | ☐ | Emittenti: ____ |
| D4 | Onboarding nuovo emittente = configurazione profilo, non patch al matcher | ☐ | ☐ | ☐ | |
| D5 | Mandato artista sull’anno competenza resta gate obbligatorio (override solo esplicito per run) | ☐ | ☐ | ☐ | |

**Decisione sintetica D:** _________________________________  
**Owner profili emittente:** _________________

---

## E. Revisione, learning e operatività

| # | Decisione | Sì | No | Rimandato | Note |
|---|---|---|---|---|---|
| E1 | Correzioni in revisione possono diventare alias/regole (learning controllato) | ☐ | ☐ | ☐ | |
| E2 | Alias con `hit_count` / confidence: solo dopo conferma umana (non auto-promozione cieca) | ☐ | ☐ | ☐ | |
| E3 | Campagne già `completata` non si riscrivono da sole: rielaborazione solo su decisione esplicita | ☐ | ☐ | ☐ | |
| E4 | Dopo fix catalogo o matcher, si pianifica re-run mirato (emittente/anno) | ☐ | ☐ | ☐ | |
| E5 | Dedup resta `(programmazione, artista, ruolo)` — un passaggio = un utilizzo per ruolo | ☐ | ☐ | ☐ | |
| E6 | Diagnostica per emittente/serie (tasso Certo/Probabile/Ambiguo/Non id.) è requisito di rilascio | ☐ | ☐ | ☐ | |

**Decisione sintetica E:** _________________________________

---

## F. Criteri di accettazione (golden set)

Definire **prima** dell’implementazione cosa deve migliorare e cosa non deve peggiorare.

| # | Corpus / metrica | Target proposto | Accettato? | Note |
|---|---|---|---|---|
| F1 | Netflix 2025 (campagna che ha motivato la regola larga) | ↑ recall vs baseline pre-fix; Certo solo con episodio affidabile | ☐ Sì ☐ No ☐ Rim. | |
| F2 | SKY (gap A/D già documentato) | chiudere miss di tipo titolo loose / ep-only senza ↑ false film | ☐ Sì ☐ No ☐ Rim. | |
| F3 | Soap numerazione continua (es. Un posto al sole) | da ~12% verso target concordato: ____ % | ☐ Sì ☐ No ☐ Rim. | |
| F4 | Corpus film omonimi / sequel | precision Certo ≥ ____ %; zero auto-scelta su Ambiguo | ☐ Sì ☐ No ☐ Rim. | |
| F5 | False positive film su campione revisionato | non peggiorare vs baseline; soglia max ____ | ☐ Sì ☐ No ☐ Rim. | |
| F6 | Ogni riga golden set ha esito in una delle 4 fasce (0 scarti silenziosi) | 100% | ☐ Sì ☐ No ☐ Rim. | |

**Baseline da congelare entro:** ________  
**Owner misurazione:** _________________

---

## G. Ordine di lavoro post-riunione (solo se A–F firmate)

Barrare l’ordine approvato (consigliato):

| Ordine | Lavoro | Approvato |
|---|---|---|
| 1 | Recupero catalogo (B1–B3) + congelamento baseline F | ☐ |
| 2 | Modello esiti / fasce in prodotto (A) anche se UI parziale già esiste | ☐ |
| 3 | Profili emittente + traduzione episodio all’import (D) — massimo ROI recall serie | ☐ |
| 4 | Cascade strict/loose + gate film senza discriminanti (C1) — massimo ROI anti false match | ☐ |
| 5 | Strategie episodio multipla + mappe continue (C2) | ☐ |
| 6 | Learning da revisione + diagnostica (E) | ☐ |
| 7 | Re-run campagne concordate | ☐ |

**Fuori scope esplicito di questa checklist:** implementazione codice, migration SQL, redesign UI completo.

---

## Domande bloccanti (se senza risposta → Rimandato automatico)

1. Quali emittenti hanno priorità assoluta nei prossimi cicli? _________________
2. Target % individuazione accettabile su soap continua? _________________
3. Chi valida i titoli “pulizia vs lacuna” sul repertorio post-migrazione? _________________
4. Si accetta che Probabile livello serie conti ai fini ripartizione, o solo dopo conferma umana? _________________
5. Budget di revisione umana sostenibile (ore/settimana o % Probabile+Ambiguo)? _________________

---

## Verbale di chiusura

| Campo | Valore |
|---|---|
| Data riunione | |
| Partecipanti | |
| Decisioni Sì vincolanti (elenco ID) | |
| Decisioni No / Rimandato (elenco ID + owner) | |
| Prossimo checkpoint | |
| Autorizzazione ad aprire lavoro di implementazione | ☐ Sì ☐ No |

**Firme / conferma:**

- Cliente / prodotto: _________________ data ________  
- Tecnico / matching: _________________ data ________  
- Dati / catalogo: _________________ data ________  

---

## Riferimenti interni

- `docs/Report_Verifica_Migrazione_Database_2026-06-10.md` — Noco vs Supabase  
- `docs/Individuazioni_Criticita_e_Piano_Cliente.md` — piano a 5 interventi  
- `docs/superpowers/plans/2026-08-03-matcher-sky-gap-rerun.md` — gap SKY  
- Migration `20260608120200_matcher_series_level_review.sql` — regola larga episodi (Netflix 2025)  
- `docs/LOGICA_INDIVIDUAZIONI.md` — baseline storica scoring (parzialmente superata dal live matcher)
