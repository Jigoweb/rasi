# Redesign sito pubblico RASI — Mappatura contenuti (fase 2)

Riferimento: [2026-07-09-redesign-sito-pubblico-ia-design.md](./2026-07-09-redesign-sito-pubblico-ia-design.md) (fase 1, IA approvata).

Per ogni sezione della nuova IA: quali pagine sorgente confluiscono, decisione editoriale, note. Legenda decisione:

- **AS-IS** — contenuto migra sostanzialmente invariato (aggiornamenti minimi: link, date)
- **RISCRIVI** — stesso argomento, copy da riscrivere per tono/brevità/brand nuovo
- **UNISCI** — più pagine sorgente confluiscono in una pagina nuova
- **TAGLIA** — contenuto non migra (obsoleto, ridondante, o assorbito altrove)
- **NUOVO** — non esiste oggi, va scritto da zero

---

## Home

| Sorgente | Decisione | Note |
|---|---|---|
| Home (/it/) | RISCRIVI | Struttura ok (target audience, perché firmare, stats, CTA) ma tono da unificare — oggi mix registro legalistico/marketing. Stats "dal database AWARD SYSTEM" da verificare fonte dati aggiornata. |

## Chi Siamo

| Sorgente | Decisione | Note |
|---|---|---|
| Chi siamo | RISCRIVI | Contenuto valido (fondazione 2012, registrazione AGCOM 2017, valori trasparenza/equità) ma ~1200 parole da alleggerire. Tono attuale più istituzionale-difensivo che invitante. |
| Inizio attività | UNISCI → dentro "Missione & storia" | Oggi immagini scansionate (roster, richiesta AGCOM) — vanno ritrascritte in testo per accessibilità/SEO, non riusare come immagini. |
| Organi sociali | AS-IS | Roster CdA (5), Comitato Sorveglianza (6), Organo Controllo Contabile (1) — dati da verificare aggiornati con cliente, struttura pagina ok. |

## Per gli Artisti

| Sorgente | Decisione | Note |
|---|---|---|
| Artisti (hub) | RISCRIVI | H1 e framing buoni ("Sei artista? RASI ti aiuta..."), ma lista ~15 riferimenti legislativi troppo densa per hub di conversione — spostare dettaglio normativo in Documenti/Norme, hub resta persuasivo. |
| Quando maturano il compenso | RISCRIVI | Assorbire come sezione/FAQ dentro "Perché aderire", non pagina separata. |
| Quali artisti possono dare mandato | RISCRIVI | Idem — sezione/FAQ "Perché aderire" (criteri eleggibilità). |
| Cosa fa RASI per gli artisti | UNISCI → dentro "Perché aderire" | Contenuto benefit-oriented, buona base per sezione "vantaggi". |
| Regolamento conferimento mandato | TAGLIA da nav artisti → sposta in Documenti/Regolamenti | Testo regolamentare, non da tenere in hub conversione. |
| Regolamento ripartizione (musica/video) | TAGLIA da nav artisti → sposta in Documenti/Regolamenti | Idem, 2 pagine esistenti confluiscono come allegati/link da Documenti. |
| Settore opere cinematografiche (Video) | AS-IS struttura, RISCRIVI copy | Eleggibilità, servizi, commissione 10%, contratti campione — buona base, tono da armonizzare con Musica (stesso template condiviso deciso in fase 1). |
| Settore musica | AS-IS struttura, RISCRIVI copy | Idem, parallela a Video. |
| Tariffe diritti connessi (video/musica) | AS-IS | Dati tecnici, migrano come allegato/sezione dentro le rispettive pagine Video/Musica. |
| Elenco opere interpretate (video/musica) | AS-IS | Liste repertorio — valutare in fase 5 se restano pagina statica o vengono spostate/collegate ad AWARD System (dato che è un DB "in progress" già lì). Flag per discussione tecnica, non bloccante ora. |

## Servizi

| Sorgente | Decisione | Note |
|---|---|---|
| Servizi agli artisti (hub) | UNISCI | Diventa intro breve alla sezione Servizi, non serve hub testuale lungo — le due sotto-pagine bastano. |
| Servizi artistici | RISCRIVI | Promo social ("Artisti in azione"), casting coaching — tono già più caldo del resto del sito, buon riferimento voce brand per altre pagine. Form via mailto con oggetto specifico → da sostituire con form web dedicato (nota UX, non bloccante fase 2). |
| Servizi burocratici | RISCRIVI | Welfare/fisco — contenuto valido, accorciare (~650 parole → più scannerizzabile con bullet). |

## Bandi e Promozione

| Sorgente | Decisione | Note |
|---|---|---|
| Promozione (hub) | RISCRIVI | Intro breve alla sezione, oggi soprattutto link-out. |
| Regolamento promozione/patrocinio | TAGLIA da nav → sposta in Documenti/Regolamenti | Testo regolamentare. |
| Bando "Sotto lo stesso tetto" | AS-IS contenuto, NUOVO template | Scadenza 16/06/2026 già passata: tratta come bando concluso nell'archivio, non come bando attivo in evidenza (salvo conferma diversa più vicino al lancio). Struttura dati (categorie, massimali, scadenze) va estratta in campi strutturati per il nuovo template bandi, non testo libero. |
| 8 bandi conclusi | AS-IS contenuto, NUOVO template | Confluiscono nell'archivio filtrabile come record "conclusi", stesso template dati del bando attivo. |

