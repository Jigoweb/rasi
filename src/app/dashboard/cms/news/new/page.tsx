import { NewsForm } from '@/features/cms/components/NewsForm';

export default function NewNewsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Nuova News / Bando</h2>
          <p className="text-muted-foreground">
            Crea una nuova comunicazione o un nuovo bando.
          </p>
        </div>
      </div>
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <NewsForm isNew={true} />
      </div>
    </div>
  );
}