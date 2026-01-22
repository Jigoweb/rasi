import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization of admin client
let supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Configurazione mancante: assicurati che NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY siano definiti in .env.local'
    )
  }

  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  return supabaseAdmin
}

// Helper to verify the requesting user is an admin
async function verifyAdminUser(req: NextRequest): Promise<{ isAdmin: boolean; userId?: string; error?: string }> {
  const authHeader = req.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { isAdmin: false, error: 'Token di autorizzazione mancante' }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return { isAdmin: false, error: 'Configurazione Supabase mancante' }
  }

  const token = authHeader.substring(7)
  const tempClient = createClient(supabaseUrl, anonKey)
  
  const { data: { user }, error } = await tempClient.auth.getUser(token)
  
  if (error || !user) {
    return { isAdmin: false, error: 'Token non valido o utente non trovato' }
  }

  const userRole = user.user_metadata?.ruolo
  const canManageUsers = userRole === 'admin' || userRole === 'operatore'
  
  if (!canManageUsers) {
    return { isAdmin: false, userId: user.id, error: 'Accesso negato: solo amministratori e operatori possono gestire gli utenti' }
  }

  return { isAdmin: userRole === 'admin', userId: user.id }
}

/**
 * GET /api/users
 * Lista tutti gli utenti (solo admin)
 */
export async function GET(req: NextRequest) {
  try {
    const { isAdmin, error } = await verifyAdminUser(req)
    
    if (!isAdmin) {
      return NextResponse.json({ success: false, error }, { status: 403 })
    }

    // Use admin API to list all users
    const adminClient = getSupabaseAdmin()
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers()

    if (listError) {
      console.error('Errore listUsers:', listError)
      return NextResponse.json({ success: false, error: listError.message }, { status: 500 })
    }

    // Map users to a cleaner format
    // Ruoli validi: admin, operatore, collecting, artista
    const validRoles = ['admin', 'operatore', 'collecting', 'artista']
    const mappedUsers = users.map(u => {
      let ruolo = u.user_metadata?.ruolo
      // Mappa ruoli vecchi o mancanti a 'artista' (default)
      if (!ruolo || !validRoles.includes(ruolo)) {
        ruolo = 'artista'
      }
      return {
        id: u.id,
        email: u.email,
        ruolo,
        email_verified: u.email_confirmed_at !== null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }
    })

    return NextResponse.json({ 
      success: true, 
      data: mappedUsers 
    })

  } catch (error: any) {
    console.error('Errore inatteso GET /api/users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/users
 * Aggiorna il ruolo di un utente (solo admin)
 * Body: { userId: string, ruolo: 'admin' | 'operatore' | 'utente' }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { isAdmin, userId: adminUserId, error } = await verifyAdminUser(req)
    
    // Solo gli admin possono modificare i ruoli
    if (!isAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: error || 'Solo gli amministratori possono modificare i ruoli degli utenti' 
      }, { status: 403 })
    }

    const body = await req.json()
    const { userId, ruolo } = body

    if (!userId || !ruolo) {
      return NextResponse.json(
        { success: false, error: 'userId e ruolo sono obbligatori' },
        { status: 400 }
      )
    }

    // Validate ruolo
    const validRoles = ['admin', 'operatore', 'collecting', 'artista']
    if (!validRoles.includes(ruolo)) {
      return NextResponse.json(
        { success: false, error: `Ruolo non valido. Ruoli disponibili: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Prevent admin from removing their own admin role
    if (userId === adminUserId && ruolo !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Non puoi rimuovere il tuo stesso ruolo di amministratore' },
        { status: 400 }
      )
    }

    // Update user metadata with the new role
    const adminClient = getSupabaseAdmin()
    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { user_metadata: { ruolo } }
    )

    if (updateError) {
      console.error('Errore updateUserById:', updateError)
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.user.id,
        email: updatedUser.user.email,
        ruolo: updatedUser.user.user_metadata?.ruolo || 'utente',
      }
    })

  } catch (error: any) {
    console.error('Errore inatteso PATCH /api/users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

