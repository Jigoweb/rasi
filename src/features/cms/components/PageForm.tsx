'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/shared/lib/supabase-client';
import { Save, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

export function PageForm({ initialData, isNew = false }: { initialData: any, isNew?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isPublished, setIsPublished] = useState(initialData.is_published || false);
  const [templateType, setTemplateType] = useState(initialData.template_type || 'institutional');

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title: initialData.title || '',
      category: initialData.category || '',
      slug: initialData.slug || '',
      content: initialData.content || '',
    }
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    
    const payload = {
      title: data.title,
      category: data.category,
      slug: data.slug,
      content: data.content,
      template_type: templateType,
      is_published: isPublished,
      updated_at: new Date().toISOString()
    };

    let error;

    if (isNew) {
      const { error: insertError } = await supabase
        .from('pages')
        .insert([payload]);
      error = insertError;
    } else {
      const { error: updateError } = await supabase
        .from('pages')
        .update(payload)
        .eq('id', initialData.id);
      error = updateError;
    }

    setLoading(false);

    if (error) {
      alert('Errore durante il salvataggio: ' + error.message);
    } else {
      router.push('/dashboard/cms/pages');
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="title">Titolo Pagina</Label>
          <Input 
            id="title" 
            {...register('title', { required: 'Il titolo è obbligatorio' })} 
          />
          {errors.title && <span className="text-sm text-red-500">{errors.title.message as string}</span>}
        </div>

        <div className="space-y-2 flex flex-col">
          <Label htmlFor="template_type">Template Layout</Label>
          <Select value={templateType} onValueChange={setTemplateType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleziona un template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="institutional">Istituzionale (Testi legali/Statuto)</SelectItem>
              <SelectItem value="service">Servizi (Icone/Card)</SelectItem>
              <SelectItem value="faq">FAQ (Accordion)</SelectItem>
              <SelectItem value="document_list">Elenco Documenti</SelectItem>
              <SelectItem value="bando">Bando (Contenuto + Allegati)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoria (Percorso principale)</Label>
          <Input 
            id="category" 
            placeholder="es. chi-siamo, norme"
            {...register('category', { required: 'La categoria è obbligatoria' })} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input 
            id="slug" 
            placeholder="es. statuto, servizi-artistici"
            {...register('slug', { required: 'Lo slug è obbligatorio' })} 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Contenuto (HTML / Rich Text)</Label>
        <p className="text-xs text-muted-foreground mb-2">Supporta tag HTML nativi: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;strong&gt;</p>
        <Textarea 
          id="content" 
          rows={15}
          className="font-mono text-sm"
          {...register('content')} 
        />
      </div>

      <div className="flex items-center space-x-2 border p-4 rounded-lg bg-gray-50">
        <Switch 
          id="publish-status" 
          checked={isPublished}
          onCheckedChange={setIsPublished}
        />
        <Label htmlFor="publish-status" className="font-semibold cursor-pointer">
          {isPublished ? 'Pagina Pubblicata e visibile' : 'Bozza (Nascosta al pubblico)'}
        </Label>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Annulla
        </Button>
        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Salvataggio in corso...' : 'Salva Modifiche'}
        </Button>
      </div>
    </form>
  );
}
