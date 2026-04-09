'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth, AVAILABLE_ROLES, UserRole } from '@/shared/contexts/auth-context'
import { supabase } from '@/shared/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  Users,
  Shield,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Calendar,
  Clock,
  Search,
  X,
  UserCog,
  Building2,
  Music2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  AlertTriangle
} from 'lucide-react'

interface UserData {
  id: string
  email: string
  ruolo: UserRole
  artista_id: string | null
  email_verified: boolean
  invited_at: string | null
  created_at: string
  last_sign_in_at: string | null
}

export default function UtentiPage() {
  const { user, canManageUsers, canEditRoles, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtri
  const [searchEmail, setSearchEmail] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  
  // State for role change dialog
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [newRole, setNewRole] = useState<UserRole>('artista')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)

  // State for invite dialog
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteArtistaSearch, setInviteArtistaSearch] = useState('')
  const [inviteArtistaResults, setInviteArtistaResults] = useState<any[]>([])
  const [selectedArtista, setSelectedArtista] = useState<any>(null)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [searchingArtisti, setSearchingArtisti] = useState(false)

  // State for change email dialog
  const [changeEmailDialogOpen, setChangeEmailDialogOpen] = useState(false)
  const [changeEmailTarget, setChangeEmailTarget] = useState<UserData | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [changingEmail, setChangingEmail] = useState(false)
  const [changeEmailError, setChangeEmailError] = useState<string | null>(null)
  const [changeEmailSuccess, setChangeEmailSuccess] = useState(false)

  // State for delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Resend invite loading state
  const [resendingInvite, setResendingInvite] = useState<string | null>(null)

  // Redirect users without permission
  useEffect(() => {
    if (!authLoading && !canManageUsers) {
      router.push('/dashboard')
    }
  }, [authLoading, canManageUsers, router])

  // Fetch users on mount
  useEffect(() => {
    if (canManageUsers) {
      fetchUsers()
    }
  }, [canManageUsers])

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesEmail = searchEmail === '' || 
        u.email.toLowerCase().includes(searchEmail.toLowerCase())
      const matchesRole = filterRole === 'all' || u.ruolo === filterRole
      return matchesEmail && matchesRole
    })
  }, [users, searchEmail, filterRole])

  // Stats per ruolo
  const roleStats = useMemo(() => {
    return AVAILABLE_ROLES.map(role => ({
      ...role,
      count: users.filter(u => u.ruolo === role.value).length
    }))
  }, [users])

  async function fetchUsers() {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Sessione scaduta, effettua nuovamente il login')
        return
      }

      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Errore nel recupero utenti')
      }

      setUsers(result.data)
    } catch (err: any) {
      console.error('Error fetching users:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Ricerca artisti per invito — supporta ricerca multi-parola (es. "Matteo Foroni")
  async function searchArtistiForInvite(term: string) {
    if (!term || term.length < 2) {
      setInviteArtistaResults([])
      return
    }
    setSearchingArtisti(true)
    try {
      // Divide il termine in token per gestire "Nome Cognome" con spazi
      const tokens = term.trim().split(/\s+/).filter(t => t.length > 0)

      let query = supabase
        .from('artisti')
        .select('id, nome, cognome, nome_arte, codice_ipn, codice_fiscale, contatti')

      // Per ogni token applica un filtro OR su tutti i campi testuali —
      // i filtri concatenati sono AND tra loro, quindi "Matteo Foroni" richiede
      // che entrambe le parole siano presenti (in campi diversi).
      for (const token of tokens) {
        query = query.or(
          `nome.ilike.%${token}%,cognome.ilike.%${token}%,nome_arte.ilike.%${token}%,codice_ipn.ilike.%${token}%,codice_fiscale.ilike.%${token}%`
        )
      }

      const { data } = await query.order('cognome').limit(20)

      // Filtra artisti già collegati a un utente
      const linkedArtistaIds = new Set(users.filter(u => u.artista_id).map(u => u.artista_id))
      setInviteArtistaResults((data || []).filter((a: any) => !linkedArtistaIds.has(a.id)))
    } catch {
      setInviteArtistaResults([])
    } finally {
      setSearchingArtisti(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail || !selectedArtista) return
    setInviting(true)
    setInviteError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setInviteError('Sessione scaduta')
        return
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          artista_id: selectedArtista.id,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      setInviteSuccess(true)
      fetchUsers()
      setTimeout(() => {
        setInviteDialogOpen(false)
        setInviteSuccess(false)
        setInviteEmail('')
        setSelectedArtista(null)
        setInviteArtistaSearch('')
        setInviteArtistaResults([])
      }, 2000)
    } catch (err: any) {
      setInviteError(err.message)
    } finally {
      setInviting(false)
    }
  }

  async function handleChangeEmail() {
    if (!changeEmailTarget || !newEmail) return
    setChangingEmail(true)
    setChangeEmailError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setChangeEmailError('Sessione scaduta'); return }

      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: changeEmailTarget.id, email: newEmail }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      setUsers(prev => prev.map(u => u.id === changeEmailTarget.id ? { ...u, email: newEmail } : u))
      setChangeEmailSuccess(true)
      setTimeout(() => {
        setChangeEmailDialogOpen(false)
        setChangeEmailSuccess(false)
        setNewEmail('')
        setChangeEmailTarget(null)
      }, 1500)
    } catch (err: any) {
      setChangeEmailError(err.message)
    } finally {
      setChangingEmail(false)
    }
  }

  async function handleResendInvite(userData: UserData) {
    setResendingInvite(userData.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend_invite', userId: userData.id }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResendingInvite(null)
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setDeleteError('Sessione scaduta'); return }

      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteTarget.id }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    } catch (err: any) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  function openRoleDialog(userData: UserData) {
    if (!canEditRoles) return
    setSelectedUser(userData)
    setNewRole(userData.ruolo)
    setUpdateSuccess(false)
    setDialogOpen(true)
  }

  async function handleRoleChange() {
    if (!selectedUser || newRole === selectedUser.ruolo) {
      setDialogOpen(false)
      return
    }

    try {
      setUpdating(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Sessione scaduta')
        return
      }

      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          ruolo: newRole,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Errore nell\'aggiornamento del ruolo')
      }

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === selectedUser.id ? { ...u, ruolo: newRole } : u
      ))
      
      setUpdateSuccess(true)
      setTimeout(() => {
        setDialogOpen(false)
        setUpdateSuccess(false)
      }, 1500)

    } catch (err: any) {
      console.error('Error updating role:', err)
      setError(err.message)
    } finally {
      setUpdating(false)
    }
  }

  function getRoleBadgeClass(ruolo: UserRole): string {
    const role = AVAILABLE_ROLES.find(r => r.value === ruolo)
    switch (role?.color) {
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'green': return 'bg-green-100 text-green-800 border-green-200'
      case 'orange': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  function getRoleIcon(ruolo: UserRole) {
    switch (ruolo) {
      case 'admin': return <Shield className="h-4 w-4" />
      case 'operatore': return <UserCog className="h-4 w-4" />
      case 'collecting': return <Building2 className="h-4 w-4" />
      case 'artista': return <Music2 className="h-4 w-4" />
      default: return <Users className="h-4 w-4" />
    }
  }

  function getRoleLabel(ruolo: UserRole): string {
    return AVAILABLE_ROLES.find(r => r.value === ruolo)?.label || ruolo
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function clearFilters() {
    setSearchEmail('')
    setFilterRole('all')
  }

  const hasActiveFilters = searchEmail !== '' || filterRole !== 'all'

  // Avviso mismatch email: quando l'artista selezionato ha una email nei contatti
  // diversa da quella inserita nel campo invito
  const artistaContactEmail = (selectedArtista?.contatti as any)?.email as string | undefined
  const emailMismatch = !!(selectedArtista && inviteEmail && artistaContactEmail && artistaContactEmail !== inviteEmail)

  // Loading or no permission
  if (authLoading || !canManageUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            Gestione Utenti
          </h1>
          <p className="text-gray-500 mt-1">
            Visualizza {canEditRoles ? 'e gestisci ' : ''}gli account utente e i relativi ruoli
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setInviteDialogOpen(true)
              setInviteError(null)
              setInviteSuccess(false)
              setInviteEmail('')
              setSelectedArtista(null)
              setInviteArtistaSearch('')
              setInviteArtistaResults([])
            }}
            disabled={loading}
          >
            <Mail className="h-4 w-4 mr-2" />
            Invita Artista
          </Button>
          <Button onClick={fetchUsers} variant="outline" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Aggiorna
          </Button>
        </div>
      </div>

      {/* Stats Cards - Grid con tutte le card dei ruoli */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Card Totale */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Totale Utenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        
        {/* Cards per ogni ruolo */}
        {roleStats.map((role) => (
          <Card 
            key={role.value}
            className={`cursor-pointer transition-all hover:shadow-md ${
              filterRole === role.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
            }`}
            onClick={() => setFilterRole(filterRole === role.value ? 'all' : role.value)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                {getRoleIcon(role.value)}
                {role.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                role.color === 'blue' ? 'text-blue-600' :
                role.color === 'purple' ? 'text-purple-600' :
                role.color === 'green' ? 'text-green-600' :
                role.color === 'orange' ? 'text-orange-600' :
                'text-gray-600'
              }`}>
                {role.count}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtri
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Pulisci filtri
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search by email */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cerca per email
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Filter by role */}
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtra per ruolo
              </label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutti i ruoli" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i ruoli</SelectItem>
                  {AVAILABLE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role.value)}
                        {role.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="mt-3 text-sm text-gray-500">
              Mostrati {filteredUsers.length} di {users.length} utenti
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Elenco Utenti</CardTitle>
          <CardDescription>
            {canEditRoles 
              ? 'Clicca su "Modifica Ruolo" per cambiare il ruolo di un utente'
              : 'Visualizzazione in sola lettura - solo gli amministratori possono modificare i ruoli'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {hasActiveFilters 
                ? 'Nessun utente corrisponde ai filtri selezionati'
                : 'Nessun utente trovato'
              }
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Email Verificata</TableHead>
                  <TableHead>Registrazione</TableHead>
                  <TableHead>Ultimo Accesso</TableHead>
                  {canManageUsers && <TableHead className="text-right">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((userData) => (
                  <TableRow 
                    key={userData.id}
                    className={userData.id === user?.id ? 'bg-blue-50' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{userData.email}</span>
                        {userData.id === user?.id && (
                          <Badge variant="outline" className="text-xs">Tu</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getRoleBadgeClass(userData.ruolo)} flex items-center gap-1 w-fit`}>
                          {getRoleIcon(userData.ruolo)}
                          {getRoleLabel(userData.ruolo)}
                        </Badge>
                        {userData.artista_id && (
                          <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                            Collegato
                          </Badge>
                        )}
                        {userData.ruolo === 'artista' && !userData.last_sign_in_at && (
                          <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-200">
                            In attesa
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {userData.email_verified ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Sì
                        </span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        {formatDate(userData.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {formatDate(userData.last_sign_in_at)}
                      </div>
                    </TableCell>
                    {canManageUsers && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={userData.id === user?.id}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEditRoles && (
                              <DropdownMenuItem onClick={() => openRoleDialog(userData)}>
                                <Shield className="h-4 w-4 mr-2" />
                                Modifica Ruolo
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {
                              setChangeEmailTarget(userData)
                              setNewEmail(userData.email)
                              setChangeEmailError(null)
                              setChangeEmailSuccess(false)
                              setChangeEmailDialogOpen(true)
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifica Email
                            </DropdownMenuItem>
                            {userData.ruolo === 'artista' && !userData.last_sign_in_at && (
                              <DropdownMenuItem
                                onClick={() => handleResendInvite(userData)}
                                disabled={resendingInvite === userData.id}
                              >
                                {resendingInvite === userData.id
                                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  : <RefreshCw className="h-4 w-4 mr-2" />
                                }
                                Reinvia Invito
                              </DropdownMenuItem>
                            )}
                            {canEditRoles && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => {
                                    setDeleteTarget(userData)
                                    setDeleteError(null)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Elimina Utente
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Role Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legenda Ruoli</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {AVAILABLE_ROLES.map((role) => (
              <div key={role.value} className="flex flex-col gap-2 p-3 rounded-lg bg-gray-50">
                <Badge className={`${getRoleBadgeClass(role.value)} flex items-center gap-1 w-fit`}>
                  {getRoleIcon(role.value)}
                  {role.label}
                </Badge>
                <p className="text-sm text-gray-600">{role.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Ruolo Utente</DialogTitle>
            <DialogDescription>
              Stai modificando il ruolo per: <strong>{selectedUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>

          {updateSuccess ? (
            <div className="flex items-center justify-center py-8 text-green-600">
              <CheckCircle2 className="h-12 w-12" />
              <span className="ml-3 text-lg font-medium">Ruolo aggiornato con successo!</span>
            </div>
          ) : (
            <>
              <div className="py-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleziona il nuovo ruolo:
                </label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role.value)}
                          <Badge className={`${getRoleBadgeClass(role.value)} text-xs`}>
                            {role.label}
                          </Badge>
                          <span className="text-sm text-gray-500">- {role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={updating}>
                  Annulla
                </Button>
                <Button onClick={handleRoleChange} disabled={updating || newRole === selectedUser?.ruolo}>
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Aggiornamento...
                    </>
                  ) : (
                    'Salva Modifiche'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite Artist Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invita Artista
            </DialogTitle>
            <DialogDescription>
              Invia un invito via email per creare un account artista collegato a un record esistente.
            </DialogDescription>
          </DialogHeader>

          {inviteSuccess ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium">Invito inviato!</p>
              <p className="text-sm text-gray-500 mt-1">L&apos;artista ricevera un&apos;email con il link per completare la registrazione.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    type="email"
                    placeholder="artista@email.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Artista search */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Artista da collegare</label>
                  {selectedArtista ? (
                    <div className="mt-1 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div>
                        <p className="font-medium">{selectedArtista.nome} {selectedArtista.cognome}</p>
                        <p className="text-sm text-gray-500">
                          {selectedArtista.codice_ipn && `IPN: ${selectedArtista.codice_ipn}`}
                          {selectedArtista.nome_arte && ` - ${selectedArtista.nome_arte}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedArtista(null)
                          setInviteArtistaSearch('')
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Cerca per nome, cognome, IPN o CF..."
                          value={inviteArtistaSearch}
                          onChange={e => {
                            setInviteArtistaSearch(e.target.value)
                            searchArtistiForInvite(e.target.value)
                          }}
                          className="pl-9"
                        />
                        {searchingArtisti && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                        )}
                      </div>
                      {inviteArtistaResults.length > 0 && (
                        <div className="mt-1 border rounded-lg max-h-48 overflow-y-auto">
                          {inviteArtistaResults.map((a: any) => (
                            <button
                              key={a.id}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 text-sm"
                              onClick={() => {
                                setSelectedArtista(a)
                                setInviteArtistaSearch('')
                                setInviteArtistaResults([])
                              }}
                            >
                              <span className="font-medium">{a.nome} {a.cognome}</span>
                              {a.nome_arte && <span className="text-gray-500 ml-1">({a.nome_arte})</span>}
                              {a.codice_ipn && <span className="text-gray-400 ml-2">IPN: {a.codice_ipn}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      {inviteArtistaSearch.length >= 2 && !searchingArtisti && inviteArtistaResults.length === 0 && (
                        <p className="text-sm text-gray-500 mt-1">Nessun artista trovato (o gia collegato a un utente).</p>
                      )}
                    </>
                  )}
                </div>

                {emailMismatch && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    L&apos;email inserita è diversa da quella registrata per questo artista ({artistaContactEmail}). Puoi procedere ugualmente se l&apos;artista intende usare un indirizzo diverso.
                  </div>
                )}

                {inviteError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    {inviteError}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)} disabled={inviting}>
                  Annulla
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail || !selectedArtista}
                >
                  {inviting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Invio in corso...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Invia Invito
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Email Dialog */}
      <Dialog open={changeEmailDialogOpen} onOpenChange={setChangeEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Modifica Email
            </DialogTitle>
            <DialogDescription>
              Stai modificando l&apos;email per: <strong>{changeEmailTarget?.email}</strong>
            </DialogDescription>
          </DialogHeader>

          {changeEmailSuccess ? (
            <div className="flex items-center justify-center py-8 text-green-600">
              <CheckCircle2 className="h-12 w-12" />
              <span className="ml-3 text-lg font-medium">Email aggiornata!</span>
            </div>
          ) : (
            <>
              <div className="py-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nuova email
                  </label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="nuova@email.com"
                  />
                </div>
                {changeEmailError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    {changeEmailError}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setChangeEmailDialogOpen(false)} disabled={changingEmail}>
                  Annulla
                </Button>
                <Button
                  onClick={handleChangeEmail}
                  disabled={changingEmail || !newEmail || newEmail === changeEmailTarget?.email}
                >
                  {changingEmail ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Aggiornamento...</>
                  ) : (
                    'Salva Email'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Elimina Utente
            </DialogTitle>
            <DialogDescription>
              Questa operazione è irreversibile. L&apos;account verrà eliminato definitivamente.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800">
                Stai per eliminare l&apos;account di:
              </p>
              <p className="mt-1 font-bold text-red-900">{deleteTarget?.email}</p>
              {deleteTarget?.artista_id && (
                <p className="mt-1 text-xs text-red-700">
                  Questo utente è collegato a un record artista. Il record artista non verrà eliminato.
                </p>
              )}
            </div>
            {deleteError && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                {deleteError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting}
            >
              {deleting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Eliminazione...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" />Elimina Definitivamente</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
