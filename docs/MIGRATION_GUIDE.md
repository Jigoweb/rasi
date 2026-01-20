# Guida all'esecuzione delle Migration SQL

## Migration: Aggiunta campo imdb_tconst alla tabella episodi

### Metodo 1: Supabase Dashboard (Raccomandato)

1. Accedi al tuo progetto Supabase: https://supabase.com/dashboard
2. Seleziona il tuo progetto
3. Vai su **SQL Editor** nel menu laterale
4. Clicca su **New query**
5. Copia e incolla il contenuto del file `db/init/04_add_imdb_tconst_to_episodi.sql`
6. Clicca su **Run** o premi `Ctrl+Enter` (o `Cmd+Enter` su Mac)

### Metodo 2: Supabase CLI

Se hai installato il Supabase CLI:

```bash
# Assicurati di essere nella directory del progetto
cd /path/to/rasi

# Esegui la migration
supabase db push

# Oppure esegui direttamente lo script SQL
supabase db execute -f db/init/04_add_imdb_tconst_to_episodi.sql
```

**Nota**: Se usi Supabase CLI, potresti voler spostare la migration nella cartella `supabase/migrations/` con un nome timestamp:

```bash
# Crea il file migration con timestamp
cp db/init/04_add_imdb_tconst_to_episodi.sql supabase/migrations/$(date +%Y%m%d%H%M%S)_add_imdb_tconst_to_episodi.sql
```

### Metodo 3: psql (Connection String diretta)

Se hai accesso diretto al database PostgreSQL:

```bash
# Esegui lo script SQL
psql "postgresql://[user]:[password]@[host]:[port]/[database]" -f db/init/04_add_imdb_tconst_to_episodi.sql
```

**Per Supabase**, la connection string è nella sezione **Settings > Database > Connection string** del dashboard.

### Metodo 4: Node.js Script (Programmatico)

Puoi creare uno script Node.js per eseguire la migration:

```javascript
// scripts/run_migration.js
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devono essere impostati')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  const migrationSql = fs.readFileSync(
    path.join(__dirname, '../db/init/04_add_imdb_tconst_to_episodi.sql'),
    'utf8'
  )

  // Esegui la migration usando RPC o direttamente
  // Nota: Supabase JS client non supporta direttamente l'esecuzione di SQL arbitrario
  // Questo metodo richiede l'uso del service role key e potrebbe non funzionare
  // È meglio usare uno dei metodi sopra
  
  console.log('Migration SQL:')
  console.log(migrationSql)
  console.log('\n⚠️  Esegui questa query nel Supabase SQL Editor')
}

runMigration().catch(console.error)
```

### Verifica dell'esecuzione

Dopo aver eseguito la migration, verifica che sia stata applicata correttamente:

```sql
-- Verifica che la colonna esista
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'episodi' AND column_name = 'imdb_tconst';

-- Verifica che l'indice sia stato creato
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'episodi' AND indexname = 'idx_episodi_imdb_tconst';

-- Verifica che eventuali dati siano stati migrati da metadati
SELECT COUNT(*) as episodi_con_tconst
FROM episodi
WHERE imdb_tconst IS NOT NULL;
```

### Rollback (se necessario)

Se hai bisogno di rimuovere la migration:

```sql
-- Rimuovi l'indice
DROP INDEX IF EXISTS idx_episodi_imdb_tconst;

-- Migra i dati indietro in metadati (opzionale)
UPDATE episodi
SET metadati = COALESCE(metadati, '{}'::jsonb) || jsonb_build_object('imdb_tconst', imdb_tconst)
WHERE imdb_tconst IS NOT NULL;

-- Rimuovi la colonna
ALTER TABLE episodi DROP COLUMN IF EXISTS imdb_tconst;
```

## Contenuto della Migration

La migration esegue le seguenti operazioni:

1. ✅ Aggiunge la colonna `imdb_tconst VARCHAR(15)` alla tabella `episodi`
2. ✅ Crea un indice parziale per migliorare le performance delle query
3. ✅ Migra automaticamente eventuali `imdb_tconst` già presenti in `metadati` alla nuova colonna
4. ✅ Aggiunge un commento descrittivo alla colonna

## Note importanti

- La migration usa `IF NOT EXISTS` quindi può essere eseguita più volte senza errori
- La migration è **non distruttiva**: non rimuove dati esistenti
- Gli episodi esistenti con `imdb_tconst` in `metadati` verranno automaticamente migrati
- La colonna è nullable, quindi gli episodi senza `imdb_tconst` continueranno a funzionare normalmente






