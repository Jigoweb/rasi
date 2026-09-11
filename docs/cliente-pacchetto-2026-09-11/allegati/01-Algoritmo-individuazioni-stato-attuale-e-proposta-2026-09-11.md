# Algoritmo di individuazione — stato attuale e proposta

**Data:** 11 settembre 2026  
**Destinatari:** incontro in sede (RASI)  
**Ambito:** come il programma collega una riga di palinsesto al catalogo e genera le individuazioni.

Questo documento descrive il comportamento **effettivo** del programma oggi. Sostituisce, per l’uso operativo e per il cliente, la documentazione storica che diceva ancora «se l’episodio non è in catalogo, scarta» e «tolleranza anno ±2». Quelle regole **non** sono più quelle in produzione.

---

## 1. Cosa fa l’individuazione

Ogni riga di palinsesto (una trasmissione) viene confrontata con il catalogo RASI:

1. si cerca l’**opera** (film o serie) il cui titolo è abbastanza simile;
2. se è una serie, si cerca l’**episodio**;
3. si prendono gli **artisti** collegati a quell’opera/episodio (con il ruolo);
4. si crea una **individuazione** per ciascun artista trovato.

Sulla riga di individuazione il programma copia titolo, data, stagione ed episodio **dal palinsesto**, non dal catalogo matchato. Per questo in elenco può comparire «FRINGE St. 1 Ep. 2» anche se in catalogo è stato usato St. 2 Ep. 2.

Le campagne già chiuse **non si riscrivono da sole**. Dopo un cambio di regola serve una nuova corsa di individuazione.

---

## 2. Film o serie

Il palinsesto è trattato come **serie** se è valorizzato almeno uno tra: numero stagione, numero episodio, titolo episodio, titolo episodio originale.

Se quei campi sono vuoti ma il titolo contiene indicazioni tipo `S01E02` o `Ep. 12`, il programma può **derivare** stagione/episodio dal testo, senza modificare il palinsesto salvato.

Tutto il resto è trattato come **film**.

---

## 3. Come si sceglie l’opera (il titolo)

Prima del confronto il titolo viene pulito:

- si tolgono suffissi tipo `: Season`, `Parte`, `Part`, `Volume`, `Stagione`;
- si toglie un numero o un romano finale (`Vikings 5` → `vikings`), così il palinsesto e il catalogo parlano della stessa serie.

Poi si calcola la **similarità** (trigram, ignorando maiuscole) tra il palinsesto e, in catalogo:

- titolo,
- titolo originale,
- eventuali alias.

**Soglia di ingresso: 70%.** Sotto questa soglia l’opera non entra in gioco. I tre esempi Sky (FRINGE, HAWAII FIVE-0, YELLOWSTONE) **superano** questa soglia: il titolo è corretto. L’errore sta dopo, sull’episodio.

Se palinsesto e catalogo hanno entrambi un titolo originale, c’è un bonus fino a 10 punti.

---

## 4. Anno e regia (discriminanti, non scarti duri)

### Anno

Si confronta l’anno di rilascio del palinsesto con l’anno (o l’intervallo) del catalogo.

| Distanza | Punti anno (peso pieno 15) |
|---|---|
| Stesso anno o intervalli che si sovrappongono | 15 |
| Fino a **3 anni** | circa 10,5 |
| Da 4 a **5 anni** | circa 4,5 |
| Oltre 5 anni | **0 punti** — il match **non viene scartato** solo per l’anno |

Su una serie, se l’episodio è già stato abbinato, il peso dell’anno si riduce (5 oppure 10), perché la stagione/episodio pesa di più.

Se l’anno di rilascio non aiuta, si prova in modo debole l’anno di produzione (metà punteggio).

**Non** è in vigore la vecchia regola «oltre ±2 anni = penalità pesante e fuori». Per questo due film con titolo quasi identico e anni diversi (Manuale d’Amore 2005 vs 2011) **possono entrambi superare** la soglia: l’anno da solo non li separa abbastanza.

### Regia

Se palinsesto e catalogo hanno entrambi la regia:

| Similarità | Effetto |
|---|---|
| ≥ 70% | +10 punti |
| ≥ 40% | +5 punti |
| sotto 40% | **−15 punti** |
| uno dei due manca | 0 (neutro) |

---

## 5. Serie: come si sceglie l’episodio (punto critico)

Ordine attuale, **dopo** che il titolo dell’opera ha superato il 70%:

