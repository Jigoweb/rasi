import { supabaseServer } from '@/shared/lib/supabase-server';
import { PageForm } from '@/features/cms/components/PageForm';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const { data: page, error } = await supabaseServer
    .from('pages')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !page) {
    return <div>Errore: pagina non trovata.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Modifica Pagina</h2>
        <p className="text-muted-foreground">
          Modifica il contenuto, il template e lo stato di pubblicazione.
        </p>
      </div>

      <div className="bg-white rounded-md border p-6">
        <PageForm initialData={page} />
      </div>
    </div>
  );
}