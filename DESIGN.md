<!-- SEED — re-run /impeccable document once c'è codice reale (pagine/componenti nuovi) da cui estrarre token e componenti effettivi. -->

---
name: RASI — Sito Pubblico
description: Sito istituzionale/marketing per Rete Artisti Spettacolo, collecting society diritti connessi
---

# Design System: RASI — Sito Pubblico

## 1. Overview

**Creative North Star: "L'Ufficio del Manager di Fiducia"**

Non un ente burocratico, non una startup creator-economy: qualcuno che tratta i diritti economici dell'artista con la stessa cura con cui tratterebbe i propri, e lo dice chiaramente invece di nasconderlo dietro linguaggio legale. Autorevole perché la posta in gioco (diritti, compensi) è reale; caldo perché parla ad artisti, non a pratiche; diretto perché ogni pagina deve rispondere subito a "cosa fa RASI per me e perché fidarmi".

Il sistema rifiuta esplicitamente: il mix scollegato di registro legalistico e marketing del sito attuale, i documenti ufficiali trattati come immagini scansionate, i portali membri WordPress-default esteticamente estranei al resto, e il muro di testo burocratico tipico dei siti istituzionali italiani.

**Key Characteristics:**
- Un accento cromatico committed (30-60% della superficie) che porta calore senza diventare decorazione.
- Tipografia a famiglia singola, ben calibrata su pesi/dimensioni — niente coppia display/body magazine-style.
- Motion responsive: transizioni e feedback puliti, zero coreografie da hero-landing generica.
- Gerarchia visiva netta tra pagine di conversione (Per gli Artisti, Servizi) e pagine di compliance (Documenti) — stessa voce, intensità diversa.

## 2. Colors

*[Da risolvere in fase 5 — nessun hex ancora scelto, solo strategia.]*

**The Committed Rule.** Un solo colore d'accento porta 30-60% di ogni superficie chiave (hero, CTA primarie, stati attivi) — non è decorazione, è la voce del brand. Famiglia hue (caldo tipo terracotta/ambra vs blu profondo/petrolio) da decidere in fase 5 con moodboard, coerente con "autorevole, caldo, diretto" da PRODUCT.md.

### Primary
- **[da nominare]** (`[to be resolved during implementation]`): accento committed, CTA primarie, stati attivi/selezionati.

### Neutral
- **[da nominare]** (`[to be resolved during implementation]`): superfici, testo, bordi — layer neutro caldo o freddo da abbinare all'accento scelto.

## 3. Typography

**Display/Body Font:** Single sans — famiglia unica, nessun pairing display+body. `[font specifico da scegliere in fase 5, evitando reflex-reject: no Inter/DM Sans/Space Grotesk/Plus Jakarta/Instrument Sans di default]`

**Character:** Diretto e leggibile a ogni peso — deve reggere sia titoli hero sia testo normativo denso (Documenti/Norme) senza cambiare famiglia.

### Hierarchy
- **Display** (peso/size da definire): hero, titoli sezione landing.
- **Headline** (peso/size da definire): titoli pagina, H2 hub.
- **Body** (peso/size da definire, 65-75ch per prosa lunga tipo Chi Siamo/Norme): testo corrente.
- **Label** (peso/size/letter-spacing da definire): nav, badge, CTA.

### Named Rules
**The One Family Rule.** Un solo family per tutto il sito, titoli inclusi — pesi e dimensioni creano gerarchia, non famiglie diverse.

## 4. Elevation

*[Da definire in fase 5.]* Ipotesi di partenza coerente con motion "Responsive": superfici prevalentemente flat, elevazione (ombra leggera) solo come risposta a stato (hover, focus, card interattive), non come decorazione statica diffusa.

## 5. Components

*[Nessun componente reale da documentare — il codice attuale in `src/app/(public)/page.tsx` usa token placeholder (`anthropic-*`) di uno starter template, non rappresentativo del brand RASI. Da sintetizzare in fase 5 una volta scelti i token reali.]*

Componenti canonici attesi per fase 5: bottone primario/secondario, card (bando, news, servizio), nav header + footer utility bar, tabella/lista compliance (Norme, Documenti), form contatto.

## 6. Do's and Don'ts

### Do:
- **Do** usare l'accento colore solo su CTA primarie e stati attivi — mai come riempimento decorativo di sezioni intere non correlate ad azione.
- **Do** mantenere la stessa famiglia tipografica anche nelle pagine Documenti/Norme dense — non introdurre un secondo registro visivo "legale".
- **Do** trattare ogni documento ufficiale (roster, regolamenti) come testo accessibile, non immagine scansionata.

### Don't:
- **Don't** mescolare registro legalistico e marketing senza transizione visiva chiara tra sezioni — l'anti-reference esplicito è il sito RASI attuale.
- **Don't** usare coreografie di entrata orchestrate in stile landing-page generica — motion è "Responsive", non "Choreographed".
- **Don't** introdurre una seconda famiglia tipografica per "differenziare" sezioni istituzionali da quelle di conversione.
- **Don't** trattare bandi/news come pagine piatte isolate — restano un content-type strutturato (vedi mappatura contenuti fase 2).
