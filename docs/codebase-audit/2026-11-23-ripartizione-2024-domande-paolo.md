# Ripartizioni 2024: verifica degli Excel e domande per Paolo

Data: 23 novembre 2026.

**Fonti**
- Scheda tecnica del regolamento di ripartizione video (assemblea del 29/04/2024, versione inviata il 22/10/2026).
- I 16 Excel 2024 inviati da Paolo tra il 22/10 e il 16/11/2026: Rai generaliste e tematiche, RaiPlay, Apple TV SVOD e TVOD, Disney+, Netflix, Paramount+, Timvision, WB Discovery, Viacom, Tv2000 e i quattro file Amazon.

**Metodo:** su ogni file ho letto sia le formule sia i valori. Non ho modificato nessun file.

## In breve

- **La scheda tecnica è chiara, e gli Excel la seguono quasi sempre.** Abbiamo ricostruito passo per passo le quattro modalità di calcolo:
  - canali lineari;
  - on demand con visualizzazioni;
  - on demand con ricavi;
  - on demand senza dati (Amazon).
- In piattaforma il calcolo userà **valori esatti**, senza i numeri intermedi troncati a mano. Così il totale chiude sul fondo al centesimo. Per ogni Excel prepareremo un confronto per artista con la spiegazione delle differenze.
- **Due file vanno ricontrollati prima di pagare:**
  - Amazon Channels supera il fondo di 1.732 €;
  - Amazon SVOD Standalone usa un moltiplicatore sbagliato.
- **Alcuni punti la scheda non li chiarisce,** e gli Excel li risolvono in modi diversi tra loro. Per questi servono le vostre indicazioni (domande in fondo). Fino alla risposta la piattaforma li tratta come impostazioni modificabili.

## Come abbiamo letto le regole

**Comune a tutti i file**
- Una riga corrisponde a un'utilizzazione: opera o episodio, artista e ruolo. Per i lineari conta ogni messa in onda.
- 1ª ripartizione: quota opera ÷ 11 × 5,51 (primari), 2,49 (comprimari), 1,8 (doppiatori primari e direzione), 1,2 (doppiatori comprimari).
- Moltiplicatori della 2ª ripartizione: 3,5 / 1,1 / 0,4 / 0,2.

**Canali lineari**
- Quota opera:
  - 73% del fondo diviso tutte le utilizzazioni;
  - 10% diviso le utilizzazioni dei canali generalisti;
  - 9% diviso le opere oltre i 60 minuti;
  - 8% diviso le opere che iniziano tra le 19:00 e le 23:30.
- Senza canali generalisti (Viacom, Tv2000), il 10% si somma al 73% e diventa 83%.
- 2ª ripartizione: (fondo − totale 1ª) ÷ numero di utilizzazioni × moltiplicatore.
- Infine, ricalcolo proporzionale fino al fondo.

**On demand**
- Quota opera, a seconda dei dati disponibili:
  - con visualizzazioni: visualizzazioni × fondo ÷ totale visualizzazioni;
  - con ricavi: ricavi × fondo ÷ totale ricavi;
  - senza dati: fondo ÷ numero di utilizzazioni.
- 2ª ripartizione: importo della 1ª × moltiplicatore.
- Il resto, cioè fondo − (1ª + 2ª), si divide per il numero di utilizzazioni e si aggiunge a ogni riga.
- Gli importi sotto 1,50 € vengono portati al più piccolo importo già pari o superiore a 1,50 €. È così che leggiamo «al primo importo più alto di 1,50 euro».
- Infine, riduzione proporzionale fino al fondo.

## Incoerenze trovate negli Excel

