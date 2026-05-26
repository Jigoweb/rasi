import { DocumentForm } from '@/features/cms/components/DocumentForm';
import { supabaseServer } from '@/shared/lib/supabase-server';

export default async function NewDocumentPage() {
  const { data: pages } = await supabaseServer
    .from('pages')
    .select('id,title,category,slug')
    .order('title', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nuovo Documento</h2>
          <p className="text-muted-foreground">
            Aggiungi un nuovo documento, modulo o normativa.
          </p>
        </div>
      </div>
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <DocumentForm isNew={true} pagesOptions={pages || []} />
      </div>
    </div>
  );
}
