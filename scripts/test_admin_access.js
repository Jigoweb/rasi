
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
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials (URL or Service Role Key) in .env.local');
    process.exit(1);
}

// Initialize Supabase client with Service Role Key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testAdminAccess() {
    console.log('Testing ADMIN access (Service Role) to database...');
    console.log(`URL: ${supabaseUrl}`);
    
    // 1. Test Partecipazioni (previously hidden)
    console.log('\n--- Testing "partecipazioni" table access ---');
    const startPart = Date.now();
    const { count: partCount, data: partData, error: partError } = await supabase
        .from('partecipazioni')
        .select('*', { count: 'exact', head: false })
        .limit(5);
    
    if (partError) {
        console.error('Error accessing "partecipazioni":', partError.message);
    } else {
        console.log(`Success! Found ${partCount} total rows in "partecipazioni".`);
        if (partData.length > 0) {
            console.log('Sample row:', JSON.stringify(partData[0], null, 2));
        } else {
            console.log('Table is empty (but accessible).');
        }
    }

    // 2. Test Artisti (just to be sure)
    console.log('\n--- Testing "artisti" table access ---');
    const { count: artCount, error: artError } = await supabase
        .from('artisti')
        .select('*', { count: 'exact', head: true });
        
    if (artError) {
        console.error('Error accessing "artisti":', artError.message);
    } else {
        console.log(`Success! Found ${artCount} artists.`);
    }
    
    console.log(`\nTotal Latency: ${Date.now() - startPart}ms`);
}

testAdminAccess();
