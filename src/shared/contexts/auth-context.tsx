'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/shared/lib/supabase-client'
import { useRouter } from 'next/navigation'
import {
  type UserRole,
  resolveUserRole,
  getRolePermissions,
} from '@/shared/lib/auth-permissions'

export type { UserRole }

// I ruoli disponibili nell'applicazione con le relative etichette
export const AVAILABLE_ROLES: { value: UserRole; label: string; description: string; color: string }[] = [
  { value: 'admin', label: 'Amministratore', description: 'Accesso completo a tutte le funzionalità', color: 'blue' },
  { value: 'operatore', label: 'Operatore', description: 'Gestione artisti, opere e individuazioni', color: 'purple' },
  { value: 'collecting', label: 'Collecting', description: 'Accesso alle funzionalità di collecting', color: 'green' },
  { value: 'artista', label: 'Artista', description: 'Accesso al proprio profilo e repertorio', color: 'orange' },
]

interface AuthContextType {
  user: User | null
  loading: boolean
  userRole: UserRole
  artistaId: string | null
  isAdmin: boolean
  isOperatore: boolean
  isArtista: boolean
  canManageUsers: boolean // admin o operatore possono vedere utenti
  canEditRoles: boolean   // admin e operatore possono modificare ruoli (con limiti API/UI)
  signOut: () => Promise<void>
}

const defaultPermissions = getRolePermissions('collecting')

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userRole: 'collecting',
  artistaId: null,
  ...defaultPermissions,
  signOut: async () => {}
})

/**
 * Estrae il ruolo dall'utente Supabase.
 * Il ruolo è memorizzato in raw_user_meta_data.ruolo
 */
function getUserRole(user: User | null): UserRole {
  return resolveUserRole(user?.user_metadata?.ruolo)
}

/**
 * Estrae l'artista_id dall'utente Supabase.
 * L'artista_id è memorizzato in raw_user_meta_data.artista_id
 */
function getUserArtistaId(user: User | null): string | null {
  return user?.user_metadata?.artista_id || null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const userRole = useMemo(() => getUserRole(user), [user])
  const artistaId = useMemo(() => getUserArtistaId(user), [user])
  const permissions = useMemo(() => getRolePermissions(userRole), [userRole])
  const { isAdmin, isOperatore, isArtista, canManageUsers, canEditRoles } = permissions

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user || null)
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [router])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <AuthContext.Provider value={{ user, loading, userRole, artistaId, isAdmin, isOperatore, isArtista, canManageUsers, canEditRoles, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
