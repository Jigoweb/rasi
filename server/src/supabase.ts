import { createClient } from '@supabase/supabase-js'
import type { WebSocketLikeConstructor } from '@supabase/realtime-js'
import WebSocket from 'ws'
import { config } from './config.js'

const wsTransport = WebSocket as unknown as WebSocketLikeConstructor

/**
 * Client service-role: bypassa RLS, usato per tutte le operazioni server-side
 * (RPC di matching, lettura programmazioni, scrittura job). È l'equivalente di
 * `supabaseServer` nel progetto Next.js.
 *
 * Volutamente non tipizzato col tipo `Database`: il worker chiama RPC e una
 * tabella (`campaign_jobs`) non presente nei tipi generati. Usiamo l'accesso
 * dinamico e teniamo la sicurezza dei tipi ai confini (i payload delle route).
 */
export const supabaseService = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' },
    global: { headers: { 'x-client-info': 'rasi-worker' } },
    realtime: { transport: wsTransport },
  }
)

/**
 * Client anon usato SOLO per verificare il JWT di un utente (auth.getUser).
 * Non esegue query sul DB.
 */
const supabaseAnon = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: wsTransport },
})

/**
 * Verifica un access token Supabase e ritorna l'id utente, oppure null.
 */
export async function verifyToken(token: string): Promise<string | null> {
  const {
    data: { user },
  } = await supabaseAnon.auth.getUser(token)
  return user?.id ?? null
}
