const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  console.log("Adding is_published to bandi_news and documents...");

  const { error: err1 } = await supabase.rpc('exec_sql', {
    query: `
      ALTER TABLE public.bandi_news ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
      ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
    `
  });
  console.log("RPC Error:", err1);

  // If rpc doesn't work (which is common if we haven't defined exec_sql), we can just use the Postgres function or we do it via psql if we can.
  // Wait, Supabase client doesn't support raw SQL queries out of the box unless we use an RPC.
  // Let's check if there's a better way. If not, I can just create the RPC function using the postgres client or we can just assume it's easier to create the RPC or run it via psql.
}

runMigration();