## Accordi

| Sorgente | Decisione | Note |
|---|---|---|
| Accordi | AS-IS | Lista partner IT (RAI, RTI-Mediaset, LA7, Netflix, ecc.) ed estero (14 paesi video, 39+ musica) — contenuto breve e chiaro, migra quasi invariato. Verificare lista aggiornata con cliente. |

## AWARD System

| Sorgente | Decisione | Note |
|---|---|---|
| (nessuna pagina esistente sul sito principale) | NUOVO | Pagina esplicativa da scrivere ex-novo usando come base i contenuti trovati su award.reteartistispettacolo.com/it/ (archiviazione, individuazione titolari, ripartizione, pagamento — acronimo "Artists-Works Art-Rights-Data"). **Decisione aggiornata in fase 4**: CTA non punta più a un portale esterno — `src/app/dashboard/profilo/page.tsx` ha già le stesse funzioni (Repertorio/Individuazioni/Ripartizioni) per utenti con ruolo artista. La pagina diventa un funnel verso `/auth` → `/dashboard/profilo`, cioè verso il login di questa stessa app. |

## News

| Sorgente | Decisione | Note |
|---|---|---|
| Post WP esistenti (bandi, incontri, assemblee SCAPR, casting coaching...) | AS-IS contenuto, NUOVO template | Oggi orfani (irraggiungibili da nav). Migrano come articoli in listing filtrabile. Tono più caldo/diretto di questi post (es. "ciak preparati...") è un buon riferimento voce per il resto del sito. |

## Documenti

| Sorgente | Decisione | Note |
|---|---|---|
| Statuto | AS-IS | Resta PDF scaricabile, valutare in fase 5 se aggiungere anche versione testo per accessibilità. |
| Regolamento adesione | AS-IS | Confluisce qui da nav RASI originale. |
| Regolamento conferimento mandato | AS-IS | Da "Artisti" originale, vedi sopra. |
| Regolamento ripartizione (musica/video) | AS-IS | Da "Artisti" originale. |
| Regolamento promozione/patrocinio | AS-IS | Da "Promozione" originale. |
| Linee di condotta | AS-IS | — |
| Norme (Nazionali/Internazionali/Giurisprudenza) | AS-IS | Contenuto denso ma corretto per una sezione compliance dedicata, nessuna riscrittura necessaria. |
| Relazione di trasparenza (6 PDF, 2019-2024) | AS-IS | Confermato con cliente: migrazione as-is, nessun aggiornamento contenuti in questa fase. |
| Modulistica (6 documenti) | AS-IS | — |
| Privacy Policy | AS-IS | Obbligo legale, invariato salvo refresh testuale minimo. |
| Personal Data Policy | AS-IS | — |
| Procedure di trattamento dei reclami | AS-IS | — |
| Cookie Policy | AS-IS | — |

## Utility (Area Riservata / Contatti / lingua)

| Sorgente | Decisione | Note |
|---|---|---|
| Login/Register/Members | AS-IS funzione, NUOVO look | **Corretto in fase 4**: questo login (`/auth`) è lo stesso accesso di AWARD System, non un sistema separato — vedi sezione AWARD System sopra. |
| Contatti | RISCRIVI | Form generico + dettagli contatto ok, ma richieste specifiche oggi via mailto con oggetto — valutare form dedicati per categoria richiesta (nota UX, decisione rimandata a fase 5). |
| Selettore lingua | NUOVO | Routing 5 lingue (IT/EN/FR/DE/ES) da implementare — traduzione contenuti fuori scope fase 2/3, ma la struttura URL/routing va decisa in fase di setup tecnico (fase 3). |

---

## Chiarimenti ricevuti

1. **Login/AWARD System**: ~~confermato, restano due sistemi separati~~ — **corretto in fase 4**: sono lo stesso sistema. `/auth` → `/dashboard/profilo` è di fatto AWARD System per gli utenti con ruolo artista.
2. **Elenco opere interpretate**: fuori scope come sezione pubblica dedicata, ma essendo AWARD System ora interno (non esterno), il repertorio è comunque consultabile via `/dashboard/profilo` (tab Repertorio) — nessuna azione aggiuntiva richiesta in questa fase, solo nota per coerenza.
3. **Bando attivo ("Sotto lo stesso tetto")**: probabilmente scaduto — in fase 4 va trattato come bando concluso (archivio), non come bando attivo in evidenza, salvo conferma diversa più vicino al lancio.
4. **Dati Organi sociali / Accordi**: migrazione as-is confermata, nessuna verifica aggiornamento richiesta in questa fase.

## Prossimo passo

Fase 3: setup documenti agentici per il sito pubblico (design.md / brand doc dedicato — `PRODUCT.md` esistente in repo copre solo la dashboard interna, serve equivalente per il marketing site) prima di procedere a fase 4 (conferma contenuti) e fase 5 (design pagine/componenti).
