'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/shared/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Music, Lock, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function ImpostaPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Verifica che ci sia una sessione attiva (invite accettato)
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Nessuna sessione: l'utente ha aperto direttamente questa pagina
        router.replace('/auth')
        return
      }
      setEmail(session.user.email ?? null)
      setSessionLoading(false)
    }
    checkSession()
  }, [router])

  const passwordStrength = (): { label: string; color: string; score: number } => {
    if (!password) return { label: '', color: '', score: 0 }
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    if (score <= 1) return { label: 'Debole', color: 'bg-red-500', score }
    if (score <= 3) return { label: 'Media', color: 'bg-yellow-500', score }
    return { label: 'Forte', color: 'bg-green-500', score }
  }

  const strength = passwordStrength()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.')
      return
    }
    if (password !== confirmPassword) {
      setError('Le due password non coincidono.')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError

      setSuccess(true)
      // Dopo 2 secondi reindirizza al profilo artista
      setTimeout(() => router.replace('/dashboard/profilo'), 2000)
    } catch (err: any) {
      setError(err.message ?? 'Errore durante il salvataggio della password.')
    } finally {
      setLoading(false)
    }
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          {/* Logo RASI */}
          <div className="flex items-center justify-center mb-2">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Music className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Benvenuto in RASI
          </CardTitle>
          <CardDescription className="text-center">
            {email && (
              <span className="block text-sm text-gray-500 mt-1">
                Account: <strong>{email}</strong>
              </span>
            )}
            Scegli una password per completare la configurazione del tuo account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
              <CheckCircle2 className="h-14 w-14 text-green-500" />
              <p className="text-lg font-semibold text-gray-900">Account configurato!</p>
              <p className="text-sm text-gray-500">
                Stai per essere reindirizzato alla tua area personale…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Nuova password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="Almeno 8 caratteri"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {/* Indicatore forza password */}
                {password && (
                  <div className="space-y-1">
                    <div className="flex gap-1 h-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-colors ${
                            i <= strength.score ? strength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Sicurezza: <span className="font-medium">{strength.label}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Conferma password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={`pl-10 pr-10 ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-red-400 focus-visible:ring-red-400'
                        : ''
                    }`}
                    placeholder="Ripeti la password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-500">Le password non coincidono</p>
                )}
              </div>

              {/* Errore */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !password || !confirmPassword}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvataggio…</>
                ) : (
                  <><Lock className="h-4 w-4 mr-2" />Imposta Password e Accedi</>
                )}
              </Button>

              <p className="text-xs text-gray-400 text-center">
                Utilizzando RASI accetti i termini di utilizzo della piattaforma.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
