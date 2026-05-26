const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carica variabili d'ambiente in modo base
const envPath = path.resolve(__dirname, '../.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
  console.error("File .env.local non trovato.");
  process.exit(1);
}

const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1]] = match[2];
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Mancano le credenziali Supabase in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sitemapPages = [
  // CHI SIAMO
  { category: 'chi-siamo', slug: 'inizio-attivita', title: 'Inizio attività', template_type: 'institutional' },
  { category: 'chi-siamo', slug: 'statuto', title: 'Statuto', template_type: 'institutional' },
  { category: 'chi-siamo', slug: 'privacy-policy', title: 'Privacy Policy', template_type: 'institutional' },
  { category: 'chi-siamo', slug: 'personal-data-policy', title: 'Personal Data Policy', template_type: 'institutional' },
  { category: 'chi-siamo', slug: 'procedure-di-trattamento-dei-reclami', title: 'Procedure di trattamento dei reclami', template_type: 'institutional' },
  { category: 'chi-siamo', slug: 'organi-sociali', title: 'Organi sociali', template_type: 'institutional' },
  { category: 'chi-siamo', slug: 'regolamento-adesione', title: 'Regolamento adesione', template_type: 'institutional' },
  { category: 'chi-siamo', slug: 'relazione-di-trasparenza', title: 'Relazione di trasparenza', template_type: 'institutional' },
  { category: 'chi-siamo', slug: 'linee-di-condotta', title: 'Linee di condotta', template_type: 'institutional' },

  // ARTISTI
  { category: 'artisti', slug: 'quando-gli-artisti-maturano-il-compenso', title: 'Quando gli Artisti maturano il compenso per i diritti connessi?', template_type: 'faq' },
  { category: 'artisti', slug: 'quali-artisti-possono-dare-il-mandato', title: 'Quali Artisti possono dare il mandato?', template_type: 'faq' },
  { category: 'artisti', slug: 'cosa-fa-rete-artisti-spettacolo', title: 'Cosa fa la R.A.S.I. per gli artisti che le hanno dato il mandato?', template_type: 'faq' },
  { category: 'artisti', slug: 'regolamento-conferimento-mandato', title: 'Regolamento conferimento mandato artisti', template_type: 'institutional' },
  { category: 'artisti', slug: 'regolamento-ripartizione-musica', title: 'Regolamento ripartizione artisti (musica)', template_type: 'institutional' },
  { category: 'artisti', slug: 'regolamento-ripartizione-video', title: 'Regolamento ripartizione artisti (video)', template_type: 'institutional' },

  // SERVIZI AGLI ARTISTI
  { category: 'servizi', slug: 'servizi-artistici', title: 'Servizi artistici', template_type: 'service' },
  { category: 'servizi', slug: 'servizi-burocratici', title: 'Servizi burocratici', template_type: 'service' },

  // ACCORDI E NORME (Raggruppati per semplicità in 'norme' e 'accordi')
  { category: 'accordi', slug: 'lista-accordi', title: 'Accordi', template_type: 'document_list' },
  
  { category: 'norme', slug: 'codice-civile', title: 'Codice Civile', template_type: 'institutional' },
  { category: 'norme', slug: 'decreto-mibac-5-9-2018', title: 'Decreto Mibac 5/9/2018', template_type: 'institutional' },
  { category: 'norme', slug: 'decreto-mibac-26-2-2019', title: 'Decreto Mibac 26/2/2019', template_type: 'institutional' },
  { category: 'norme', slug: 'dpcm-del-15-07-1976', title: 'DPCM del 15/07/1976', template_type: 'institutional' },
  { category: 'norme', slug: 'dpcm-del-19-12-2012-requisiti-collecting', title: 'DPCM DEL 19/12/2012 Requisiti Collecting', template_type: 'institutional' },
  { category: 'norme', slug: 'dl-64-del-30-04-2010-art-7', title: 'DL 64 del 30/04/2010 Art.7', template_type: 'institutional' },
  { category: 'norme', slug: 'legge-633-del-1941', title: 'Legge 633 del 1941', template_type: 'institutional' },
  { category: 'norme', slug: 'legge-93-del-05-02-1992', title: 'Legge 93 del 05/02/1992', template_type: 'institutional' },
  { category: 'norme', slug: 'dl-1-del-24-01-2012-art-39-liberalizzazione', title: 'DL 1 del 24/01/2012 Art.39 Liberalizzazione', template_type: 'institutional' },
  { category: 'norme', slug: 'dl-22-del-21-02-2014', title: 'DL 22 del 21/02/2014', template_type: 'institutional' },
  { category: 'norme', slug: 'dl-163-del-10-11-2014', title: 'DL 163 del 10/11/2014', template_type: 'institutional' },
  { category: 'norme', slug: 'dpcm-del-02-02-2015', title: 'DPCM del 02/02/2015', template_type: 'institutional' },
  { category: 'norme', slug: 'dm-mibac-del-20-06-2014-compenso-copia-privata', title: 'DM Mibac del 20/06/2014 Compenso Copia Privata', template_type: 'institutional' },
  { category: 'norme', slug: 'dpcm-del-17-01-2014', title: 'DPCM del 17/01/2014', template_type: 'institutional' },
  { category: 'norme', slug: 'dpcm-del-01-09-1975', title: 'DPCM del 01/09/1975', template_type: 'institutional' },
  
  { category: 'norme', slug: 'd-lgs-15-3-2017-in-attuazione-direttiva-2014-26-ue', title: 'D.Lgs. 15/3/2017 in attuazione direttiva 2014 26 UE', template_type: 'institutional' },
  { category: 'norme', slug: 'direttiva-eu-mercato-unico-digitale', title: 'Direttiva EU Mercato Unico Digitale', template_type: 'institutional' },
  { category: 'norme', slug: 'covid-19-sostegno-artisti', title: 'Covid 19 – Sostegno artisti e lavoratori dello spettacolo', template_type: 'institutional' },

  // UTILIZZATORI
  { category: 'utilizzatori', slug: 'tariffe-diritti-connessi-video', title: 'Tariffe diritti connessi video', template_type: 'document_list' },
  { category: 'utilizzatori', slug: 'elenco-opere-video-interpretate', title: 'Elenco opere video interpretate da artisti RASI', template_type: 'document_list' },
  { category: 'utilizzatori', slug: 'contratto-tipo-canale-tv-nazionale', title: 'Contratto tipo Canale Tv Nazionale', template_type: 'document_list' },
  { category: 'utilizzatori', slug: 'contratto-tipo-piattaforme-tv-nazionali', title: 'Contratto tipo Piattaforme Tv Nazionali', template_type: 'document_list' },
  { category: 'utilizzatori', slug: 'tariffe-diritti-connessi-musica', title: 'Tariffe diritti connessi musica', template_type: 'document_list' },
  { category: 'utilizzatori', slug: 'elenco-opere-musicali-interpretate', title: 'Elenco opere musicali interpretate da artisti RASI', template_type: 'document_list' },

  // PROMOZIONE E BANDI CONCLUSI
  { category: 'promozione', slug: 'regolamento-attivita-di-promozione', title: 'Regolamento attività di promozione', template_type: 'institutional' }
];

