# Reaudit imprecisioni report SKY 2015–2019

**Data verifica:** 11 agosto 2026  
**Fonte classificazione originale:** `scripts/diagnostics/fixtures/sky_gap_classified.json`  
**Confronto:** catalogo live Supabase

---

## Verdetto

Sì: ci sono **imprecisioni materiali** nella classificazione usata nei report/mail.  
I numeri di coverage (14,4% → 16,4%) restano validi; a cambiare è **perché** certi casi risultano omessi.

---

## Errori confermati

### 1. Shannara / REMAR — errore grave (come segnalato)

| | Valore |
|---|---|
| Classificazione report | **B cast assente** (~1.314 righe) |
| Realtà | Cast **presente** su opera `SHANNARA` (7 part. REMAR) |
| Bug classificazione | `opera_id` della fixture puntava a **`I GIORNI DEL PADRINO`** (*The Gangster Chronicles*), non a Shannara |
| Nome | `WILLIAM JAMES REMAR` = `REMAR WILLIAM JAMES` (stesso artista) |
| Blocco reale oggi | **Mandato dal 2023-02-23** (non overlap 2015–2019) → non persistito in campagna |

**Correzione:** B → **D / mandato** (non cast assente).

### 2. Altri cast presenti ma classificati come gap tecnico/catalogo

Cast oggi presente, quindi non sono “cast assente”:

| Titolo | Artista | Classif. vecchia | Realtà |
|---|---|---|---|
| DEXTER (varie stagioni) | REMAR | A episodio | cast ok; blocco mandato (+ possibile ep) |
| CITY ON A HILL | REMAR | A | cast ok; mandato |
| VIKINGS | SINGH | A | cast ok; mandato (2021) |
| I SOPRANO | CASTELLUCCIO | A | cast ok; mandato (2021) |
| MOTHERS AND DAUGHTERS | BACKUS / SORVINO | D (ok come non persistito) | cast ok; mandato 2023 — classif. D corretta nel merito |
| SPONGEBOB | ZUCCA | D | cast ok |
| BLADE:TRINITY / DUPLEX / DJANGO | REMAR | D | cast ok; mandato |
| QUANTO BASTA | SPANG | D | cast ok; mandato 2021 |
| BEVERLY HILLS COP | GUILFOYLE | (parziale) | **GUILFOYLE in cast**; BORKAN no |

Su A (Dexter/Vikings/Sopranos) la label “solo problema episodio” è **incompleta**: anche con fix episodio, senza mandato non escono in campagna.

### 3. `opera_id` fixture sbagliati (non solo Shannara)

| Titolo nel report | `opera_id` collegato | Titolo reale in DB |
|---|---|---|
| THE SHANNARA CHRONICLES 1 | 09688c9a-… | **I GIORNI DEL PADRINO** |
| LA PANTERA ROSA 2 | 95dc247d-… | **LA STANZA ROSSA** |
| BLOOD RED | 8561109b-… | **BLOOD RUN** |
| MIA MADRE | 97d9d140-… | **UNA MADRE** |

Quindi alcuni “cast assente” erano valutati sull’**opera sbagliata**.

### 4. `artista_assente` falsi o mal parsati

| Nel report | Realtà |
|---|---|
| MONITILLO RICCARDO MONITILLO ROCCO RICCARDO = assente | Esiste **MONITILLO ROCCO RICCARDO** (mandato 2018) — nome cella duplicato/mal split |
| BRADLEY HAROLD BRADLEY JR HAROLD WILLARD = assente | Esiste **BRADLEY JR. HAROLD WILLARD** |
| CHRISMA / KRISMA / NEW DADA = artisti assenti | Frammenti di alias da cella `ARCIERI…/NEW DADA, MAURIZIO, CHRISMA, KRISMA` — **non anagrafiche separate** |
| PARE / GIUFFRE “mancanti” in check cognome esatto | In DB sono **PARÉ** / **GIUFFRÈ** (accento) — artisti presenti |

### 5. Casi C (`opera_assente`) ancora plausibili

Restano fuori catalogo (o senza match affidabile), es.:

- Rio (nessuna opera `Rio` esatta)
- Una Notte In Giallo
- Walk of Shame, Tre Uomini E Una Gamba, Lezioni di Cioccolato, Cose Da Pazzi, Commediasexi, …

S.W.A.T. esiste come opera ma **senza DAVITIAN** in cast → più “cast/opera non allineata” che semplice assenza titolo.

### 6. B ancora plausibili (cast davvero vuoto / artista non nel cast)

Esempi ancora validi come gap dati:

- MA TU DI CHE SEGNO 6? / AUTUORO — 0 partecipazioni
- SWEETWATER / YOUNGS — 0 part.
- PARKER / ZUCCA — opera senza ZUCCA
- FANTOZZI 2000 / OLMI — 0 part.
- SUSPIRIA / FERRARA — 0 part.
- BAD COMPANY / YOUNGS — cast c’è ma è ROBERTS, non YOUNGS

---

## Impatto sui messaggi già dati

| Affermazione precedente | Stato |
|---|---|
| Coverage 14,4% → 16,4% | **OK** |
| 485 coppie omesse | **OK** (come assenti in output) |
| Shannara = cast assente ~1.314 righe | **SBAGLIATO** → mandato / non persistito |
| Gap A = solo tecnico episodio | **PARZIALE** → spesso anche mandato |
| SINGH/BACKUS/SORVINO bloccati da mandato | **OK** |
| Lista omessi come “mancano in piattaforma” | **OK**; motivazioni bucket da rivedere |

Ordine di grandezza correzioni di *motivo*: ~**3.500+ righe** riprogrammate da B/C “dati” verso “cast ok ma non in campagna (mandato/persistenza)”.

---

## Cosa aggiornare

1. Report/mail: Shannara/REMAR non è più “cast assente”.  
2. Per Dexter/Vikings/Sopranos/REMAR/SINGH/CASTELLUCCIO: priorità decisione **mandato/override**, non solo enrich cast.  
3. Rigenerare classificazione da catalogo live (non riusare `opera_id` della fixture storica senza riconciliare il titolo).
