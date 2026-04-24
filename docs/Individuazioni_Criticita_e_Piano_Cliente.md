# Individuazioni: criticità rilevata e piano di risoluzione

> Spiegazione non tecnica del problema segnalato, delle sue cause e degli interventi previsti.

---

## 1. In breve

Quando un palinsesto contiene più passaggi (utilizzi) della stessa opera, il sistema oggi riesce a identificare solo una parte di questi passaggi. Le altre trasmissioni, pur essendo presenti, non vengono collegate al catalogo e quindi non generano individuazioni.

Il problema **non è una perdita di dati**: le righe di palinsesto restano in archivio. Manca invece il **collegamento automatico** tra la riga del palinsesto e l'opera/episodio corrispondente nel catalogo.

> ⚠️ **Impatto:** sottostima del numero di passaggi individuati per serie TV e per alcune opere, con ricadute su reportistica e ripartizioni.

---

## 2. Cosa significa "individuare un passaggio"

Ogni riga del palinsesto dell'emittente descrive una trasmissione: titolo, data, ora, eventuale stagione e numero di episodio. Il nostro sistema deve capire **quale opera** del catalogo corrisponde a quella trasmissione e, nel caso di serie TV, **quale episodio** è andato effettivamente in onda. Solo a quel punto è possibile associare gli artisti coinvolti e generare le individuazioni utili per le ripartizioni.

---

## 3. Dove nasce il problema

La falla non è nel codice del sistema, ma in una **differenza di linguaggio** tra il palinsesto dell'emittente e il catalogo interno. I due parlano degli stessi contenuti in modo diverso, e il sistema non ha tutti gli strumenti per tradurre.

### I tre punti critici

| # | Punto critico | Effetto pratico |
|---|---|---|
| 1 | **Numerazione episodi diversa** | L'emittente numera gli episodi in modo continuo (1, 2, 3… fino a migliaia). Il catalogo li numera invece dentro ogni stagione (S1E1, S1E2…). I due riferimenti non combaciano. |
| 2 | **Informazioni parziali dal palinsesto** | In molte righe manca la stagione: il sistema vede solo un numero episodio e non sa a quale stagione riferirlo. |
| 3 | **Regola attuale troppo rigida** | Quando il collegamento all'episodio non è certo, la regola attuale scarta silenziosamente il passaggio. L'utilizzo non viene individuato e non resta traccia del motivo. |

---

## 4. Un esempio concreto

Prendiamo una serie molto frequente nei palinsesti: **Un posto al sole**.

| Dato | Valore osservato |
|---|---|
| Passaggi totali nel palinsesto (campagna più recente) | 23.645 |
| Passaggi con solo numero episodio, senza stagione | 23.230 (circa il 98%) |
| Numeri di episodio usati dall'emittente | da 1 a 6.601 |
| Numeri di episodio presenti nel catalogo | da 1 a 487 (ripartiti in 5 stagioni) |
| Passaggi effettivamente individuati | **2.783 (circa il 12%)** |

> 💡 **Traduzione in parole semplici:** l'emittente dice "episodio 3.214", ma nel catalogo non esiste un episodio 3.214, perché la numerazione si ferma a 487 ed è divisa per stagioni. Senza una tabella di traduzione, il sistema non riesce ad abbinare quel passaggio.

---

## 5. È un errore di programmazione?

No. Il software funziona esattamente come è stato progettato. Il limite è nelle **regole di matching** (cioè le regole che decidono quando un passaggio corrisponde a un'opera). Queste regole erano pensate per un caso semplice (un emittente, una convenzione) e non gestiscono in modo elastico le differenze tra palinsesti diversi.

È più corretto parlare quindi di **falla logica**: la struttura regge, ma le regole sono troppo strette per la varietà dei dati reali.

---

## 6. Come intendiamo risolverlo

L'obiettivo è rendere il sistema **tollerante alle differenze** tra emittenti, senza dover riscrivere ogni volta le regole. Il piano è organizzato in cinque interventi progressivi, ciascuno indipendente e verificabile.

| # | Intervento | Cosa cambia in pratica | Beneficio atteso |
|---|---|---|---|
| 1 | **Profilo dell'emittente** | Per ogni emittente registriamo "le sue abitudini": come numera gli episodi, come scrive i titoli, quali campi usa. Sono regole modificabili dall'amministratore, senza toccare il codice. | Onboarding di un nuovo emittente diventa una configurazione, non uno sviluppo. |
| 2 | **Traduzione automatica** | Al momento dell'import, il palinsesto viene arricchito con i campi mancanti ricavati dalle regole del profilo (es. "episodio 500 equivale a Stagione 2, Episodio 250"). | Il palinsesto parla finalmente la stessa lingua del catalogo. |
| 3 | **Catalogo episodi più ricco** | Arricchiamo il catalogo con informazioni utili al matching: numerazione continua di riferimento, titoli alternativi, varianti linguistiche. | Il sistema ha più appigli per riconoscere lo stesso episodio in palinsesti diversi. |
| 4 | **Matching a più strategie** | Invece di una sola regola, il sistema prova in sequenza più criteri (stagione+episodio, numerazione continua, titolo episodio, titoli alternativi) e classifica ogni risultato come certo, probabile o ambiguo. | Più passaggi individuati e, soprattutto, nessuno più scartato silenziosamente. |
| 5 | **Diagnostica e revisione** | Nuova area nella dashboard che mostra qualità del matching per emittente e per serie, con strumenti per correggere in blocco i casi ambigui. Le correzioni umane diventano nuove regole automatiche. | Il sistema migliora nel tempo e il cliente vede dove stanno i margini di recupero. |

---

## 7. Risultato atteso

- ✅ **Nessun passaggio sparisce in silenzio.** Ogni riga del palinsesto genera un esito esplicito: individuato, ambiguo o non identificabile.
- ✅ **Percentuale di individuazione molto più alta** su serie con molti passaggi (stima per "Un posto al sole": dal ~12% attuale a oltre l'80% atteso).
- ✅ **Onboarding di nuovi emittenti in giornate, non settimane.** Basta compilare il profilo.
- ✅ **Visibilità sulla qualità del dato** con report per emittente e per serie.
- ✅ **Miglioramento continuo:** le correzioni manuali consolidano regole automatiche e riducono nel tempo i casi ambigui.

---

## 8. Tempistiche indicative

| Fase | Attività | Tempistica |
|---|---|---|
| A | Profili emittente + traduzione automatica (interventi 1 e 2) | Prima release utile |
| B | Catalogo arricchito + matching multi-strategia (interventi 3 e 4) | Release successiva |
| C | Dashboard diagnostica e revisione assistita (intervento 5) | Rilascio incrementale |

> Le tempistiche puntuali verranno concordate in base alle priorità e alla disponibilità di dati di riferimento da parte degli emittenti (es. conferma delle convenzioni di numerazione).

---

## 9. Garanzie operative

- 🔒 **Nessun dato storico viene perso.** Il dato grezzo del palinsesto resta sempre intatto.
- 🔄 **Retrocompatibilità.** Le campagne già elaborate non vengono alterate; eventuale rielaborazione è una scelta esplicita.
- 🧪 **Verifica prima del rilascio.** Ogni fase viene misurata su campagne reali e confrontata con il comportamento attuale.
- ↩️ **Possibilità di rollback.** Le nuove regole possono essere attivate/disattivate senza impatti.

---

*Per qualsiasi chiarimento o approfondimento, il team tecnico è a disposizione per una sessione dedicata.*
