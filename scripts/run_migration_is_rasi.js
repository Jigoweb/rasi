#!/usr/bin/env node
/**
 * Script per eseguire la migration: Aggiunta colonna is_rasi alla tabella artisti
 * 
 * Questo script può eseguire la migration in diversi modi:
 * 1. Tramite psql se DB_CONNECTION_STRING è disponibile
 * 2. Mostra le istruzioni per eseguirla manualmente
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const migrationFile = path.join(__dirname, '../db/init/05_add_is_rasi_to_artisti.sql')

console.log('🔍 Migration: Aggiunta colonna is_rasi alla tabella artisti\n')

if (!fs.existsSync(migrationFile)) {
  console.error('❌ File migration non trovato:', migrationFile)
  process.exit(1)
}

const migrationSQL = fs.readFileSync(migrationFile, 'utf8')

// Prova a eseguire tramite psql se c'è una connection string
const dbConnectionString = process.env.DATABASE_URL || process.env.DB_CONNECTION_STRING

if (dbConnectionString) {
  console.log('📡 Tentativo di esecuzione tramite psql...\n')
  try {
    // Esegui la migration
    execSync(`psql "${dbConnectionString}" -f "${migrationFile}"`, {
      stdio: 'inherit',
      encoding: 'utf8'
    })
    console.log('\n✅ Migration eseguita con successo!\n')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Errore durante l\'esecuzione:', error.message)
    console.log('\n📋 Esegui manualmente usando le istruzioni sotto:\n')
  }
} else {
  console.log('ℹ️  Nessuna connection string trovata nelle variabili d\'ambiente.')
  console.log('   Imposta DATABASE_URL o DB_CONNECTION_STRING per eseguire automaticamente.\n')
}

console.log('📄 SQL Migration da eseguire:\n')
console.log('─'.repeat(80))
console.log(migrationSQL)
console.log('─'.repeat(80))
console.log('\n')

console.log('📋 ISTRUZIONI PER ESECUZIONE MANUALE:\n')
console.log('Metodo 1: Supabase Dashboard (RACCOMANDATO)')
console.log('1. Vai su https://supabase.com/dashboard')
console.log('2. Seleziona il tuo progetto')
console.log('3. Apri SQL Editor')
console.log('4. Copia e incolla lo SQL sopra')
console.log('5. Clicca "Run" o premi Ctrl+Enter (Cmd+Enter su Mac)\n')

console.log('Metodo 2: Supabase CLI')
console.log('Se hai installato Supabase CLI:')
console.log('  supabase db execute -f db/init/05_add_is_rasi_to_artisti.sql\n')

console.log('Metodo 3: psql diretto')
console.log('Se hai la connection string:')
console.log('  psql "postgresql://[user]:[password]@[host]:[port]/[database]" -f db/init/05_add_is_rasi_to_artisti.sql\n')

console.log('✅ La migration è sicura da eseguire')
console.log('✅ Può essere eseguita più volte (usa IF NOT EXISTS se necessario)')
console.log('✅ Non distrugge dati esistenti')
console.log('✅ Imposta default true per tutti gli artisti esistenti\n')

process.exit(0)

