# Bozza mail da inviare (non mettere nello zip)

**Da:** Matteo  
**A:** Pasquale  
**Oggetto:** Individuazioni Sky / integrità banca dati — documenti e incontro

Stesso impianto e tono della bozza originale. Tocca solo: causa extras Sky (non soglia titolo), tre casi già approfonditi, niente “piccola percentuale”, Manuale (Mattei sul 2005), allegati ora, niente revisione di 20.000 righe né diff datato inesistente.

---

Ciao Pasquale,

ti ringrazio per il riscontro dettagliato e per gli esempi, che sono molto utili per inquadrare meglio le criticità che state osservando. In allegato trovi i documenti di cui parlavamo: l’algoritmo di individuazione, il report sui tre titoli Sky e il confronto tra Noco e il catalogo attuale, con un foglio per artista.

Rispetto all’affidabilità del programma, il fatto che vengano individuati elementi “extra” non è di per sé indice di inaffidabilità dell’algoritmo, ma una conseguenza di come è tarato il matching. Come ricorderai, la scelta di mantenerci “larghi” è stata condivisa proprio per privilegiare i falsi positivi rispetto alle omissioni; non a caso, ogni individuazione è accompagnata da uno score di affidabilità, così da permettere una valutazione più consapevole in fase di revisione.

L’algoritmo è stato iterato e ottimizzato più volte nel corso dell’ultimo anno, e ad oggi, nella maggior parte dei casi, risulta affidabile. Non escludo casistiche limite: ho approfondito le tre che hai segnalato (FRINGE, HAWAII FIVE-0, YELLOWSTONE). Il titolo della serie è riconosciuto correttamente; gli extra nascono da una regola sull’episodio — se la puntata esatta non è in catalogo, il programma può usare lo stesso numero di un’altra stagione. È coerente con l’impostazione larga, ma su questi palinsesti copre puntate che il repertorio non contempla. Nel report allegato trovi il dettaglio e una proposta per restringere quella regola, da confermare insieme.

Come abbiamo già discusso più volte, il nodo principale rimane però la completezza e coerenza dei dati di base. Molte opere risultano ancora prive di tconst, titolo originale, regia e altre informazioni chiave, che sono fondamentali per poter associare con certezza un’opera e ridurre le ambiguità. Proprio per aiutarvi su questo aspetto abbiamo integrato la possibilità di importare questi dati da fonti esterne, ma lo “stato di salute” complessivo della banca dati risulta ancora parziale, come evidente dall’apposita schermata in dashboard. Sui tre titoli Sky, però, il repertorio Noco e quello attuale coincidono con quanto indicate: lì il tema non è un buco di catalogo.

Già in fase di migrazione avevamo sottolineato la necessità di una revisione successiva della banca dati, perché in un trasferimento di quella dimensione è possibile che una parte delle informazioni venga alterata, accorpata o persa. Il confronto di questi giorni lo conferma: 2.676 collegamenti artista–opera presenti in Noco non sono nel catalogo attuale, e in alcuni casi la perdita è totale. Il lavoro fatto dopo il trasferimento, AGCOM compreso, si può conservare.

Il caso di “Manuale d’amore” 2005 vs “Manuale d’Am3re” 2011: i due film ci sono entrambi. C’è spesso ambiguità tra anno di produzione, pubblicazione e prima messa in onda, e per questo l’anno non è trattato come discriminante assoluto. L’errore puntuale, qui, è un altro: Mattei nel catalogo attuale risulta anche sul 2005, dove in Noco non c’è. Va staccato. Manca inoltre Il mio West (1998).

Alla luce di tutto questo, ti propongo di procedere così:

1. In allegato il documento aggiornato sul funzionamento dell’algoritmo, in modo che possiate analizzarlo con calma e validarne una volta per tutte la logica. L’obiettivo è eliminare le ambiguità: se qualcosa non dovesse tornare nelle individuazioni, saprete da quale regola o parametro deriva.

2. In allegato anche il report delle differenze tra la banca dati attuale e Noco, per artista. Non è l’elenco da spuntare riga per riga: proponiamo un ripristino automatico di ciò che è solo in Noco, tenendo ciò che è nato dopo, e una revisione solo sui conflitti veri, così da arrivare a un allineamento coerente tra i due database.

A valle della vostra lettura del materiale, sono disponibile a venirvi a trovare in sede per un incontro di approfondimento e per valutare insieme le soluzioni più opportune.

Grazie ancora per il lavoro di controllo che state portando avanti e per la collaborazione.

A presto,  
Matteo

---

**Allegare lo zip** `RASI-documenti-revisione-2026-09-11.zip` (tre PDF + CSV).