const sitemapBandi = [
  { slug: 'bando-oltre-i-confini', title: 'Bando "Oltre i Confini"', status: 'closed' },
  { slug: 'bando-tematico-per-la-promozione', title: 'Bando tematico per la PROMOZIONE delle attività professionali', status: 'closed' },
  { slug: 'bando-tematico-buona-la-prima', title: 'Bando tematico "Buona la prima"', status: 'closed' },
  { slug: 'bando-tematico-applausi-su-la-testa', title: 'Bando tematico "Applausi…Su la testa"', status: 'closed' },
  { slug: 'bando-tematico-artisti-in-isolamento', title: 'Bando tematico "Artisti in isolamento"', status: 'closed' },
  { slug: 'bando-larte-del-precario', title: 'Bando tematico "L’arte del precario"', status: 'closed' },
  { slug: 'bando-tematico-live', title: 'Bando tematico "Live"', status: 'closed' },
  { slug: 'bando-tematico-lultima-guerra', title: 'Bando tematico "L’ultima guerra"', status: 'closed' },
  { slug: 'bando-larte-nellera-della-rivoluzione-ia', title: 'Bando tematico "L’arte nell’era della rivoluzione I. A."', status: 'closed' },
];

async function seedFull() {
  console.log("Inizio il popolamento COMPLETO del CMS dalla sitemap...");

  // 1. Inserimento Pagine
  const pagesToInsert = sitemapPages.map(p => ({
    ...p,
    content: `<p>Contenuto in fase di migrazione dal vecchio sito per la pagina <strong>${p.title}</strong>.</p>`,
    is_published: false // Le impostiamo come bozze finché la redazione non inserisce i testi reali
  }));

  const { error: pageError } = await supabase.from('pages').upsert(pagesToInsert, { onConflict: 'category,slug' });
  
  if (pageError) {
    console.error("Errore inserimento pagine:", pageError.message);
  } else {
    console.log(`✅ Inserite ${pagesToInsert.length} pagine istituzionali/servizi/norme in stato di "Bozza".`);
  }

  // 2. Inserimento Bandi/News
  const bandiToInsert = sitemapBandi.map(b => ({
    ...b,
    content: `<p>Archivio bando concluso: <strong>${b.title}</strong>.</p>`,
    published_at: new Date().toISOString()
  }));

  const { error: newsError } = await supabase.from('bandi_news').upsert(bandiToInsert, { onConflict: 'slug' });

  if (newsError) {
    console.error("Errore inserimento bandi:", newsError.message);
  } else {
    console.log(`✅ Inseriti ${bandiToInsert.length} bandi nello storico.`);
  }

  console.log("Popolamento completo terminato con successo! 🎉");
}

seedFull();