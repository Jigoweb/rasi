import { notFound } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase-server";

// Template components
function InstitutionalTemplate({ title, content }: { title: string; content: string }) {
  return (
    <article className="max-w-3xl mx-auto py-16 px-4 md:px-6">
      <h1 className="font-poppins text-4xl md:text-5xl font-bold text-anthropic-dark mb-8">{title}</h1>
      <div className="prose prose-lg prose-anthropic font-lora text-anthropic-dark/80" dangerouslySetInnerHTML={{ __html: content }} />
    </article>
  );
}

function ServiceTemplate({ title, content }: { title: string; content: string }) {
  return (
    <div className="py-16 px-4 md:px-6">
      <div className="container mx-auto">
        <h1 className="font-poppins text-4xl md:text-5xl font-bold text-anthropic-dark mb-12 text-center">{title}</h1>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="font-lora text-lg text-anthropic-dark/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
          <div className="bg-anthropic-light-gray/30 p-8 rounded-3xl">
            {/* Placeholder per elementi grafici del servizio */}
            <div className="aspect-video bg-anthropic-orange/10 rounded-2xl flex items-center justify-center">
              <span className="font-poppins text-anthropic-orange font-medium">Immagine o Infografica Servizio</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function DynamicPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;

  // Interroga il DB di Supabase tramite server client
  const { data: pageData, error } = await supabaseServer
    .from('pages')
    .select('*')
    .eq('category', category)
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !pageData) {
    // Pagina non trovata nel DB, mostriamo placeholder (o notFound())
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="font-poppins text-4xl font-bold text-anthropic-dark mb-4">Pagina in allestimento</h1>
        <p className="font-lora text-anthropic-mid-gray">La pagina /{category}/{slug} verrà migrata a breve nel nuovo sistema.</p>
        <p className="text-xs text-red-500 mt-4">Nota tecnica: {error?.message || 'Record non trovato'}</p>
      </div>
    );
  }

  // Rendering dinamico in base al template
  switch (pageData.template_type) {
    case "institutional":
      return <InstitutionalTemplate title={pageData.title} content={pageData.content || ''} />;
    case "service":
      return <ServiceTemplate title={pageData.title} content={pageData.content || ''} />;
    default:
      return <InstitutionalTemplate title={pageData.title} content={pageData.content || ''} />;
  }
}