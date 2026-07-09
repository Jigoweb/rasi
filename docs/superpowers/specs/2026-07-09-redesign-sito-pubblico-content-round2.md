# Redesign sito pubblico RASI — Contenuti round 2 (AWARD System, Bandi/News, Chi Siamo)

Riferimenti: [IA](./2026-07-09-redesign-sito-pubblico-ia-design.md) · [mapping](./2026-07-09-redesign-sito-pubblico-content-mapping.md) · [round 1](./2026-07-09-redesign-sito-pubblico-content-round1-conversione.md) · [PRODUCT.md](../../../PRODUCT.md)

---

## AWARD System

Pagina NUOVA — oggi il nome ricorre ovunque sul sito ma non è mai spiegato. Contenuto base da award.reteartistispettacolo.com/it/, **ma la decisione è cambiata rispetto alla prima bozza**: AWARD System non è più trattato come portale esterno separato. Verifica sul codice ([src/app/dashboard/profilo/page.tsx](../../../src/app/dashboard/profilo/page.tsx)) conferma che questa stessa app ha già un'area artista con tab Repertorio / Individuazioni / Ripartizioni — cioè le stesse funzioni di AWARD (archiviazione, individuazione titolari, ripartizione). AWARD **è** l'area riservata di questo sito, non un sistema terzo. La pagina pubblica diventa quindi un funnel verso il login/dashboard interno, non un link in uscita.

### Hero
**H1:** AWARD System: il database che trova i tuoi diritti
**Sottotitolo:** Artists-Works Art-Rights-Data. Il sistema con cui RASI archivia le opere, identifica gli aventi diritto, calcola la ripartizione e genera i pagamenti — e che puoi consultare direttamente dalla tua area riservata.

### Sezione: Come funziona
4 blocchi, uno per fase (stesso pattern icona+titolo+frase del resto del sito):
1. **Archiviazione** — due database, musica e audiovisivo, con i metadati di ogni opera (titoli, interpreti, codici ISRC, dati di produzione).
2. **Individuazione titolari** — i palinsesti delle emittenti vengono incrociati con il database per riconoscere gli artisti mandanti RASI presenti in ogni opera trasmessa.
3. **Ripartizione** — il compenso viene calcolato secondo il regolamento di ripartizione (vedi Documenti).
4. **Pagamento** — RASI genera ed emette i mandati di pagamento agli aventi diritto.

### Sezione: Consulta la tua posizione
**Corpo:** Se sei un artista mandante, puoi consultare il tuo repertorio, le individuazioni e le ripartizioni direttamente dalla tua area riservata — stesso accesso di questo sito, nessun account separato da creare.
**CTA primaria:** Accedi alla tua area riservata (→ `/auth`, poi `/dashboard/profilo` per utenti con ruolo artista)
**CTA secondaria (per chi non è ancora mandante):** Non hai ancora un account? Scopri come aderire (→ Per gli Artisti)

*Nota: funnel unico — questa pagina è pubblica/esplicativa, il CTA porta al login esistente dell'app (`/auth`). Il middleware già instrada gli utenti con ruolo "artista" solo su `/dashboard/profilo` (walled garden) — comportamento coerente, nessuna modifica di routing necessaria per questa fase di contenuti. Reso obsoleto: il riferimento ad award.reteartistispettacolo.com come sistema esterno separato, presente nella bozza precedente e nel doc IA/mapping fase 1-2 — da correggere in quei documenti.*

---

## Bandi e Promozione

### Hero (pagina hub)
**H1:** Bandi e promozione per gli artisti mandanti
**Sottotitolo:** Sosteniamo la crescita professionale e la promozione delle opere dei nostri mandanti attraverso bandi periodici e servizi dedicati.

### Sezione: Bandi
Template archivio (NUOVO — sostituisce le pagine piatte attuali). Ogni bando è un record con campi strutturati, non testo libero:
- Titolo
- Stato (attivo / concluso)
- Scadenza
- Categorie di progetto ammesse (con eventuali massimali economici)
- Link al regolamento completo / modulo di candidatura

**Bandi conclusi trovati nel crawl (9, migrano come contenuto storico):** "Sotto lo stesso tetto" (scadenza 16/06/2026, da trattare come concluso — vedi nota fase 2), più 8 bandi tematici precedenti ("bando-tematico-*", "bando-larte-*", "bando-r-a-s-i-2025/2026"). Contenuto dettagliato di ciascuno migra as-is dai testi esistenti, riformattato nei campi strutturati sopra.

**CTA sezione:** Vedi archivio bandi conclusi

*Nota: se al momento del lancio esiste un nuovo bando attivo, questa sezione si apre con una card "Bando attivo" in evidenza sopra l'archivio — verificare stato con cliente vicino alla data di pubblicazione.*

