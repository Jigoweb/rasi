import { PageForm } from '@/features/cms/components/PageForm';

export default function NewPage() {
  const initialData = {
    title: '',
    category: '',
    slug: '',
    content: '',
    template_type: 'institutional',
    is_published: false
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Nuova Pagina</h2>
        <p className="text-muted-foreground">
          Crea una nuova pagina per il sito pubblico.
        </p>
      </div>

      <div className="bg-white rounded-md border p-6">
        <PageForm initialData={initialData} isNew={true} />
      </div>
    </div>
  );
}