'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/shared/lib/supabase-client';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useForm, Controller } from 'react-hook-form';

type DocumentFormData = {
  title: string;
  file_url: string;
  category: 'modulistica' | 'contratti' | 'norme' | 'allegati_bando';
  page_id: string;
};

export function DocumentForm({
  initialData,
  isNew = false,
  pagesOptions = [],
}: {
  initialData?: any;
  isNew?: boolean;
  pagesOptions?: { id: string; title: string; category: string; slug: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<DocumentFormData>({
    defaultValues: {
      title: initialData?.title || '',
      file_url: initialData?.file_url || '',
      category: initialData?.category || 'modulistica',
      page_id: initialData?.page_id || '',
    },
  });

  const onSubmit = async (data: DocumentFormData) => {
    setLoading(true);
    setError(null);

    const payload = {
      title: data.title,
      file_url: data.file_url,
      category: data.category,
      page_id: data.page_id || null,
    };

    let supabaseError;

    if (isNew) {
      const { error: insertError } = await supabase.from('documents').insert([payload]);
      supabaseError = insertError;
    } else {
      const { error: updateError } = await supabase.from('documents').update(payload).eq('id', initialData.id);
      supabaseError = updateError;
    }

    setLoading(false);

    if (supabaseError) {
      setError(supabaseError.message);
    } else {
      router.push('/dashboard/cms/documents');
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Titolo Documento</Label>
          <Input id="title" {...register('title', { required: 'Il titolo è obbligatorio' })} placeholder="Es. Statuto RASI 2024" />
          {errors.title && <span className="text-red-500 text-xs">{errors.title.message}</span>}
        </div>

        <div className="space-y-2 flex flex-col w-full">
          <Label htmlFor="page_id">Pagina Collegata (opzionale)</Label>
          <Controller
            control={control}
            name="page_id"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Nessuna pagina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nessuna</SelectItem>
                  {pagesOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title} ({p.category}/{p.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2 flex flex-col w-full">
          <Label htmlFor="category">Categoria</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modulistica">Modulistica</SelectItem>
                  <SelectItem value="contratti">Contratti</SelectItem>
                  <SelectItem value="norme">Norme</SelectItem>
                  <SelectItem value="allegati_bando">Allegati Bando</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="file">Carica file su Storage</Label>
          <Input
            id="file"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setUploading(true);
              setError(null);
              const path = `documents/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
              const { error: uploadError } = await supabase.storage.from("public-uploads").upload(path, file, {
                upsert: false,
              });
              if (uploadError) {
                setError(uploadError.message);
                setUploading(false);
                return;
              }
              const { data } = supabase.storage.from("public-uploads").getPublicUrl(path);
              setValue("file_url", data.publicUrl, { shouldValidate: true });
              setUploading(false);
            }}
          />
          <Label htmlFor="file_url">URL File / Allegato</Label>
          <Input id="file_url" {...register('file_url', { required: 'L\'URL del file è obbligatorio' })} placeholder="https://..." />
          {errors.file_url && <span className="text-red-500 text-xs">{errors.file_url.message}</span>}
          <p className="text-xs text-muted-foreground">
            Carica un file oppure incolla un URL (anche dai PDF WordPress).
            {uploading ? " Upload in corso…" : ""}
            {watch("file_url") ? ` File: ${watch("file_url")}` : ""}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-8">
        <Button type="button" variant="outline" onClick={() => router.push('/dashboard/cms/documents')} disabled={loading}>
          Annulla
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvataggio...' : (isNew ? 'Carica Documento' : 'Salva Modifiche')}
        </Button>
      </div>
    </form>
  );
}
