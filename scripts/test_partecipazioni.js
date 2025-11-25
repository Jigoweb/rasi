
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPartecipazioni() {
    console.log('Testing connection to "partecipazioni" table...');
    console.log(`URL: ${supabaseUrl}`);
    
    const startTime = Date.now();
    
    // Try to count all rows (will be filtered by RLS)
    const { count, data, error } = await supabase
        .from('partecipazioni')
        .select('*', { count: 'exact', head: false })
        .limit(5);

    const endTime = Date.now();
    console.log(`Latency: ${endTime - startTime}ms`);

    if (error) {
        console.error('Error accessing "partecipazioni":', error);
    } else {
        console.log(`Success! Found ${count} visible rows in "partecipazioni".`);
        if (count === 0) {
            console.log('WARNING: 0 rows found. This is likely due to RLS policies.');
            console.log('Current RLS policy for "partecipazioni" allows anon/readonly users to see ONLY rows where stato_validazione = "validato".');
        } else {
            console.log('Sample data:', data);
        }
    }
}

testPartecipazioni();
