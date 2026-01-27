#!/usr/bin/env node
/**
 * Script per eseguire la migration: Aggiunta campo imdb_tconst alla tabella episodi
 * 
 * Questo script richiede che tu abbia le variabili d'ambiente configurate:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (necessaria per eseguire DDL)
 * 
 * IMPORTANTE: Supabase JS client non supporta direttamente l'esecuzione di SQL DDL.
 * Questo script mostra le istruzioni SQL che devi eseguire manualmente.
 * 
 * Per eseguire realmente la migration, usa uno di questi metodi:
 * 1. Supabase Dashboard > SQL Editor (RACCOMANDATO)
 * 2. psql con connection string diretta
 * 3. Supabase CLI
 */

const fs = require('fs')
const path = require('path')

const migrationFile = path.join(__dirname, '../db/init/04_add_imdb_tconst_to_episodi.sql')

console.log('🔍 Verifica Migration: Aggiunta imdb_tconst a episodi\n')

if (!fs.existsSync(migrationFile)) {
  console.error('❌ File migration non trovato:', migrationFile)
  process.exit(1)
}

const migrationSQL = fs.readFileSync(migrationFile, 'utf8')

console.log('📄 SQL Migration da eseguire:\n')
console.log('─'.repeat(80))
console.log(migrationSQL)
console.log('─'.repeat(80))
console.log('\n')

console.log('📋 ISTRUZIONI:\n')
console.log('1. Vai su https://supabase.com/dashboard')
console.log('2. Seleziona il tuo progetto')
console.log('3. Apri SQL Editor')
console.log('4. Copia e incolla lo SQL sopra')
console.log('5. Clicca "Run" o premi Ctrl+Enter\n')

console.log('✅ La migration è sicura da eseguire (usa IF NOT EXISTS)')
console.log('✅ Può essere eseguita più volte senza problemi')
console.log('✅ Non distrugge dati esistenti\n')

// Prova a verificare se le variabili d'ambiente sono configurate
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (supabaseUrl && supabaseKey) {
  console.log('ℹ️  Variabili d\'ambiente trovate, ma non posso eseguire DDL via API.')
  console.log('   Esegui la migration manualmente usando le istruzioni sopra.\n')
} else {
  console.log('ℹ️  Variabili SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY non trovate.')
  console.log('   Aggiungile al tuo .env se vuoi automatizzare altre operazioni.\n')
}

process.exit(0)











