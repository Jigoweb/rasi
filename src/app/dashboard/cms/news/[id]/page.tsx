import { supabaseServer } from '@/shared/lib/supabase-server';
import { notFound } from 'next/navigation';
import { NewsForm } from '@/features/cms/components/NewsForm';

export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: newsItem } = await supabaseServer
    .from('bandi_news')
    .select('*')
    .eq('id', id)
    .single();

  if (!newsItem) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Modifica News / Bando</h2>
          <p className="text-muted-foreground">
            Modifica le informazioni per: <strong>{newsItem.title}</strong>
          </p>
        </div>
      </div>
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <NewsForm initialData={newsItem} isNew={false} />
      </div>
    </div>
  );
}