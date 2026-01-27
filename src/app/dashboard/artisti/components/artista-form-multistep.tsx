'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Database } from '@/shared/lib/supabase'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { Badge } from '@/shared/components/ui/badge'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { CountryMultiSelect } from '@/shared/components/ui/country-multi-select'
// Import diritti data - in Next.js, i file JSON in public devono essere caricati a runtime
const loadDirittiData = async () => {
  try {
    const response = await fetch('/diritti-artisti.json')
    return await response.json()
  } catch (error) {
    console.error('Error loading diritti data:', error)
    return { diritti: [], categorie: [] }
  }
}

// Import codici paesi ISO 3166-1 alpha-3
const loadCodiciPaesiData = async () => {
  try {
    const response = await fetch('/codici-paesi-iso3166-alpha3.json')
    return await response.json()
  } catch (error) {
    console.error('Error loading codici paesi data:', error)
    return { paesi: [] }
  }
}

type Artista = Database['public']['Tables']['artisti']['Row']
type ArtistaInsert = Database['public']['Tables']['artisti']['Insert']

interface ArtistaFormMultistepProps {
  mode: 'create' | 'edit'
  artista?: Artista | null
  onSubmit: (data: ArtistaInsert) => Promise<void>
  onCancel: () => void
}

// Schema completo con tutti i campi - allineato con lo schema Supabase
const artistaSchema = z.object({
  // Dati anagrafici base
  codice_ipn: z.string().optional().or(z.literal('')),
  nome: z.string().min(1, 'Nome obbligatorio'),
  cognome: z.string().min(1, 'Cognome obbligatorio'),
  nome_arte: z.string().optional().or(z.literal('')),
  codice_fiscale: z.string().max(16, 'Max 16 caratteri').optional().or(z.literal('')),
  data_nascita: z.string().optional().or(z.literal('')),
  luogo_nascita: z.string().optional().or(z.literal('')),
  
  // Dati professionali
  territorio: z.string().optional().or(z.literal('ITA')),
  tipologia: z.string().optional().or(z.literal('')),
  stato: z.string().optional().or(z.literal('attivo')),
  data_inizio_mandato: z.string().optional().or(z.literal('')),
  data_fine_mandato: z.string().optional().or(z.literal('')),
  is_rasi: z.boolean().optional(),
  
  // Contatti (salvati come JSONB in 'contatti')
  email: z.string().email().optional().or(z.literal('')),
  telefono: z.string().optional().or(z.literal('')),
  
  // Indirizzo (salvato come JSONB in 'indirizzo')
  indirizzo_via: z.string().optional().or(z.literal('')),
  indirizzo_civico: z.string().optional().or(z.literal('')),
  indirizzo_cap: z.string().optional().or(z.literal('')),
  indirizzo_citta: z.string().optional().or(z.literal('')),
  indirizzo_provincia: z.string().optional().or(z.literal('')),
  
  // Dati aggiuntivi
  imdb_nconst: z.string().max(15).optional().or(z.literal('')),
  codici_esterni: z.record(z.any()).optional(),
  ragione_sociale: z.string().optional().or(z.literal('')),
  forma_giuridica: z.string().optional().or(z.literal('')),
  partita_iva: z.string().optional().or(z.literal('')), // bigint come stringa
  codice_paese: z.array(z.string()).optional(),
  componente_stabile_gruppo_orchestra: z.string().optional().or(z.literal('')),
  
  // Diritti attivi
  diritti_attivi: z.array(z.string()).optional(),
})

type ArtistaFormData = z.infer<typeof artistaSchema>

const STEPS = [
  { id: 1, title: 'Dati Anagrafici', description: 'Informazioni personali base' },
  { id: 2, title: 'Dati Professionali', description: 'Informazioni sulla carriera' },
  { id: 3, title: 'Contatti e Residenza', description: 'Informazioni di contatto e indirizzo' },
  { id: 4, title: 'Dati Aggiuntivi', description: 'Informazioni supplementari' },
  { id: 5, title: 'Diritti Attivi', description: 'Selezione diritti associati' },
  { id: 6, title: 'Riepilogo', description: 'Verifica e conferma' },
]

interface Diritto {
  codice: string
  nome: string
  descrizione: string
  categoria: string
}

