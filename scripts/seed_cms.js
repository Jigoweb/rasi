const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carica variabili d'ambiente in modo base (assumendo l'uso di .env.local)
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
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

async function seed() {
  console.log("Inizio il popolamento del CMS...");

  // Pagine
  const { error: pageError } = await supabase.from('pages').upsert([
    {
      category: 'chi-siamo',
      slug: 'statuto',
      title: 'Statuto R.A.S.I.',
      template_type: 'institutional',
      content: '<p>Il presente statuto regola le attività della Rete Artisti Spettacolo per l\'Innovazione...</p><p>Articolo 1: Denominazione e Sede...</p>',
      is_published: true
    },
    {
      category: 'servizi',
      slug: 'award-system',
      title: 'Award System',
      template_type: 'service',
      content: '<p>L\'Award System è il nostro database informatico proprietario, regolarmente aggiornato, che ci permette di incrociare le opere con i titolari dei diritti connessi in modo trasparente e veloce.</p><ul><li>Massima trasparenza</li><li>Pagamenti trimestrali</li><li>Ricerca avanzata</li></ul>',
      is_published: true
    }
  ], { onConflict: 'category,slug' });

  if (pageError) console.error("Errore inserimento pagine:", pageError.message);
  else console.log("✅ Pagine inserite.");

  // Bandi
  const { error: newsError } = await supabase.from('bandi_news').upsert([
    {
      slug: 'bando-rasi-2025',
      title: 'BANDO R.A.S.I. 2025',
      status: 'closed',
      content: '<p>Il bando tematico per sostenere la produzione artistica e i nuovi progetti teatrali o musicali.</p>',
      published_at: new Date().toISOString()
    }
  ], { onConflict: 'slug' });

  if (newsError) console.error("Errore inserimento news:", newsError.message);
  else console.log("✅ News inserite.");

  console.log("Seed completato!");
}

seed();