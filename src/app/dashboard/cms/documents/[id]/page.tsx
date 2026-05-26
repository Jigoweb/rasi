import { supabaseServer } from '@/shared/lib/supabase-server';
import { notFound } from 'next/navigation';
import { DocumentForm } from '@/features/cms/components/DocumentForm';

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: documentItem } = await supabaseServer
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (!documentItem) {
    notFound();
  }

  const { data: pages } = await supabaseServer
    .from('pages')
    .select('id,title,category,slug')
    .order('title', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Modifica Documento</h2>
          <p className="text-muted-foreground">
            Modifica le informazioni per: <strong>{documentItem.title}</strong>
          </p>
        </div>
      </div>
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <DocumentForm initialData={documentItem} isNew={false} pagesOptions={pages || []} />
      </div>
    </div>
  );
}
