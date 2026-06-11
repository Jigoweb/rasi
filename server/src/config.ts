/**
 * Configurazione centralizzata letta dalle variabili d'ambiente.
 * Fallisce subito (fail-fast) se manca una variabile critica, così un
 * deploy mal configurato si nota all'avvio invece che alla prima richiesta.
 */
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