interface Categoria {
  codice: string
  nome: string
  descrizione: string
}

interface Paese {
  codice: string
  nome: string
}

export function ArtistaFormMultistep({ mode, artista, onSubmit, onCancel }: ArtistaFormMultistepProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [dirittiData, setDirittiData] = useState<{ diritti: Diritto[], categorie: Categoria[] }>({ diritti: [], categorie: [] })
  const [codiciPaesiData, setCodiciPaesiData] = useState<{ paesi: Paese[] }>({ paesi: [] })

  useEffect(() => {
    // Carica i diritti dal file JSON
    loadDirittiData().then((data) => {
      setDirittiData(data)
    })
    // Carica i codici paesi dal file JSON
    loadCodiciPaesiData().then((data) => {
      setCodiciPaesiData(data)
    })
  }, [])

  const toDateInput = (s?: string | null) => {
    if (!s) return ''
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().split('T')[0]
  }

  const form = useForm<ArtistaFormData>({
    resolver: zodResolver(artistaSchema),
    mode: 'onChange',
    defaultValues: {
      codice_ipn: artista?.codice_ipn || '',
      nome: artista?.nome || '',
      cognome: artista?.cognome || '',
      nome_arte: artista?.nome_arte || '',
      codice_fiscale: artista?.codice_fiscale || '',
      data_nascita: toDateInput(artista?.data_nascita),
      luogo_nascita: artista?.luogo_nascita || '',
      territorio: artista?.territorio || 'ITA',
      tipologia: artista?.tipologia || '',
      stato: artista?.stato || 'attivo',
      data_inizio_mandato: toDateInput(artista?.data_inizio_mandato) || new Date().toISOString().split('T')[0],
      data_fine_mandato: toDateInput(artista?.data_fine_mandato) || '',
      is_rasi: artista?.is_rasi ?? true,
      email: (artista?.contatti as any)?.email || '',
      telefono: (artista?.contatti as any)?.number || (artista?.contatti as any)?.telefono || '',
      indirizzo_via: (artista?.indirizzo as any)?.via || '',
      indirizzo_civico: (artista?.indirizzo as any)?.civico || '',
      indirizzo_cap: (artista?.indirizzo as any)?.cap || '',
      indirizzo_citta: (artista?.indirizzo as any)?.citta || '',
      indirizzo_provincia: (artista?.indirizzo as any)?.provincia || '',
      imdb_nconst: artista?.imdb_nconst || '',
      codici_esterni: artista?.codici_esterni || {},
      ragione_sociale: artista?.ragione_sociale || '',
      forma_giuridica: artista?.forma_giuridica || '',
      partita_iva: artista?.partita_iva ? String(artista.partita_iva) : '',
      codice_paese: artista?.codice_paese ? artista.codice_paese.split('/').filter(Boolean) : [],
      componente_stabile_gruppo_orchestra: artista?.componente_stabile_gruppo_orchestra || '',
      diritti_attivi: [],
    },
  })

  // Converti i diritti da codici a nomi quando i dati sono caricati
  useEffect(() => {
    if (artista?.diritti_attivi && dirittiData.diritti.length > 0) {
      let dirittiArray: string[] = []
      
      if (Array.isArray(artista.diritti_attivi)) {
        // Se è già un array, potrebbe contenere codici o nomi
        dirittiArray = artista.diritti_attivi.map((item: string) => {
          // Verifica se è un codice
          const diritto = dirittiData.diritti.find(d => d.codice === item)
          if (diritto) {
            // È un codice, convertilo in nome
            return diritto.nome
          }
          // Verifica se è già un nome
          const dirittoPerNome = dirittiData.diritti.find(d => d.nome === item)
          return dirittoPerNome ? dirittoPerNome.nome : item
        })
      } else {
        // Se è un oggetto legacy, converti le chiavi (codici) in nomi
        dirittiArray = Object.keys(artista.diritti_attivi as Record<string, any>).map(codice => {
          const diritto = dirittiData.diritti.find(d => d.codice === codice)
          return diritto ? diritto.nome : codice
        })
      }
      
      form.setValue('diritti_attivi', dirittiArray)
    }
  }, [artista, dirittiData.diritti.length, form])

  // Reset data_fine_mandato quando lo stato cambia da "cessato" a altro
  const stato = form.watch('stato')
  useEffect(() => {
    if (stato !== 'cessato') {
      form.setValue('data_fine_mandato', '')
    }
  }, [stato, form])

  const handleNext = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fieldsToValidate as any)
    
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getFieldsForStep = (step: number): (keyof ArtistaFormData)[] => {
    switch (step) {
      case 1:
        return ['nome', 'cognome'] // Solo nome e cognome sono required
      case 2:
        return []
      case 3:
        return []
      case 4:
        return []
      case 5:
        return []
      default:
        return []
    }
  }

  const onFormSubmit = async (data: ArtistaFormData) => {
    // Costruisci il payload per Supabase - allineato con lo schema reale
    // Usiamo Partial<ArtistaInsert> perché alcuni campi sono opzionali nel form
    const payload = {
      codice_ipn: data.codice_ipn || null,
      nome: data.nome,
      cognome: data.cognome,
      nome_arte: data.nome_arte || null,
      codice_fiscale: data.codice_fiscale || null,
      data_nascita: data.data_nascita || null,
      luogo_nascita: data.luogo_nascita || null,
      territorio: data.territorio || 'ITA',
      tipologia: data.tipologia || null,
      stato: data.stato || 'attivo',
      data_inizio_mandato: data.data_inizio_mandato || new Date().toISOString().split('T')[0],
      data_fine_mandato: data.data_fine_mandato || null,
      is_rasi: data.is_rasi ?? true,
      contatti: {
        email: data.email || null,
        number: data.telefono || null,
      },
      indirizzo: (data.indirizzo_via || data.indirizzo_civico || data.indirizzo_cap || data.indirizzo_citta || data.indirizzo_provincia) ? {
        via: data.indirizzo_via || null,
        civico: data.indirizzo_civico || null,
        cap: data.indirizzo_cap || null,
        citta: data.indirizzo_citta || null,
        provincia: data.indirizzo_provincia || null,
      } : null,
      imdb_nconst: data.imdb_nconst || null,
      codici_esterni: data.codici_esterni || {},
      ragione_sociale: data.ragione_sociale || null,
      forma_giuridica: data.forma_giuridica || null,
      partita_iva: data.partita_iva ? Number(data.partita_iva) : null,
      codice_paese: data.codice_paese && data.codice_paese.length > 0 ? data.codice_paese.join('/') : null,
      componente_stabile_gruppo_orchestra: data.componente_stabile_gruppo_orchestra || null,
      diritti_attivi: (data.diritti_attivi && data.diritti_attivi.length > 0) ? data.diritti_attivi : null,
    } as ArtistaInsert

    await onSubmit(payload)
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        return renderStep3()
      case 4:
        return renderStep4()
      case 5:
        return renderStep5()
      case 6:
        return renderStep6()
      default:
        return null
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4 w-full">
      <FormField
        key="codice_ipn"
        control={form.control}
        name="codice_ipn"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Codice IPN</FormLabel>
            <FormControl>
              <Input {...field} value={field.value || ''} placeholder="IPN0001" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          key="nome"
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome *</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          key="cognome"
          control={form.control}
          name="cognome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cognome *</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          key="nome_arte"
          control={form.control}
          name="nome_arte"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome d&apos;Arte</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} placeholder="Nome artistico" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          key="codice_fiscale"
          control={form.control}
          name="codice_fiscale"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codice Fiscale</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} placeholder="RSSMRA80A01H501U" maxLength={16} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          key="data_nascita"
          control={form.control}
          name="data_nascita"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data di Nascita</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          key="luogo_nascita"
          control={form.control}
          name="luogo_nascita"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Luogo di Nascita</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} placeholder="Roma" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4 w-full">
      <FormField
        key="is_rasi"
        control={form.control}
        name="is_rasi"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Artista rappresentato da RASI</FormLabel>
              <FormDescription>
                Seleziona se l&apos;artista è rappresentato da RASI o è un artista esterno
              </FormDescription>
            </div>
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          key="stato"
          control={form.control}
          name="stato"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stato</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona stato" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="attivo">Attivo</SelectItem>
                  <SelectItem value="sospeso">Sospeso</SelectItem>
                  <SelectItem value="cessato">Cessato</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          key="tipologia"
          control={form.control}
          name="tipologia"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipologia</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipologia" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="AIE">AIE</SelectItem>
                  <SelectItem value="PRODUTTORE">Produttore</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          key="data_inizio_mandato"
          control={form.control}
          name="data_inizio_mandato"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Inizio Mandato</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          key="data_fine_mandato"
          control={form.control}
          name="data_fine_mandato"
          render={({ field }) => {
            const stato = form.watch('stato')
            const isDisabled = stato !== 'cessato'
            
            return (
              <FormItem>
                <FormLabel>Data Fine Mandato</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field} 
                    value={field.value || ''} 
                    disabled={isDisabled}
                    className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
      </div>
      <FormField
        key="imdb_nconst"
        control={form.control}
        name="imdb_nconst"
        render={({ field }) => (
          <FormItem>
            <FormLabel>IMDB nconst</FormLabel>
            <FormControl>
              <Input {...field} value={field.value || ''} placeholder="nm0000001" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4 w-full">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Contatti</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            key="email"
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} value={field.value || ''} placeholder="artista@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            key="telefono"
            control={form.control}
            name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefono</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} placeholder="+39 123 456 7890" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
      
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-semibold">Indirizzo di Residenza</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            key="indirizzo_via"
            control={form.control}
            name="indirizzo_via"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Via</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} placeholder="Via Roma" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            key="indirizzo_civico"
            control={form.control}
            name="indirizzo_civico"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Civico</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} placeholder="123" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            key="indirizzo_cap"
            control={form.control}
            name="indirizzo_cap"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CAP</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} placeholder="00100" maxLength={5} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            key="indirizzo_citta"
            control={form.control}
            name="indirizzo_citta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Città</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} placeholder="Roma" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            key="indirizzo_provincia"
            control={form.control}
            name="indirizzo_provincia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provincia</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} placeholder="RM" maxLength={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  )

  const renderStep4 = () => {
    const territorio = form.watch('territorio')
    const isCodiciPaesiEnabled = territorio === 'ITA+' || territorio === 'WW-'
    
    return (
    <div className="space-y-4 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          key="territorio"
          control={form.control}
          name="territorio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Territorio</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || 'ITA'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona territorio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ITA">Italia (ITA)</SelectItem>
                  <SelectItem value="ITA+">Italia+ (ITA+)</SelectItem>
                  <SelectItem value="WW">Mondo (WW)</SelectItem>
                  <SelectItem value="WW-">Mondo- (WW-)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          key="codice_paese"
          control={form.control}
          name="codice_paese"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={!isCodiciPaesiEnabled ? 'text-muted-foreground' : ''}>Codici Paesi</FormLabel>
              <FormControl>
                <CountryMultiSelect
                  options={codiciPaesiData.paesi}
                  selected={field.value || []}
                  onChange={isCodiciPaesiEnabled ? field.onChange : () => {}}
                  placeholder={isCodiciPaesiEnabled ? "Seleziona paesi..." : "Seleziona territorio..."}
                  disabled={!isCodiciPaesiEnabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          key="ragione_sociale"
          control={form.control}
          name="ragione_sociale"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ragione Sociale</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} placeholder="Per enti/aziende" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          key="forma_giuridica"
          control={form.control}
          name="forma_giuridica"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Forma Giuridica</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} placeholder="Es: SRL, SPA, Associazione" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        key="partita_iva"
        control={form.control}
        name="partita_iva"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Partita IVA</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                value={field.value || ''}
                placeholder="12345678901"
                maxLength={11}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        key="componente_stabile_gruppo_orchestra"
        control={form.control}
        name="componente_stabile_gruppo_orchestra"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Componente Stabile Gruppo/Orchestra</FormLabel>
            <FormControl>
              <Input {...field} value={field.value || ''} placeholder="Nome del gruppo o orchestra" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )}

  const renderStep5 = () => {
    const selectedDiritti = form.watch('diritti_attivi') || []
    
    // Raggruppa i diritti per categoria
    const dirittiPerCategoria = dirittiData.diritti.reduce((acc, diritto) => {
      const categoria = diritto.categoria || 'Altro'
      if (!acc[categoria]) {
        acc[categoria] = []
      }
      acc[categoria].push(diritto)
      return acc
    }, {} as Record<string, Diritto[]>)

    // Ottieni i nomi delle categorie
    const getCategoriaNome = (codice: string) => {
      const categoria = dirittiData.categorie.find(c => c.codice === codice)
      return categoria?.nome || codice
    }

    const handleToggleDiritto = (nome: string) => {
      const current = form.getValues('diritti_attivi') || []
      const allDirittiNome = 'ALL (Tutti i diritti)'
      const tuttiDirittiNomi = dirittiData.diritti.map(d => d.nome)
      
      if (nome === allDirittiNome) {
        // Gestione speciale per "ALL (Tutti i diritti)"
        if (current.includes(allDirittiNome)) {
          // Deseleziona "ALL" e tutti gli altri
          form.setValue('diritti_attivi', [])
        } else {
          // Seleziona "ALL" e tutti gli altri diritti
          form.setValue('diritti_attivi', tuttiDirittiNomi)
        }
      } else {
        // Gestione normale per gli altri diritti
        if (current.includes(nome)) {
          // Deseleziona il diritto
          const newDiritti = current.filter((n: string) => n !== nome)
          // Se "ALL" era selezionato, rimuovilo anche
          form.setValue('diritti_attivi', newDiritti.filter((n: string) => n !== allDirittiNome))
        } else {
          // Seleziona il diritto
          const newDiritti = [...current, nome]
          // Se "ALL" era selezionato, rimuovilo (perché ora non tutti sono selezionati)
          const dirittiSenzaAll = newDiritti.filter((n: string) => n !== allDirittiNome)
          // Verifica se ora tutti i diritti sono selezionati
          const tuttiSelezionati = tuttiDirittiNomi.every(n => dirittiSenzaAll.includes(n))
          if (tuttiSelezionati) {
            // Se tutti sono selezionati, aggiungi anche "ALL"
            form.setValue('diritti_attivi', [...dirittiSenzaAll, allDirittiNome])
          } else {
            form.setValue('diritti_attivi', dirittiSenzaAll)
          }
        }
      }
    }

    return (
      <div className="w-full h-full flex flex-col gap-2">
        {/* Lista scrollabile dei diritti */}
        <div className="border rounded-md flex-1 overflow-y-scroll min-h-0">
          {Object.entries(dirittiPerCategoria).map(([categoriaCodice, diritti]) => (
            <div key={categoriaCodice} className="border-b last:border-b-0">
              <div className="sticky top-0 bg-muted px-4 py-1.5 text-xs font-semibold text-foreground uppercase tracking-wide z-10 border-b">
                {getCategoriaNome(categoriaCodice)}
              </div>
              <div className="divide-y">
                {diritti.map((diritto) => (
                  <label
                    key={diritto.codice}
                    className="flex items-start gap-3 px-4 py-2 hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedDiritti.includes(diritto.nome)}
                      onCheckedChange={() => handleToggleDiritto(diritto.nome)}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{diritto.nome}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Contatore */}
        <div className="text-sm text-muted-foreground flex-shrink-0">
          {selectedDiritti.length} di {dirittiData.diritti.length} diritti selezionati
        </div>
      </div>
    )
  }

  const renderStep6 = () => {
    const formData = form.getValues()
    
    // Helper per verificare se un valore è valorizzato
    const hasValue = (val: any) => val !== undefined && val !== null && val !== ''
    
    // Dati anagrafici valorizzati
    const datiAnagrafici = [
      hasValue(formData.codice_ipn) && { label: 'Codice IPN', value: formData.codice_ipn },
      (hasValue(formData.nome) || hasValue(formData.cognome)) && { label: 'Nome', value: `${formData.nome || ''} ${formData.cognome || ''}`.trim() },
      hasValue(formData.nome_arte) && { label: "Nome d'Arte", value: formData.nome_arte },
      hasValue(formData.codice_fiscale) && { label: 'Codice Fiscale', value: formData.codice_fiscale },
      hasValue(formData.data_nascita) && { label: 'Data Nascita', value: formData.data_nascita },
      hasValue(formData.luogo_nascita) && { label: 'Luogo Nascita', value: formData.luogo_nascita },
    ].filter(Boolean) as { label: string; value: string }[]
    
    // Dati professionali valorizzati
    const datiProfessionali = [
      { label: 'Rappresentato da RASI', value: formData.is_rasi ? 'Sì' : 'No' },
      hasValue(formData.stato) && { label: 'Stato', value: formData.stato },
      hasValue(formData.tipologia) && { label: 'Tipologia', value: formData.tipologia },
      hasValue(formData.data_inizio_mandato) && { label: 'Data Inizio Mandato', value: formData.data_inizio_mandato },
      hasValue(formData.imdb_nconst) && { label: 'IMDB nconst', value: formData.imdb_nconst },
    ].filter(Boolean) as { label: string; value: string }[]
    
    // Contatti valorizzati
    const contatti = [
      hasValue(formData.email) && { label: 'Email', value: formData.email },
      hasValue(formData.telefono) && { label: 'Telefono', value: formData.telefono },
    ].filter(Boolean) as { label: string; value: string }[]
    
    // Dati aggiuntivi valorizzati
    const datiAggiuntivi = [
      hasValue(formData.territorio) && { label: 'Territorio', value: formData.territorio },
      formData.codice_paese && formData.codice_paese.length > 0 && { label: 'Codici Paesi', value: formData.codice_paese.join(', ') },
      hasValue(formData.ragione_sociale) && { label: 'Ragione Sociale', value: formData.ragione_sociale },
      hasValue(formData.forma_giuridica) && { label: 'Forma Giuridica', value: formData.forma_giuridica },
      hasValue(formData.partita_iva) && { label: 'Partita IVA', value: formData.partita_iva },
      hasValue(formData.componente_stabile_gruppo_orchestra) && { label: 'Componente Gruppo/Orchestra', value: formData.componente_stabile_gruppo_orchestra },
    ].filter(Boolean) as { label: string; value: string }[]
    
    return (
      <div className="w-full h-full flex flex-col">
        <div className="p-4 bg-muted rounded-md flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-3">
            {datiAnagrafici.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Dati Anagrafici</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  {datiAnagrafici.map((item) => (
                    <p key={item.label}><strong>{item.label}:</strong> {item.value}</p>
                  ))}
                </div>
              </div>
            )}

            {datiProfessionali.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Dati Professionali</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  {datiProfessionali.map((item) => (
                    <p key={item.label}><strong>{item.label}:</strong> {item.value}</p>
                  ))}
                </div>
              </div>
            )}

            {contatti.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Contatti</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  {contatti.map((item) => (
                    <p key={item.label}><strong>{item.label}:</strong> {item.value}</p>
                  ))}
                </div>
              </div>
            )}

            {datiAggiuntivi.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Dati Aggiuntivi</h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  {datiAggiuntivi.map((item) => (
                    <p key={item.label}><strong>{item.label}:</strong> {item.value}</p>
                  ))}
                </div>
              </div>
            )}

            {formData.diritti_attivi && formData.diritti_attivi.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Diritti Attivi ({formData.diritti_attivi.length})</h4>
                <div className="text-sm text-muted-foreground">
                  {formData.diritti_attivi.map((nome) => (
                    <div key={nome}>• {nome}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-3 w-full max-w-full overflow-x-hidden">
        {/* Step indicator - versione minimal */}
        <div className="mb-3 overflow-x-hidden">
          <div className="flex items-center gap-1.5">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors flex-shrink-0 ${
                    currentStep === step.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : currentStep > step.id
                      ? 'bg-primary/10 text-primary border-primary'
                      : 'bg-background border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <span className="text-[10px] font-semibold">{step.id}</span>
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px transition-colors ${
                      currentStep > step.id ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Titolo step corrente */}
        <div className="mb-3 pb-2 border-b">
          <h3 className="text-lg font-semibold">
            {STEPS.find(s => s.id === currentStep)?.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {STEPS.find(s => s.id === currentStep)?.description}
          </p>
        </div>

        {/* Step content */}
        <div className="h-[350px] flex flex-col overflow-hidden">
          {renderStepContent()}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between pt-2 border-t mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? onCancel : handlePrevious}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 ? 'Annulla' : 'Indietro'}
          </Button>
          
          {currentStep < STEPS.length ? (
            <Button type="button" onClick={handleNext}>
              Avanti
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="button" onClick={form.handleSubmit(onFormSubmit)}>
              {mode === 'create' ? 'Crea Artista' : 'Salva Modifiche'}
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}

