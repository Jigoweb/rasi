'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { MODALITA_LABELS } from '../lib/ripartizione-display'
import { MODALITA, type Modalita } from '../lib/parametri'
import {
  listaEmittenti,
  listaIndividuazioniDisponibili,
  salvaCampagnaRipartizione,
  type EmittenteOpzione,
  type IndividuazioneDisponibile,
} from '../services/ripartizioni.service'

const AUTO = 'auto'

export interface CampagnaDaModificare {
  id: string
  nome: string
  emittenteId: string
  anno: number
  fondo: number
  modalita: Modalita | null
  sorgenti: string[]
  descrizione: string | null
}

function parseImporto(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.'))
}

/**
 * Nuova ripartizione (o modifica di una non ancora approvata): emittente, anno,
 * fondo, modalità e campagne di individuazione completate da includere.
 */
export function NuovaRipartizioneDialog({
  open,
  onOpenChange,
  onSaved,
  campagna,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (id: string) => void
  campagna?: CampagnaDaModificare | null
}) {
  const [emittenti, setEmittenti] = useState<EmittenteOpzione[]>([])
  const [emittenteId, setEmittenteId] = useState('')
  const [anno, setAnno] = useState(String(new Date().getFullYear() - 2))
  const [fondo, setFondo] = useState('')
  const [modalita, setModalita] = useState<string>(AUTO)
  const [nome, setNome] = useState('')
  const [disponibili, setDisponibili] = useState<IndividuazioneDisponibile[]>([])
  const [scelte, setScelte] = useState<Set<string>>(new Set())
  const [caricamento, setCaricamento] = useState(false)
  const [salvataggio, setSalvataggio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setErrore(null)
    if (campagna) {
      setEmittenteId(campagna.emittenteId)
      setAnno(String(campagna.anno))
      setFondo(String(campagna.fondo).replace('.', ','))
      setModalita(campagna.modalita ?? AUTO)
      setNome(campagna.nome)
      setScelte(new Set(campagna.sorgenti))
    } else {
      setEmittenteId('')
      setFondo('')
      setModalita(AUTO)
      setNome('')
      setScelte(new Set())
    }
    listaEmittenti().then(setEmittenti).catch((e) => setErrore(e.message ?? 'Emittenti non caricate'))
  }, [open, campagna])

  const annoNum = Number(anno)
  useEffect(() => {
    if (!open || !emittenteId || !Number.isInteger(annoNum)) {
      setDisponibili([])
      return
    }
    let attivo = true
    setCaricamento(true)
    listaIndividuazioniDisponibili(emittenteId, annoNum)
      .then((righe) => {
        if (!attivo) return
        setDisponibili(righe)
        if (!campagna) {
          // Proposta: tutte quelle non ancora incluse in un'altra ripartizione.
          setScelte(new Set(righe.filter((r) => !r.inclusaIn).map((r) => r.id)))
        }
      })
      .catch((e) => attivo && setErrore(e.message ?? 'Individuazioni non caricate'))
      .finally(() => attivo && setCaricamento(false))
    return () => {
      attivo = false
    }
  }, [open, emittenteId, annoNum, campagna])

  const emittente = emittenti.find((e) => e.id === emittenteId)
  useEffect(() => {
    if (!campagna && emittente && Number.isInteger(annoNum)) setNome(`${emittente.nome} ${annoNum}`)
  }, [campagna, emittente, annoNum])

  const fondoNum = parseImporto(fondo)
  const valido = useMemo(
    () => nome.trim() !== '' && !!emittenteId && Number.isInteger(annoNum) && fondoNum > 0 && scelte.size > 0,
    [nome, emittenteId, annoNum, fondoNum, scelte],
  )

  const toggle = (id: string, on: boolean) =>
    setScelte((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const salva = async () => {
    setSalvataggio(true)
    setErrore(null)
    try {
      const id = await salvaCampagnaRipartizione({
        id: campagna?.id ?? null,
        nome: nome.trim(),
        emittenteId,
        anno: annoNum,
        fondo: fondoNum,
        modalita: modalita === AUTO ? null : (modalita as Modalita),
        sorgenti: [...scelte],
        descrizione: campagna?.descrizione ?? null,
      })
      onSaved(id)
      onOpenChange(false)
    } catch (e: any) {
      setErrore(e?.message ?? 'Salvataggio non riuscito')
    } finally {
      setSalvataggio(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !salvataggio && onOpenChange(v)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{campagna ? 'Modifica ripartizione' : 'Nuova ripartizione'}</DialogTitle>
          <DialogDescription>
            Scegli emittente, anno e fondo da ripartire, poi le campagne di individuazione da includere. Ogni
            individuazione può entrare in una sola ripartizione.
            {campagna && ' Salvando, i risultati già calcolati vengono cancellati e vanno ricalcolati.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rip-emittente">Emittente</Label>
            <Select value={emittenteId} onValueChange={setEmittenteId}>
              <SelectTrigger id="rip-emittente" aria-label="Emittente">
                <SelectValue placeholder="Scegli l'emittente" />
              </SelectTrigger>
              <SelectContent>
                {emittenti.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rip-anno">Anno</Label>
            <Input id="rip-anno" inputMode="numeric" value={anno} onChange={(e) => setAnno(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rip-fondo">Fondo da ripartire (€)</Label>
            <Input id="rip-fondo" inputMode="decimal" placeholder="es. 20.000,00" value={fondo} onChange={(e) => setFondo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rip-modalita">Modalità</Label>
            <Select value={modalita} onValueChange={setModalita}>
              <SelectTrigger id="rip-modalita" aria-label="Modalità">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO}>Proposta dai dati</SelectItem>
                {MODALITA.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MODALITA_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="rip-nome">Nome</Label>
            <Input id="rip-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Campagne di individuazione completate</p>
          {!emittenteId ? (
            <p className="text-sm text-muted-foreground">Scegli prima emittente e anno.</p>
          ) : caricamento ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Caricamento…
            </p>
          ) : disponibili.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna individuazione completata per questa emittente e quest’anno.</p>
          ) : (
            <ul className="max-h-60 divide-y overflow-auto rounded-md border" aria-label="Campagne di individuazione">
              {disponibili.map((d) => {
                const altrove = d.inclusaIn && d.inclusaIn.id !== campagna?.id ? d.inclusaIn : null
                return (
                  <li key={d.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                    <Checkbox
                      id={`src-${d.id}`}
                      checked={scelte.has(d.id)}
                      disabled={!!altrove}
                      onCheckedChange={(v) => toggle(d.id, v === true)}
                      aria-label={d.nome}
                    />
                    <label htmlFor={`src-${d.id}`} className="flex-1">
                      <span className="font-medium">{d.nome}</span>
                      {d.individuazioni !== null && (
                        <span className="text-muted-foreground"> · {d.individuazioni.toLocaleString('it-IT')} individuazioni</span>
                      )}
                      {altrove && <span className="block text-amber-700">Già inclusa in «{altrove.nome}»</span>}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {errore && <p className="text-sm text-destructive">{errore}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvataggio}>
            Annulla
          </Button>
          <Button onClick={salva} disabled={!valido || salvataggio}>
            {salvataggio && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {campagna ? 'Salva modifiche' : 'Crea ripartizione'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