| # | File | Cosa abbiamo trovato | Effetto |
|---|---|---|---|
| 1 | Amazon Channels | Le colonne finali «Fondi a» riportano gli importi **prima** della riduzione proporzionale (86,91%). La colonna della riduzione è corretta, ma non è stata copiata nelle colonne finali | Totale da liquidare 13.232,21 € su un fondo di 11.500 € (+1.732 €) |
| 2 | Amazon SVOD Standalone | Nella 2ª ripartizione i doppiatori primari e la direzione sono moltiplicati per **1,8** invece che per 0,4 (1.117 righe) | Circa 630 € spostati verso doppiatori primari e direzione, a scapito degli altri ruoli |
| 3 | Netflix | In molte righe di doppiatori primari la formula della 1ª ripartizione legge la quota opera della **riga precedente**. Su altre celle ci sono valori scritti a mano, e su alcune righe compare un importo anche nella colonna dei doppiatori primari pur avendo un altro ruolo | La 1ª ripartizione del file supera di circa 794 € quella della scheda (599 righe). Spostamento complessivo tra artisti: circa 2.826 € |
| 4 | Timvision SVOD | Su 59 righe di doppiatori primari la 1ª ripartizione è scritta a mano ed è circa il triplo della formula. Anche le 7 righe di direzione hanno valori scritti a mano | +1.608 € sulla 1ª ripartizione dei doppiatori primari. Spostamento complessivo tra artisti: circa 3.121 € |
| 4b | Disney+, Timvision TVOD | Alcuni valori scritti a mano al posto della formula, e importi anche nella colonna dei doppiatori primari su righe di altri ruoli | Effetto piccolo: circa 131 € e 17 € di spostamento tra artisti |
| 4c | Apple TV SVOD | Il minimo di 1,50 € non è applicato («non necessaria»), anche se 1.186 righe su 1.560 restano sotto 1,50 € | Gli importi piccoli restano tra 1,12 € e 1,50 € |
| 4d | Rai tematiche | 227 trasmissioni oltre i 60 minuti (per esempio i film di Rai 4) non hanno ricevuto il 9%. 65 trasmissioni in prima serata, quasi tutte con l'orario scritto come testo (per esempio Rai Movie), non hanno ricevuto l'8%. La durata del foglio è in secondi | La maggiorazione va a meno righe del dovuto. Spostamento complessivo tra artisti: circa 130 € |
| 5 | Vari | Il +10% alla direzione del doppiaggio è applicato in modi diversi (vedi la domanda 1) | Importi della direzione non confrontabili tra emittenti |
| 6 | Tutti | Nessun file applica il limite di 3 ruoli per artista nella stessa opera né il 10% della media per le righe senza visualizzazioni. Su Disney+ 316 righe hanno esattamente 100 visualizzazioni: forse un valore assegnato a mano? | Da chiarire (domande 3 e 4) |
| 7 | RaiPlay, Apple TVOD, Amazon Channels | Dopo la riduzione proporzionale, le righe portate a 1,50 € scendono sotto 1,50 € (circa 1,20 € su RaiPlay, 1,02 € su Apple TVOD) | Da chiarire (domanda 2) |
| 8 | Viacom | Il 9% (opere oltre 60 minuti) non va a nessuno, perché tutte le opere durano meno di un'ora, e rientra nel resto. L'8% della prima serata vale 0,25 € a riga, ma 64 € ÷ 14 righe farebbe 4,57 € | Da chiarire (domanda 5) |
| 9 | Rai generaliste e tematiche | Il calcolo usa 1.147 utilizzazioni, ma le righe sono 1.149 | Differenza minima |
| 10 | WB Discovery | Il file contiene solo gli importi finali, senza formule e senza il fondo | Non si può ricostruire esattamente (lo ricostruiamo entro circa l'1%) |

## Confronto con il calcolo della piattaforma

Ogni file è stato ricalcolato con il motore della piattaforma: stesse righe, stesso fondo, regole della scheda, valori esatti. Lo «spostamento tra artisti» è la somma, artista per artista, della differenza in valore assoluto tra il file e la piattaforma.

| File | Fondo | Totale nel file | Totale piattaforma | Spostamento tra artisti | Causa principale |
|---|---|---|---|---|---|
| Rai generaliste e tematiche | 5.000 | 5.000,05 | 5.000,00 | 130 € (2,6%) | Maggiorazioni mancanti nelle tematiche (punto 4d) |
| Viacom | 800 | 800,64 | 800,00 | 26 € (3,2%) | Quota dell'8% (punto 8) |
| Tv2000 | 50 | 50,01 | 50,00 | 0,19 € | Arrotondamenti |
| WB Discovery | 1.300 (stimato) | 1.299,95 | 1.300,00 | 6 € (0,5%) | Arrotondamenti |
| Apple TV SVOD | 2.500 | 2.499,94 | 2.500,00 | 186 € (7,4%) | Minimo di 1,50 € non applicato (punto 4c) |
| Apple TV TVOD | 8.000 | 7.997,23 | 8.000,00 | 54 € (0,7%) | Arrotondamenti e minimo |
| RaiPlay | 30.000 | 30.003,67 | 30.000,00 | 36 € (0,1%) | Arrotondamenti |
| Disney+ | 20.000 | 20.001,66 | 20.000,00 | 131 € (0,7%) | Valori scritti a mano (punto 4b) |
| Netflix | 35.000 | 34.997,29 | 35.000,00 | 2.826 € (8,1%) | Formule sulla riga sbagliata (punto 3) |
| Paramount+ | 3.000 | 3.000,27 | 3.000,00 | 4 € (0,1%) | Arrotondamenti |
| Timvision SVOD | 20.000 | 19.999,97 | 20.000,00 | 3.121 € (15,6%) | Valori scritti a mano (punto 4) |
| Timvision TVOD | 1.000 | 999,98 | 1.000,00 | 17 € (1,7%) | Direzione e valori scritti a mano |
| Amazon Channels | 11.500 | 13.232,21 | 11.500,00 | 1.732 € (15,1%) | Riduzione non riportata (punto 1) |
| Amazon SVOD | 22.300 | 22.301,16 | 22.300,00 | 30 € (0,1%) | Arrotondamenti |
| Amazon SVOD Standalone | 10.000 | 10.000,76 | 10.000,00 | 742 € (7,4%) | Moltiplicatore 1,8 (punto 2) |
| Amazon TVOD | 6.000 | 6.000,15 | 6.000,00 | 4 € (0,1%) | Arrotondamenti |

Dove il file non ha errori, il calcolo della piattaforma coincide con quello di RASI entro pochi euro. Questo conferma che le regole sono state lette nello stesso modo.

In tutti i file la quota per riga, il resto e la percentuale di riduzione sono scritti a mano con pochi decimali. Per questo i totali si discostano dal fondo di qualche euro, da −2,71 € (Netflix) a +3,66 € (RaiPlay). In piattaforma questi valori vengono calcolati in modo esatto.

## Domande

1. **+10% alla direzione del doppiaggio.** Va applicato sulla sola 1ª ripartizione, come in Disney+, Netflix e Amazon, oppure sul totale finale, come in Rai? In Viacom e Tv2000 l'intestazione lo cita, ma non è applicato. In Timvision TVOD risulta raddoppiato (×2,2).
2. **Minimo di 1,50 €.** È corretta la nostra lettura (gli importi sotto 1,50 € vengono portati al più piccolo importo già pari o superiore a 1,50 €)? Il minimo va garantito anche dopo la riduzione proporzionale, oppure la riduzione può portare l'importo sotto 1,50 €? Vale solo per l'on demand, come dice la scheda?
3. **Limite di 3 ruoli** per artista nella stessa opera: va applicato? Se un artista ha più di 3 ruoli, quali si tengono (quelli con il peso più alto)?
4. **Righe senza visualizzazioni** in un catalogo che le ha: assegniamo il 10% della media delle visualizzazioni come dice la scheda? Le 100 visualizzazioni di Disney+ sono un valore assegnato da voi?
5. **Quote lineari senza righe** (per esempio il 9% quando nessuna opera supera i 60 minuti): rientrano nel resto della 2ª ripartizione, come in Viacom, o si dividono in altro modo?
6. **Amazon:** i quattro servizi (Channels, SVOD, SVOD Standalone, TVOD) hanno ciascuno il proprio fondo (11.500 + 22.300 + 10.000 + 6.000 = 49.800 €), oppure c'è un fondo unico da dividere?
7. **WB Discovery:** qual è il fondo e quali dati sono stati usati (durata sì, orario no)?
8. **RTI:** con quale percentuale si divide il fondo tra lineari e non lineari («ripartizione precedente»)? E i conteggi di vendita dei non lineari valgono come visualizzazioni?
9. **Trattenute:** dagli importi va tolta una trattenuta RASI o di collecting, oppure i fondi sono già netti?
10. **Registi:** entrano nella ripartizione? Con quale peso?
11. **Visibilità per l'artista:** l'artista vede i propri importi dopo l'approvazione o solo dopo il pagamento?
12. **Quadro generale ed estratto per artista:** potete mandarci un fac-simile di entrambi?
13. **Vincoli del Ministero** (a ogni comprimario almeno un quinto del primario; ai comprimari non oltre il 50%): li controlliamo e mostriamo un avviso, oppure vanno corretti automaticamente?
