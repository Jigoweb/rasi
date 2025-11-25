const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load configuration from .env.local
console.log('--- Configuration Check ---');
const envPath = path.resolve(__dirname, '../.env.local');
let env = {};

try {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"]|['"]$/g, '');
        env[key] = value;
      }
    });
    console.log('✓ .env.local file found and loaded.');
  } else {
    console.error('✗ .env.local file NOT found at:', envPath);
    process.exit(1);
  }
} catch (err) {
  console.error('✗ Error reading .env.local:', err.message);
  process.exit(1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL is missing in .env.local');
  process.exit(1);
} else {
    console.log(`✓ Supabase URL configured: ${supabaseUrl}`);
}

if (!supabaseKey) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local');
  process.exit(1);
} else {
    console.log('✓ Supabase Anon Key configured (hidden)');
}

// 2. Initialize Supabase Client
console.log('\n--- Connection Test ---');
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  const start = Date.now();
  
  try {
    // Attempt a simple query: count rows in 'artisti' table
    // Using 'head: true' effectively does a COUNT(*) without fetching data
    const { count, error } = await supabase
      .from('artisti')
      .select('*', { count: 'exact', head: true });

    const latency = Date.now() - start;

    if (error) {
      console.error('✗ Connection Failed!');
      console.error('  Error Details:', error.message);
      if (error.code) console.error('  Error Code:', error.code);
      // Check for common connection issues
      if (error.message.includes('fetch failed')) {
          console.error('  Hint: Check your internet connection or if the Supabase project is paused.');
      }
    } else {
      console.log('✓ Connection Successful!');
      console.log(`  Latency: ${latency}ms`);
      console.log(`  Table 'artisti' accessible. Row count: ${count}`);
    }

  } catch (err) {
    console.error('✗ Unexpected Error:', err.message);
  }
}

testConnection();
