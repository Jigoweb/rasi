import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Configurazione centralizzata letta dalle variabili d'ambiente.
 * Fallisce subito (fail-fast) se manca una variabile critica, così un
 * deploy mal configurato si nota all'avvio invece che alla prima richiesta.
 */
function loadLocalEnvFallback() {
  const currentDir = dirname(fileURLToPath(import.meta.url))
  const envPath = resolve(currentDir, '../.env')

  if (!existsSync(envPath)) return

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    const unquotedValue =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue

    if (!process.env[key]) {
      process.env[key] = unquotedValue
    }
  }
}

loadLocalEnvFallback()

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variabile d'ambiente mancante: ${name}`)
  }
  return value
}

export const config = {
  port: Number(process.env.PORT) || 8080,

  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),

  // Domini frontend autorizzati (CORS). Vuoto = consenti tutto (solo per dev).
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  chunkSize: Number(process.env.CHUNK_SIZE) || 500,
}
