import { NextRequest, NextResponse } from 'next/server'
import { contentDisposition, requireCastManager } from '@/app/api/opere/cast-route'
import { buildOperaCastTemplate } from '@/features/opere/services/cast-import.server'
import { castTemplateFileName } from '@/features/opere/lib/cast-template'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCastManager(req)
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Opera non valida' }, { status: 400 })
  }

  const format = req.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'xlsx'
  const { data: opera, error } = await auth.client.from('opere').select('id, titolo').eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!opera) return NextResponse.json({ error: 'Opera non trovata' }, { status: 404 })

  try {
    const template = await buildOperaCastTemplate(auth.client, id, format)
    const filename = castTemplateFileName(opera.titolo, format)
    if (format === 'csv') {
      return new NextResponse(template.body as string, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': contentDisposition(filename),
        },
      })
    }
    const bytes = template.body as Buffer
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': contentDisposition(filename),
      },
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Errore durante la generazione del template'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
