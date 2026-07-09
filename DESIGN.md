---
name: RASI — Sito Pubblico
description: Sito istituzionale/marketing per Rete Artisti Spettacolo, collecting society diritti connessi
colors:
  ember-primary: "#C1502A"
  ember-deep: "#9C3D1E"
  ink: "#241F1B"
  slate: "#4A4540"
  paper: "#F6F4F1"
  line: "#E4DFD8"
typography:
  display:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 4rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "10px"
  full: "999px"
spacing:
  sm: "16px"
  md: "24px"
  lg: "48px"
  xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.ember-primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    padding: "14px 32px"
  button-primary-hover:
    backgroundColor: "{colors.ember-deep}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "14px 32px"
---

# Design System: RASI — Sito Pubblico

## 1. Overview

**Creative North Star: "L'Ufficio del Manager di Fiducia"**

Non un ente burocratico, non una startup creator-economy: qualcuno che tratta i diritti economici dell'artista con la stessa cura con cui tratterebbe i propri, e lo dice chiaramente invece di nasconderlo dietro linguaggio legale. Autorevole perché la posta in gioco (diritti, compensi) è reale; caldo perché parla ad artisti, non a pratiche; diretto perché ogni pagina deve rispondere subito a "cosa fa RASI per me e perché fidarmi".

Il sistema rifiuta esplicitamente: il mix scollegato di registro legalistico e marketing del sito attuale, i documenti ufficiali trattati come immagini scansionate, i portali membri WordPress-default esteticamente estranei al resto, e il muro di testo burocratico tipico dei siti istituzionali italiani.

