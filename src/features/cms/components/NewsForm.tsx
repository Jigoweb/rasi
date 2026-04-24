'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/shared/lib/supabase-client';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { useForm, Controller } from 'react-hook-form';

type NewsFormData = {
  title: string;
  slug: string;
  content: string;
  status: 'active' | 'closed';
  cover_image_url?: string;
  isPublished: boolean;
};

export function NewsForm({ initialData, isNew = false }: { initialData?: any; isNew?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, control, formState: { errors } } = useForm<NewsFormData>({
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      content: initialData?.content || '',
      status: initialData?.status || 'active',
      cover_image_url: initialData?.cover_image_url || '',
      isPublished: !!initialData?.published_at,
    },
  });

  const onSubmit = async (data: NewsFormData) => {
    setLoading(true);
    setError(null);

    const payload = {
      title: data.title,
      slug: data.slug,
      content: data.content,
      status: data.status,
      cover_image_url: data.cover_image_url,
      published_at: data.isPublished ? (initialData?.published_at || new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    };

    let supabaseError;

    if (isNew) {
      const { error: insertError } = await supabase.from('bandi_news').insert([payload]);
      supabaseError = insertError;
    } else {
      const { error: updateError } = await supabase.from('bandi_news').update(payload).eq('id', initialData.id);
      supabaseError = updateError;
    }

    setLoading(false);

    if (supabaseError) {
      setError(supabaseError.message);
    } else {
      router.push('/dashboard/cms/news');
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="title">Titolo</Label>
          <Input id="title" {...register('title', { required: 'Il titolo è obbligatorio' })} placeholder="Titolo della news o bando" />
          {errors.title && <span className="text-red-500 text-xs">{errors.title.message}</span>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input id="slug" {...register('slug', { required: 'Lo slug è obbligatorio' })} placeholder="es-titolo-news" />
          {errors.slug && <span className="text-red-500 text-xs">{errors.slug.message}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2 flex flex-col w-full">
          <Label htmlFor="status">Stato (Bando)</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Attivo (Aperto)</SelectItem>
                  <SelectItem value="closed">Chiuso (Archiviato)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover_image_url">Immagine di Copertina (URL)</Label>
          <Input id="cover_image_url" {...register('cover_image_url')} placeholder="https://..." />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Contenuto (HTML supportato)</Label>
        <Textarea 
          id="content" 
          {...register('content')} 
          className="min-h-[300px]"
          placeholder="<p>Testo della news...</p>"
        />
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
        <div className="space-y-0.5">
          <Label className="text-base">Stato Pubblicazione</Label>
          <p className="text-sm text-gray-500">
            Se attivato, il contenuto sarà visibile sul sito pubblico.
          </p>
        </div>
        <Controller
          control={control}
          name="isPublished"
          render={({ field }) => (
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.push('/dashboard/cms/news')} disabled={loading}>
          Annulla
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvataggio...' : (isNew ? 'Crea News' : 'Salva Modifiche')}
        </Button>
      </div>
    </form>
  );
}