### Sezione: Regolamento promozione e patrocinio
Link a Documenti/Regolamenti (non testo qui, coerente con decisione fase 2 di spostare il regolamentare fuori dalle pagine di conversione).

---

## News

### Hero (listing)
**H1:** News RASI
**Sottotitolo:** Bandi, incontri, aggiornamenti dal mondo della gestione collettiva dei diritti connessi.

### Struttura listing
Template NUOVO (oggi i post esistono ma sono orfani, irraggiungibili da nav). Card per articolo: immagine, titolo, data, estratto breve, categoria (tag: Bandi / Eventi / Istituzionale / Settore).

**Contenuto esistente da migrare as-is** (fonte: post-sitemap WordPress): annunci bandi (bando-r-a-s-i-2026, bando-r-a-s-i-2025...), eventi ("Incontrarti IV edizione"), istituzionale (assemblea generale SCAPR), servizi ("Ciak, preparati! - nuovo servizio casting coaching gratuito").

**Nota tono:** l'articolo "Ciak, preparati..." (casting coaching) è il contenuto con il tono più vicino a quello target del nuovo sito ("non lasciarti scappare questa opportunità") — usarlo come riferimento di voce per gli articoli futuri, non solo migrarlo.

### CTA in ogni articolo
Coerente con l'argomento: bandi → "Candidati ora", eventi → "Scopri di più", servizi → link alla pagina Servizi pertinente.

---

## Chi Siamo

Unisce "Chi siamo" + "Inizio attività" (decisione fase 2). "Organi sociali" resta pagina/sezione separata as-is.

### Hero
**H1:** Chi siamo
**Sottotitolo:** RASI è l'organismo di gestione collettiva nato per dare agli artisti interpreti ed esecutori uno strumento serio, trasparente ed equo per la tutela dei propri diritti connessi.

### Sezione: Missione
Riscritto e alleggerito da ~1200 a circa 400-500 parole, tono meno istituzionale-difensivo:
- Perché RASI esiste: gli artisti maturano diritti economici spesso senza saperlo o senza gli strumenti per farli valere. RASI colma questo divario.
- Valori: trasparenza, pubblicità, equità, imparzialità (riprendere ma non come lista legale — integrarli nel discorso).
- Pagamenti con cadenza regolare (periodicità da confermare, vedi nota round 1).
- Impegno anti-pirateria (menzionato nel contenuto esistente, sintetizzare in una frase).

### Sezione: La nostra storia (assorbe Inizio attività)
Timeline sintetica invece del blocco immagini scansionate attuale:
- **9 marzo 2012** — fondazione di RASI.
- **6 ottobre 2017** — iscrizione al registro AGCOM degli organismi di gestione collettiva.

*Nota: i contenuti attuali (roster fondatori, richiesta AGCOM) sono immagini scansionate — vanno ritrascritti in testo per questa sezione, non riportati come immagini (requisito accessibilità da PRODUCT.md).*

### Sezione: Chi guida RASI (Organi sociali, migra AS-IS)
- Consiglio di Amministrazione (5 membri, nominativi)
- Comitato di Sorveglianza (6 membri, nominativi)
- Organo di Controllo Contabile (1 membro, nominativo)

*Nota: dati anagrafici da riconfermare aggiornati con cliente prima della pubblicazione (mapping fase 2, punto 4 — già segnato "migrazione as-is confermata, nessuna verifica richiesta in questa fase": si applica anche qui, nessuna azione ulteriore necessaria salvo diversa indicazione).*

### CTA finale
**Titolo:** Vuoi saperne di più su come lavoriamo?
**CTA:** Leggi lo Statuto e i regolamenti (→ Documenti)

---

## Aperti da verificare con cliente prima di fase 5

1. **Bando attivo al lancio** — verificare se al momento della pubblicazione esiste un bando realmente attivo da mettere in evidenza.
2. **Timeline Chi Siamo** — confermare che le due date (fondazione, iscrizione AGCOM) siano le uniche tappe rilevanti o se serve aggiungere altri milestone.
3. **Ritrascrizione documenti scansionati** — richiede reperire i testi originali (roster fondatori, richiesta AGCOM) da fonte diversa dalle immagini, non è un lavoro di solo copywriting.

## Prossimo passo

Contenuti coprono ora tutte le sezioni RISCRIVI/UNISCI/NUOVO della nuova IA. Le sezioni AS-IS (Documenti, Accordi, Modulistica, Privacy/Cookie) non richiedono bozze — migrano invariate. Prossimo: fase 5, design pagine/componenti via skill dedicate (impeccable), a partire dalle pagine round 1 (Home, Per gli Artisti, Servizi).