**Design read (fase 5):** landing istituzionale/nonprofit per utenti-artisti, trust-first ma calda, redesign-overhaul (nuovo linguaggio visivo, IA e contenuti già ridisegnati nelle fasi 1-4). Dial: `DESIGN_VARIANCE 6` (offset, non simmetria perfetta ma nemmeno caos asimmetrico — la fiducia richiede prevedibilità), `MOTION_INTENSITY 5` (reveal fluidi on-scroll, nessuna coreografia GSAP hijack), `VISUAL_DENSITY 4` (spaziatura da app quotidiana, non art-gallery airy — c'è contenuto reale da portare).

**Key Characteristics:**
- Un accento cromatico committed (Ember, terracotta-vermiglio caldo) che porta calore senza diventare decorazione.
- Tipografia a famiglia singola (Schibsted Grotesk) — niente coppia display/body magazine-style, regge sia hero sia testo normativo denso.
- Motion responsive: transizioni e feedback puliti (`whileInView` stagger leggero), zero coreografie da hero-landing generica.
- Gerarchia visiva netta tra pagine di conversione (Per gli Artisti, Servizi) e pagine di compliance (Documenti) — stessa voce, intensità diversa.

## 2. Colors

Palette Committed su base neutra calda (non crema/beige generica): carta grigio-caldo desaturata, non bianco puro, non crema da "warm-craft" cliché. Ember resta l'accento che porta la voce del brand su CTA e stati; a questo si affiancano **note di colore** estratte dal logo RASI reale (cerchi concentrici blu, magenta, giallo, ciano) — non un secondo accento competitivo, ma un'eco controllata del marchio esistente, usata in punti piccoli e specifici (icone, piccoli dettagli decorativi vicino al logo), mai su CTA o superfici grandi.

**The Committed Rule.** L'accento Ember porta 30-60% di ogni superficie chiave (hero, CTA primarie, stati attivi, badge di sezione) — non è decorazione, è la voce del brand.

### Primary
- **Ember** (`#C1502A`): CTA primarie, stati attivi/selezionati, accenti hero. Terracotta-vermiglio, distinto dalla famiglia beige+brass/oxblood da evitare per default (vedi Do's and Don'ts).
- **Ember Deep** (`#9C3D1E`): hover/active della CTA primaria.

### Logo Accent Notes (estratti dal marchio reale, uso ristretto)
Colori presi dai cerchi concentrici del logo RASI esistente, desaturati leggermente per restare coerenti con la palette calda del sito. Regola d'uso: **mai su CTA, mai su sfondi di sezione** — solo su dettagli piccoli e ripetuti (icone dei 4 vantaggi, un accento vicino al wordmark del logo, badge di categoria se serve distinguere sezioni). Un colore per elemento, non un gradiente arcobaleno.
- **Indigo Logo** (`#2E3E7C`): nota fredda, eco del blu dominante nel logo.
- **Magenta Logo** (`#B23A73`): nota calda-fredda, eco del cerchio magenta.
- **Ciano Logo** (`#2E9BB0`): nota fredda, eco del cerchio ciano.
- **Giallo Logo** (`#D9A62E`): nota calda desaturata, eco del cerchio giallo (mai puro/acceso, per non competere con Ember).

### Neutral
- **Ink** (`#241F1B`): testo principale, quasi-nero caldo (non nero puro).
- **Slate** (`#4A4540`): testo secondario, didascalie, metadati.
- **Paper** (`#F6F4F1`): sfondo superfici, grigio-caldo desaturato, non bianco puro né crema.
- **Line** (`#E4DFD8`): bordi, divisori, hairline.

### Named Rules
**The One Voice Rule.** Ember appare solo su elementi che richiedono un'azione o segnalano stato attivo (CTA, tab selezionata, badge "Attivo" su un bando) — mai come sfondo decorativo di sezioni intere non correlate ad azione.

**The Logo Echo Rule.** Le note di colore del logo (Indigo/Magenta/Ciano/Giallo) appaiono solo su elementi piccoli e ripetuti (icone, badge), mai su CTA, hero, o sfondi ampi. Sono un richiamo al marchio esistente, non una seconda palette Committed.

## 3. Typography

**Display/Body Font:** Schibsted Grotesk (Google Fonts), famiglia unica per tutto il sito. Scelta perché regge sia titoli hero larghi sia testo normativo denso (Documenti/Norme) senza cambiare famiglia, ed è distintiva rispetto ai default AI più comuni (Inter, Space Grotesk, DM Sans, Outfit, Plus Jakarta Sans — tutti evitati).

**Character:** Grottesca con eredità editoriale (nata per un quotidiano norvegese) — dà autorevolezza senza freddezza tecnica, diretta a ogni peso.

### Hierarchy
- **Display** (700, `clamp(2.5rem, 5vw, 4rem)`, line-height 1.05): hero, titoli sezione landing.
- **Headline** (700, `clamp(1.75rem, 3vw, 2.5rem)`, line-height 1.15): titoli pagina, H2 hub.
- **Body** (400, 17px, line-height 1.6, max 65-75ch): testo corrente, prosa lunga (Chi Siamo, Norme).
- **Label** (600, 14px, letter-spacing 0.01em): nav, badge, CTA.

### Named Rules
**The One Family Rule.** Un solo family per tutto il sito, titoli inclusi — pesi e dimensioni creano gerarchia, non famiglie diverse.

## 4. Elevation

Sistema prevalentemente flat. Nessuna ombra decorativa statica. L'unica elevazione ammessa è una risposta a stato (hover su card interattive, focus su input) — mai come default a riposo.

### Shadow Vocabulary
- **hover-lift** (`box-shadow: 0 8px 24px rgba(36, 31, 27, 0.08)`): card interattive (bando, news, servizio) al hover, abbinata a `-translate-y-[2px]`.

### Named Rules
**The Flat-By-Default Rule.** Superfici piatte a riposo. L'ombra appare solo come risposta a hover/focus, mai come decorazione statica di card o sezioni.

### Dark mode
**Fuori scope, deciso esplicitamente.** Il sito resta solo light, come le convenzioni di siti istituzionali/pubblici (GOV.UK, USWDS). Non aggiungere token o varianti `dark:` senza nuova decisione esplicita.

### Motion
Scroll-reveal leggero (fade + translate-y, `IntersectionObserver`, componente [`reveal.tsx`](../src/app/(public)/reveal.tsx)) su tutte le sezioni sotto la hero. Rispetta `prefers-reduced-motion` (skip diretto a stato visibile). Coerente col dial Motion=5: feedback e reveal puliti, nessuna coreografia GSAP.

## 5. Components

### Buttons
- **Shape:** pill (`rounded-full`, radius 999px) — coerente con il tono diretto/invitante del brand.
- **Primary:** sfondo Ember, testo Paper, padding `14px 32px`, peso Label (600).
- **Hover / Focus:** sfondo Ember Deep, `-translate-y-[1px]` al hover per feedback tattile, ring visibile al focus da tastiera.
- **Secondary / Outline:** bordo Ink 1px, testo Ink, sfondo trasparente, hover riempie con Ink/testo Paper.

### Cards
- **Corner Style:** radius 10px (`rounded-md`), coerente su bando/news/servizio.
- **Background:** Paper su sfondo Ink-scuro di sezione, o bianco puro su sfondo Paper — mai stesso colore di sfondo e card.
- **Shadow Strategy:** flat a riposo, `hover-lift` al hover se la card è cliccabile.
- **Border:** 1px Line dove la card non ha già contrasto di sfondo sufficiente.
- **Internal Padding:** 24px (scale `md`).

### Navigation
- **Style:** nav primaria max 4 voci dirette (Chi Siamo, Per gli Artisti, Servizi, Bandi e News) per restare su una riga a `lg` — Documenti e Accordi vivono in footer, coerente con la decisione fase 1 di non competere con le pagine di conversione.
- **Typography:** Label (14px, 600).
- **Stati:** default Ink, hover Ember, nessun sottolineato permanente — sottolineatura/indicatore solo su pagina attiva.
- **Utility persistente:** AWARD System (spiegazione) + Area Riservata (CTA primaria Ember) restano sempre visibili, non nascosti in hamburger.
- **Mobile:** collassa in menu a comparsa sotto `md`, CTA Area Riservata resta visibile nella barra.

## 6. Do's and Don'ts

### Do:
- **Do** usare Ember solo su CTA primarie e stati attivi — mai come riempimento decorativo di sezioni intere non correlate ad azione.
- **Do** mantenere Schibsted Grotesk anche nelle pagine Documenti/Norme dense — non introdurre una seconda famiglia "legale".
- **Do** trattare ogni documento ufficiale (roster, regolamenti) come testo accessibile, non immagine scansionata.
- **Do** limitare la nav primaria a 4 voci per restare su una riga a `lg` (1024px).

### Don't:
- **Don't** mescolare registro legalistico e marketing senza transizione visiva chiara tra sezioni — l'anti-reference esplicito è il sito RASI attuale.
- **Don't** usare coreografie di entrata orchestrate in stile landing-page generica (GSAP scroll-hijack, pin-and-stack) — motion è "Responsive" (dial 5), non "Choreographed".
- **Don't** introdurre una seconda famiglia tipografica per "differenziare" sezioni istituzionali da quelle di conversione.
- **Don't** trattare bandi/news come pagine piatte isolate — restano un content-type strutturato (vedi mappatura contenuti fase 2).
- **Don't** usare la palette beige/crema + brass/oxblood da "warm-craft" generico — Paper è grigio-caldo desaturato, non crema; Ember è terracotta-vermiglio, non ottone.
- **Don't** usare l'em-dash (—) in copy visibile: titoli, bottoni, badge, caption. Usare punto, virgola o trattino breve.
