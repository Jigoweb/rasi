# Redesign sito pubblico RASI — Architettura dell'Informazione

## Contesto

RASI vuole sostituire il sito istituzionale/marketing attuale (`reteartistispettacolo.it`, WordPress) con nuove pagine dentro `src/app/(public)/` di questa app Next.js. Motivazione principale: modernizzare l'immagine/brand. Questo documento copre la **fase 1** del progetto (analisi IA), primo di 5 step concordati:

1. Crawl sito esistente + rivalutazione IA (questo documento)
2. Revisione contenuti mappati per ogni pagina
3. Setup documenti agentici (design.md, ecc.) se assenti
4. Conferma contenuti nuovi
5. Design pagine/sezioni/componenti via skill dedicate

## Persone target (sito pubblico)

- **Artisti potenziali mandanti** — interpreti/esecutori che valutano se firmare mandato con RASI. Pubblico primario di conversione.
- **Artisti già mandanti** — utenti esistenti che cercano news, stato pratiche, area riservata, AWARD system.

(Emittenti/aziende e stampa/istituzioni sono utenti secondari, non guidano l'IA primaria ma restano serviti da sezioni Documenti/Accordi/Contatti.)

## Sito attuale — inventario e IA

Piattaforma: WordPress (Rank Math SEO). 54 URL indicizzati. Monolingua IT nonostante prefisso `/it/` (nessuna altra lingua pubblicata oggi, nonostante il nuovo sito dovrà supportarne 5 — vedi Requisiti).

```
Home (/it/)
├── RASI (dropdown istituzionale)
│   ├── Chi siamo
│   ├── Inizio attività
│   ├── Statuto (PDF)
│   ├── Privacy Policy
│   ├── Personal Data Policy
│   ├── Procedure di trattamento dei reclami
│   ├── Organi sociali
│   ├── Regolamento adesione
│   ├── Relazione di trasparenza (6 PDF, 2019-2024)
│   └── Linee di condotta
├── Artisti (hub)
│   ├── Quando maturano il compenso
│   ├── Quali artisti possono dare mandato
│   ├── Cosa fa RASI per gli artisti
│   ├── Regolamento conferimento mandato
│   └── Regolamento ripartizione (musica / video, 2 pagine)
├── Servizi agli artisti (hub)
│   ├── Servizi artistici (promo social, casting coaching)
│   └── Servizi burocratici (welfare, fisco)
├── Accordi (lista partner IT + estero)
├── Norme (hub: Nazionali / Internazionali / Giurisprudenza)
├── Utilizzatori (dropdown)
│   ├── Video → settore-opere-cinematografiche (+ tariffe, contratti campione)
│   └── Musica → settore-musica (+ tariffe)
│   └── Elenchi opere interpretate (video / musica)
├── Promozione (hub)
│   ├── Regolamento promozione/patrocinio
│   ├── Bando attivo ("Sotto lo stesso tetto")
│   └── 8 bandi conclusi (archivio piatto, non filtrabile)
├── Modulistica (6 form scaricabili)
├── Contatti (form + dettagli)
└── Login/Register/Members (portale gated, WP default)

Fuori nav: News/annunci (post WP orfani, no voce menu), cookie-policy, thank-you pages
```

## Problemi rilevati (crawl)

1. IA legale/compliance (Statuto, Norme, Regolamenti) allo stesso livello nav di pagine marketing/conversione — confonde priorità.
2. Video e Musica duplicano quasi identica struttura e copy in due punti diversi della nav (sotto "Artisti" e sotto "Utilizzatori").
3. "AWARD System" citato ovunque (stat homepage, CTA nav) ma mai spiegato sul sito principale — **chiarito**: è un portale esterno separato (`award.reteartistispettacolo.com`), database interconnesso "Artists-Works Art-Rights-Data" per archiviazione, individuazione titolari, ripartizione e pagamento. Consultabile da titolari/utilizzatori con credenziali.
4. Nessuna voce "News" in nav — annunci esistono solo come post WP orfani.
5. Bandi (grant call) sono un content-type ricorrente (9+ istanze) ma vivono come pagine piatte isolate, non archivio strutturato/filtrabile.
6. Contatti: un solo form generico; richieste specifiche instradate via mailto con istruzioni su oggetto email.
7. Documenti ufficiali (roster, richieste AGCOM) mostrati come immagini scansionate — problema di accessibilità/SEO.
8. Sito monolingua IT nonostante prefisso `/it/` e accordi internazionali/SCAPR — **chiarito**: il sito reale è localizzato in 5 lingue (IT/EN/FR/DE/ES); il crawl ha visto solo la versione IT.

## Requisiti confermati con cliente

- **AWARD System**: manteniamo simbolo/nome. Non migriamo il portale (resta esterno). Costruiamo una nuova versione della pagina esplicativa che rimanda al portale.
- **Lingue**: sito nuovo deve supportare IT, EN, FR, DE, ES (routing locale in Next.js; traduzione contenuti è lavoro di fase successiva, non bloccante per questo documento).
- **Video / Musica**: restano pagine separate per SEO/comunicazione. Condividono un template/componente base comune, con possibilità di override ad-hoc per pagina.
- **Relazione di trasparenza**: migrazione as-is dei contenuti esistenti (nessun aggiornamento dati richiesto in questa fase).

## Proposta nuova IA

```
Home
├── Chi Siamo — istituzionale
│   ├── Missione & storia (chi siamo, valori, inizio attività)
│   └── Organi sociali (governance, persone)
├── Per gli Artisti — hub conversione
│   ├── Perché aderire (vantaggi, come funziona il mandato)
│   └── Video / Musica (2 pagine, 1 template condiviso + override ad-hoc)
├── Servizi
│   ├── Servizi artistici (promo social, casting coaching)
│   └── Servizi burocratici (welfare, fisco)
├── Bandi e Promozione — archivio strutturato
│   ├── Bandi attivi (card, scadenze)
│   └── Archivio bandi conclusi (filtrabile)
├── Accordi — partner nazionali + esteri
├── AWARD System — pagina esplicativa nuova, funnel verso login/dashboard interna (non più portale esterno separato — vedi nota sotto)
├── News — nuovo, blog/annunci RASI + SCAPR + settore
├── Documenti — legale/compliance, non-nav primaria ma raggiungibile
│   ├── Statuto, Regolamenti (testo leggibile, non solo PDF dove possibile)
│   ├── Norme (nazionali / internazionali / giurisprudenza)
│   ├── Relazione di trasparenza (migrazione as-is)
│   └── Modulistica
└── Utility (header/footer persistente, fuori nav primaria)
    ├── Area Riservata (login → AWARD System / dashboard interna)
    ├── Contatti
    ├── Privacy Policy / Cookie Policy
    └── Selettore lingua (IT/EN/FR/DE/ES)
```

### Razionale principale

- Separazione netta istituzionale (Chi Siamo) / conversione (Per gli Artisti) / operativo (Servizi) — oggi mischiati sotto "RASI" generico.
- Bandi promossi ad archivio strutturato invece di pagine piatte isolate — pattern ricorrente merita un template dedicato (tipo CPT + archive).
- News aggiunta in nav primaria — oggi irraggiungibile da menu.
- Documenti legali raggruppati, spostati fuori dalla nav di primo livello per non competere con pagine di conversione, ma restano accessibili (footer + voce dedicata).
- Area Riservata / Contatti spostati in utility bar persistente invece che tab di primo livello — riduce affollamento nav primaria.
- AWARD System guadagna una voce propria (era solo CTA ricorrente non spiegata) con pagina ponte verso l'accesso.

**Aggiornamento (fase 4):** la decisione "portale esterno separato" sopra è superata. `src/app/dashboard/profilo/page.tsx` mostra che quest'app ha già un'area artista con tab Repertorio/Individuazioni/Ripartizioni — le stesse funzioni di AWARD System. AWARD **è** l'area riservata di questa app, non un sistema terzo su award.reteartistispettacolo.com. La pagina pubblica AWARD System diventa quindi un funnel verso `/auth` → `/dashboard/profilo`, non un link in uscita. Vedi [content round 2](./2026-07-09-redesign-sito-pubblico-content-round2.md) per il copy aggiornato.

## Fuori scope per questo documento

- Traduzione contenuti nelle 5 lingue (solo routing/struttura da prevedere).
- Contenuti dettagliati per singola pagina (fase 2).
- Documenti agentici design.md/PRODUCT.md per sito pubblico (fase 3 — da notare: `PRODUCT.md` esistente in repo è per la dashboard interna, non per il sito marketing; serve un documento brand/design separato per il pubblico).
- Design visivo di pagine/componenti (fase 5).

## Prossimo passo

Fase 2: mappare contenuti pagina per pagina sulla nuova IA (cosa migra as-is, cosa va riscritto, cosa va accorpato/eliminato), a partire dall'inventario crawl in questo documento.
