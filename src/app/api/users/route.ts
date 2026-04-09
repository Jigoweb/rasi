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
 * Lista tutti gli utenti (admin e operatori)
 */
export async function GET(req: NextRequest) {
  try {
    const { error } = await verifyAdminUser(req)

    if (error) {
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
      // Un utente si considera "verificato" solo se ha effettivamente
      // accettato l'invito/confermato la mail (last_sign_in_at presente),
      // oppure se non è un invitato (nessun invited_at).
      const isPendingInvite = !!u.invited_at && !u.last_sign_in_at
      return {
        id: u.id,
        email: u.email,
        ruolo,
        artista_id: u.user_metadata?.artista_id || null,
        email_verified: u.email_confirmed_at !== null && !isPendingInvite,
        invited_at: u.invited_at || null,
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
 * POST /api/users
 * Invita un artista via email, collegandolo a un record artisti esistente
 * Body: { email: string, artista_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { isAdmin, userId: requestingUserId, error } = await verifyAdminUser(req)

    // verifyAdminUser restituisce error solo se non è admin/operatore
    // isAdmin=false + no error = è un operatore (canManageUsers=true)
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 403 })
    }

    const body = await req.json()
    const { email, artista_id, action, userId: targetUserId } = body

    // Reinvio invito
    if (action === 'resend_invite') {
      if (!targetUserId) {
        return NextResponse.json({ success: false, error: 'userId è obbligatorio per reinvio' }, { status: 400 })
      }
      const adminClient = getSupabaseAdmin()
      const { data: { user: targetUser }, error: getUserError } = await adminClient.auth.admin.getUserById(targetUserId)
      if (getUserError || !targetUser) {
        return NextResponse.json({ success: false, error: 'Utente non trovato' }, { status: 404 })
      }
      if (!targetUser.email) {
        return NextResponse.json({ success: false, error: 'Utente senza email' }, { status: 400 })
      }
      // generateLink con tipo invite per reinviare
      const { error: linkError } = await adminClient.auth.admin.inviteUserByEmail(
        targetUser.email,
        {
          data: targetUser.user_metadata,
          redirectTo: `${req.headers.get('origin') || 'http://localhost:3000'}/auth/callback`
        }
      )
      if (linkError) {
        return NextResponse.json({ success: false, error: linkError.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    if (!email || !artista_id) {
      return NextResponse.json(
        { success: false, error: 'email e artista_id sono obbligatori' },
        { status: 400 }
      )
    }

    const adminClient = getSupabaseAdmin()

    // Verifica che l'artista_id esista nella tabella artisti
    const { data: artista, error: artistaError } = await adminClient
      .from('artisti')
      .select('id, nome, cognome, codice_ipn')
      .eq('id', artista_id)
      .single()

    if (artistaError || !artista) {
      return NextResponse.json(
        { success: false, error: 'Record artista non trovato' },
        { status: 404 }
      )
    }

    // Verifica che nessun altro utente abbia già questo artista_id
    const { data: { users: existingUsers } } = await adminClient.auth.admin.listUsers()
    const alreadyLinked = existingUsers.find(
      u => u.user_metadata?.artista_id === artista_id
    )

    if (alreadyLinked) {
      return NextResponse.json(
        { success: false, error: `Questo artista è già collegato all'utente ${alreadyLinked.email}` },
        { status: 409 }
      )
    }

    // Verifica che l'email non sia già registrata
    const existingEmail = existingUsers.find(u => u.email === email)
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: `L'email ${email} è già registrata nel sistema` },
        { status: 409 }
      )
    }

    // Invia invito via Supabase Auth
    const { data: invitedUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          ruolo: 'artista',
          artista_id: artista_id
        },
        redirectTo: `${req.headers.get('origin') || 'http://localhost:3000'}/auth/callback`
      }
    )

    if (inviteError) {
      console.error('Errore inviteUserByEmail:', inviteError)
      return NextResponse.json({ success: false, error: inviteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invitedUser.user.id,
        email: invitedUser.user.email,
        ruolo: 'artista',
        artista_id,
        artista_nome: `${artista.nome} ${artista.cognome}`,
      }
    })

  } catch (error: any) {
    console.error('Errore inatteso POST /api/users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/users
 * Aggiorna ruolo o email di un utente.
 * - Cambio ruolo: solo admin
 * - Cambio email: admin e operatori
 * Body: { userId: string, ruolo?: string, email?: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const { isAdmin, userId: adminUserId, error } = await verifyAdminUser(req)

    // Blocca utenti senza permessi (non admin/operatore)
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 403 })
    }

    const body = await req.json()
    const { userId, ruolo, email } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId è obbligatorio' },
        { status: 400 }
      )
    }

    if (!ruolo && !email) {
      return NextResponse.json(
        { success: false, error: 'Specificare almeno ruolo o email da aggiornare' },
        { status: 400 }
      )
    }

    // Il cambio ruolo è riservato agli admin
    if (ruolo && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Solo gli amministratori possono modificare i ruoli degli utenti'
      }, { status: 403 })
    }

    if (ruolo) {
      const validRoles = ['admin', 'operatore', 'collecting', 'artista']
      if (!validRoles.includes(ruolo)) {
        return NextResponse.json(
          { success: false, error: `Ruolo non valido. Ruoli disponibili: ${validRoles.join(', ')}` },
          { status: 400 }
        )
      }
      if (userId === adminUserId && ruolo !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Non puoi rimuovere il tuo stesso ruolo di amministratore' },
          { status: 400 }
        )
      }
    }

    const adminClient = getSupabaseAdmin()
    const updates: Record<string, unknown> = {}
    if (ruolo) updates.user_metadata = { ruolo }
    if (email) updates.email = email

    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      updates
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
        ruolo: updatedUser.user.user_metadata?.ruolo || 'artista',
      }
    })

  } catch (error: any) {
    console.error('Errore inatteso PATCH /api/users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/users
 * Elimina un utente (solo admin, non può eliminare se stesso)
 * Body: { userId: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { isAdmin, userId: adminUserId, error } = await verifyAdminUser(req)

    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: error || 'Solo gli amministratori possono eliminare utenti'
      }, { status: 403 })
    }

    const body = await req.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId è obbligatorio' },
        { status: 400 }
      )
    }

    if (userId === adminUserId) {
      return NextResponse.json(
        { success: false, error: 'Non puoi eliminare il tuo stesso account' },
        { status: 400 }
      )
    }

    const adminClient = getSupabaseAdmin()
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Errore deleteUser:', deleteError)
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Errore inatteso DELETE /api/users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

