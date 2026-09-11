# Bozza mail da inviare (non mettere nello zip)

**Da:** Matteo  
**A:** Pasquale  
**Oggetto:** Individuazioni Sky / integrità banca dati — analisi, documenti e incontro

---

Buongiorno Pasquale,

abbiamo chiuso l’analisi sugli esempi che ci avete inviato (FRINGE, HAWAII FIVE-0, YELLOWSTONE, Manuale d’Amore) e sul confronto tra la Banca dati Rasi su Noco e il catalogo attuale. In allegato uno zip con tre documenti: come funziona oggi l’algoritmo di individuazione, la nota di analisi, e l’elenco per artista del repertorio Noco che manca nel sistema.

Sono **due problemi distinti**.

Sui tre titoli Sky il repertorio Noco e quello attuale coincidono con quanto indicate: FRINGE solo St. 2 Ep. 2; HAWAII FIVE-0 stagione 2 solo episodi 3, 4, 5 e 23; YELLOWSTONE stagione 3 solo 1, 2 e 4 con Michael Nouri, Thermes dalle stagioni 4 e 5. Le individuazioni errate non dipendono dalla similarità del titolo (il titolo è corretto) e non si sistemano «rimettendo Noco». Dipendono da una regola del programma che, se manca l’episodio esatto, usa lo stesso numero di un’altra stagione oppure il cast di tutta la serie. In elenco restano i numeri del palinsesto, quindi sembra che il catalogo abbia episodi che in realtà non ci sono.

Proponiamo di spegnere questa regola: se stagione e episodio sono noti e non sono in catalogo, nessuna individuazione automatica, solo avviso «episodio non censito». I diritti inesistenti spariscono; calano le individuazioni automatiche su ciò che non è in repertorio, ed è voluto. In incontro vi chiediamo di confermare questa scelta prima di applicarla. Le campagne già chiuse non si riscrivono da sole: dopo il cambio va rilanciata l’individuazione.

Sul catalogo l’anagrafica artisti è allineata (750 in Noco, 769 oggi: i 22 in più sono inserimenti successivi, da tenere). Il buco è nel repertorio: **2.676** collegamenti artista–opera presenti in Noco non sono nel sistema attuale, il 9,6% (LASARDO 193 su 193, GRAHAM CURRIE 30 su 30, BROWNING 105, PARÈ 107, Thermes Vittorio 58, e altri: dettaglio nel CSV). Il «Currie Graham» di giugno in Noco è GRAHAM CURRIE JT, cognome Graham: per questo non compariva in anagrafica.

Il lavoro fatto dopo il trasferimento si può conservare: oltre 3.200 collegamenti e 22 artisti nati con AGCOM. Non si può quindi ripristinare Noco cancellando il resto, e non si può lasciare il catalogo così com’è. La via che vi proponiamo è un ripristino automatico solo di ciò che è in Noco e manca oggi, tenendo tutto ciò che è stato aggiunto dopo, e una coda di revisione solo sui conflitti veri — non sulle 20.000 righe.

Su Manuale d’Amore: in Noco Mattei è solo sul 2011; nel sistema attuale i due film ci sono entrambi, ma Mattei risulta anche sul 2005. Quella associazione va tolta. Manca inoltre Il mio West (1998).

In sede vi chiediamo di chiudere tre decisioni: (1) nuova regola di matching per le serie; (2) ripristino selettivo del repertorio Noco senza toccare AGCOM; (3) ordine di lavoro (matcher prima, poi correzioni puntuali e ripristino, poi rilancio campagne).

Restiamo a disposizione per fissare la data in sede.

Un saluto,  
Matteo

---

**Allegare solo lo zip** `RASI-incontro-catalogo-matching-2026-09-11.zip`.  
Non allegare questa bozza. Non promettere un diff riga-per-riga datato: non esiste. Non chiedere al cliente di rivedere il catalogo a mano. Non allegare `LOGICA_INDIVIDUAZIONI.md` né il PDF storico sulle criticità individuazioni (descrivono un matcher che non è più quello in produzione).
