import { NextRequest, NextResponse } from 'next/server'
import { requireCastManager, type CastRouteClient } from '@/app/api/opere/cast-route'
import { parseCastEdits } from '@/features/opere/lib/cast-import'
import { commitCastEdits, previewCastFile, revalidateCastEdits } from '@/features/opere/services/cast-import.server'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_BYTES = 2_000_000

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCastManager(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Opera non valida' }, { status: 400 })
  }

  const { data: opera, error: operaError } = await auth.client.from('opere').select('id').eq('id', id).maybeSingle()
  if (operaError) return NextResponse.json({ error: operaError.message }, { status: 500 })
  if (!opera) return NextResponse.json({ error: 'Opera non trovata' }, { status: 404 })

  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return handleEdits(req, auth.client, id)
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 })
  }

  const mode = form.get('mode')
  const file = form.get('file')
  if (mode !== 'preview') {
    return NextResponse.json({ error: 'Modalità non valida' }, { status: 400 })
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File mancante' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File troppo grande (massimo 2 MB)' }, { status: 400 })
  }

  try {
    const data = Buffer.from(await file.arrayBuffer())
    const result = await previewCastFile(auth.client, id, file.name, data)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({
      mode: 'preview',
      rows: result.rows,
      summary: result.summary,
      ruoli: result.ruoli,
    })
  } catch (cause) {
    return importError(cause)
  }
}

async function handleEdits(
  req: NextRequest,
  client: CastRouteClient,
  operaId: string,
) {
  let body: { mode?: unknown; rows?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 })
  }
  if (body.mode !== 'revalidate' && body.mode !== 'commit') {
    return NextResponse.json({ error: 'Modalità non valida' }, { status: 400 })
  }
  const edits = parseCastEdits(body.rows)
  if (!edits.ok) return NextResponse.json({ error: edits.error }, { status: 400 })

  try {
    const result = body.mode === 'revalidate'
      ? await revalidateCastEdits(client, operaId, edits.edits)
      : await commitCastEdits(client, operaId, edits.edits)
    return NextResponse.json({
      mode: body.mode,
      rows: result.rows,
      summary: result.summary,
      ruoli: result.ruoli,
    })
  } catch (cause) {
    return importError(cause)
  }
}

function importError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : 'Errore durante l\'import del cast'
  console.error('Import cast:', cause)
  return NextResponse.json({ error: message }, { status: 500 })
}