1. **Stagione + episodio esatti** nel catalogo. Punteggio episodio pieno (15 punti).
2. Se quello non c’è: **stesso numero di episodio in un’altra stagione** (anche se la stagione del palinsesto è valorizzata). Punteggio ridotto (circa 11–12 punti).
3. Se ancora niente: similarità ≥ 60% sul **titolo dell’episodio**.
4. Se nessun episodio catalogo coincide: **non si scarta**. Si attribuisce il **cast distinto di tutta la serie**, il punteggio viene ridotto dell’20%, lo stato passa a **dubbioso** (da revisionare).
5. Anche quando un episodio è stato trovato, si aggiungono comunque le partecipazioni registrate **sulla serie senza episodio** (cast a livello opera).

Il punto 2 è la causa diretta di FRINGE, HAWAII FIVE-0 e YELLOWSTONE. Il punto 4 allarga ancora: se manca proprio quell’episodio, finiscono in lista artisti di altri episodi.

| Palinsesto | Catalogo | Cosa fa il programma oggi |
|---|---|---|
| FRINGE St. 1 Ep. 2 (e analoghi) | solo St. 2 Ep. 2 | usa l’unico Ep. 2 disponibile (altra stagione) |
| HAWAII FIVE-0 St. 2 Ep. 10 | St. 2 ha 3/4/5/23; esiste St. 5 Ep. 10 | aggancia St. 5 Ep. 10 |
| YELLOWSTONE St. 3 Ep. 3 | St. 3 ha 1/2/4; Thermes è in St. 4–5 | aggancia l’Ep. 3 di un’altra stagione (Thermes) |

Non è un errore di similarità del titolo. È una regola volutamente permissiva, introdotta per recuperare palinsesti con numerazione incompleta. Sui palinsesti Sky, dove stagione ed episodio **ci sono**, produce diritti inesistenti.

---

## 6. Punteggio finale e soglia

Somma tipica (massimo teorico 100 se tutti i pezzi ci sono):

| Pezzo | Peso |
|---|---|
| Titolo | fino a 50 |
| Titolo originale | fino a 10 |
| Anno | fino a 15 (meno sulle serie se l’episodio è certo) |
| Regia | da −15 a +10 |
| Episodio | fino a 15 |

La soglia di accettazione **non è fissa a 35**. È il **35% del peso massimo dei pezzi effettivamente disponibili**, con un minimo di 25 punti.

Esempio: se c’è solo il titolo, bastano 25 punti (un titolo al 70% fa 35 e passa). Se ci sono titolo, anno, regia ed episodio, la soglia sale verso 35.

I match «episodio mancante / cast di serie» vengono accettati sulla soglia piena e poi scritti con punteggio × 0,8 e stato dubbioso.

---

## 7. Cosa propone RASI (da approvare in incontro)

**Precisione prima del richiamo**, quando stagione ed episodio del palinsesto sono noti.

| Situazione | Oggi | Proposta |
|---|---|---|
| Stagione + episodio presenti in catalogo | individua | individua (invariato) |
| Stagione + episodio noti, **non** in catalogo | usa un altro episodio con lo stesso numero, oppure il cast di tutta la serie | **nessuna individuazione automatica**; solo avviso «episodio non censito» |
| Stagione assente, numero episodio unico in catalogo | ep-only | ep-only consentito |
| Stagione assente, stesso numero su più stagioni | ep-only sul primo trovato | nessuna individuazione automatica |
| Cast di altri episodi su un passaggio specifico | sì | no |

Effetto atteso sui tre titoli Sky: spariscono i falsi positivi segnalati. Calano le individuazioni automatiche su episodi che **non sono in repertorio**: è voluto (oggi quelle righe sono diritti inesistenti).

Questa proposta riguarda i palinsesti **con stagione ed episodio noti** (Sky e analoghi). Il caso diverso — palinsesto con sola numerazione continua, senza stagione, es. *Un posto al sole* — resta un problema di traduzione della numerazione, non si risolve con la stessa leva e non è oggetto di questa nota.

Le campagne Sky già chiuse restano com’erano finché non si rilanciano.

---

## 8. Film omonimi (Manuale d’Amore)

Il matcher **non** accorpa i due film in un solo record: in catalogo esistono sia *Manuale d’Amore* (2005) sia *Manuale D’Am3re* (2011).

Quello che succede:

- i titoli sono abbastanza simili da superare il 70%;
- l’anno (2005 vs 2011 = 6 anni) non scarta il match;
- Danilo Mattei nel catalogo attuale è collegato **anche al 2005**, mentre in Noco è solo sul 2011.

Rakuten può quindi individuarlo sul film 2005. Non è «tolleranza anni del titolo»: è un’**associazione artista sbagliata** nel catalogo, più un anno che non taglia abbastanza. Si corregge togliendo Mattei dal 2005 (e reimportando *Il mio West* 1998, assente).

---

## 9. In una frase

Oggi, se manca l’episodio esatto, il programma **inventa un collegamento** (altro episodio o cast di serie). La proposta è: se stagione ed episodio sono noti e non sono in catalogo, **non individuare**, e segnalare il buco di repertorio.
