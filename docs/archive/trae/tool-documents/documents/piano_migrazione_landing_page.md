# Piano di Migrazione e Redesign del Sito R.A.S.I. (Esteso)

Questo documento definisce la strategia architettonica, il design system e i passi implementativi per la migrazione completa del sito WordPress attuale (incluse tutte le pagine istituzionali, normative e modulistica) verso la nuova piattaforma Next.js integrata con Supabase CMS.

## Fase 1: Analisi e Audit Completo (Reverse Engineering)

L'analisi della sitemap XML (`/sitemap.xml`) ha rivelato un'architettura informativa profonda e complessa, ben oltre la singola landing page. Il sito attuale gestisce:
1. **Sezione Istituzionale**: Chi siamo, Statuto, Privacy/Data Policy, Reclami, Organi Sociali, Relazione Trasparenza.
2. **Area Artisti**: FAQ (Quando maturano i compensi, Quali artisti), Regolamenti di adesione e ripartizione (video/musica), Servizi Artistici e Burocratici.
3. **Area Legale e Accordi**: Norme Nazionali (Codice Civile, DPCM, Leggi), Norme Internazionali (Direttive EU), Giurisprudenza, Accordi.
4. **Area Utilizzatori**: Tariffe (Video/Musica), Elenchi Opere, Contratti tipo (Canale TV, Piattaforme).
5. **Promozione e News**: Bandi attivi e conclusi (es. "Oltre i Confini", "Buona la prima").
6. **Modulistica**: Raccolta di documenti scaricabili.

L'audit evidenzia la necessità di **template differenziati** per presentare al meglio testi legali, elenchi di documenti, bandi e contenuti di marketing.

## Fase 2: Nuova Architettura e Design System (Template-Based)

Il sito abbandonerà la struttura statica/mista attuale per abbracciare un approccio **Dinamico guidato da Supabase CMS**, in cui ogni pagina avrà un `template_type` associato.

### 1. Architettura delle Rotte (Next.js App Router)
Sfrutteremo il dynamic routing per generare le pagine dal DB:
- `/` -> **Home Page** (Hero, Statistiche, Ultime News, CTA).
- `/modulistica` -> Rotta dedicata all'elenco dei documenti da scaricare.
- `/promozione/[slug]` -> Rotta per bandi e comunicazioni.
- `/[categoria]/[slug]` -> Rotta Catch-all per tutte le altre pagine (es. `/chi-siamo/statuto`, `/artisti/regolamento-ripartizione`, `/norme/codice-civile`).

### 2. Page Templates (Design System)
In base alle linee guida Anthropic (pulizia editoriale, tipografia Poppins/Lora, accenti Orange/Blue/Green), verranno creati i seguenti template React:
- **`InstitutionalTemplate`**: Per Statuto, Privacy, Trasparenza, Norme.
  - *Layout*: Layout a singola colonna ristretta per massima leggibilità (Lora font), con un indice laterale (Table of Contents) sticky per navigare i paragrafi lunghi.
- **`ServiceTemplate`**: Per "Servizi agli artisti", "Chi siamo (Intro)".
  - *Layout*: Grid asimmetrica, blocchi visivi, icone, elenchi puntati e Call to Action chiare (es. "Iscriviti ora").
- **`DocumentListTemplate`**: Per "Utilizzatori", "Tariffe", "Modulistica", "Accordi".
  - *Layout*: Tabelle dati interattive o grid di Card (shadcn `Card`) contenenti il titolo del documento, l'icona del formato (PDF/DOC) e il bottone di download.
- **`FaqTemplate`**: Per "Quando maturano i compensi?", "Quali artisti".
  - *Layout*: Utilizzo del componente `Accordion` (shadcn) per organizzare le domande/risposte, riducendo il carico cognitivo.
- **`BandoTemplate`**: Per i bandi in "Promozione".
  - *Layout*: Header con immagine di copertina, badge di stato ("Aperto" / "Concluso"), data di pubblicazione, corpo testuale e sezione "Allegati del bando".

## Fase 3: Pianificazione Tecnica (Stack & CMS)

L'implementazione estenderà il progetto Next.js e Supabase esistente, trasformando la Dashboard in un vero e proprio Headless CMS per i contenuti pubblici.

### 1. Modello Dati (Supabase CMS)
Verranno create tre nuove tabelle per gestire il contenuto strutturato:
- **`pages`**:
  - `id` (uuid), `category` (text, es. 'chi-siamo'), `slug` (text), `title` (text), `content` (html/rich-text), `template_type` (enum: institutional, service, document_list, faq), `is_published` (boolean).
- **`documents`**:
  - `id`, `title`, `file_url` (storage URL), `category` (enum: modulistica, contratti, norme, allegati_bando), `page_id` (relazione opzionale).
- **`bandi_news`**:
  - `id`, `slug`, `title`, `content`, `status` (enum: active, closed), `cover_image_url`, `published_at`.

### 2. Sviluppo Frontend (`src/app/(public)`)
- Creazione del `PublicLayout` con header (navigazione dropdown complessa per ospitare l'albero della sitemap) e footer istituzionale.
- Implementazione del file `src/app/(public)/[category]/[slug]/page.tsx`:
  - Eseguirà una query a Supabase per prelevare la pagina.
  - Utilizzerà uno switch sul campo `template_type` per renderizzare il componente corretto (`<InstitutionalTemplate data={data} />`, ecc.).

### 3. Sviluppo Backend / Dashboard Admin (`src/app/dashboard`)
- Integrazione di un Rich Text Editor (es. TipTap o simili) nella Dashboard per permettere alla redazione RASI di modificare lo Statuto, i Regolamenti e le Norme.
- Modulo di **Upload File** collegato a Supabase Storage per caricare i PDF della Modulistica, Contratti e Tariffe.
- CRUD completo per la gestione dei Bandi (apertura, chiusura, caricamento esiti).

## Execution Plan & Verifiche
1. **Database & Storage**: Setup tabelle `pages`, `documents`, `bandi_news` e bucket Storage per i PDF.
2. **Seeding Iniziale**: Creazione di uno script per popolare l'alberatura di base delle pagine (`category` e `slug`) in Supabase.
3. **Sviluppo UI Templates**: Sviluppo e test isolato (es. con mock data) dei 5 template previsti.
4. **Routing Dinamico**: Implementazione del Catch-all route `[category]/[slug]` in Next.js.
5. **Integrazione Dashboard**: Sviluppo delle form admin per la gestione contenuti.
6. **Migrazione Contenuti**: (Attività redazionale) Copia/incolla dei testi dal vecchio WordPress al nuovo CMS Supabase.
7. **Verifica Finale**: Controllo SEO (metadata dinamici), accessibilità (color contrast Anthropic), mobile responsiveness e corretta protezione RLS.
