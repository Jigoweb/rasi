import { notFound } from "next/navigation";
// import { createClient } from "@/shared/lib/supabase-server";

// Simula i template
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

  // MOCK: in produzione farà query a Supabase:
  // const supabase = createClient();
  // const { data } = await supabase.from('pages').select('*').eq('category', category).eq('slug', slug).single();
  
  // Simuliamo un db lookup
  const mockDb: Record<string, any> = {
    "chi-siamo/statuto": {
      title: "Statuto R.A.S.I.",
      template_type: "institutional",
      content: "<p>Il presente statuto regola le attività della Rete Artisti Spettacolo per l'Innovazione...</p><p>Articolo 1: Denominazione e Sede...</p>"
    },
    "servizi/award-system": {
      title: "Award System",
      template_type: "service",
      content: "<p>L'Award System è il nostro database informatico proprietario, regolarmente aggiornato, che ci permette di incrociare le opere con i titolari dei diritti connessi in modo trasparente e veloce.</p><ul><li>Massima trasparenza</li><li>Pagamenti trimestrali</li><li>Ricerca avanzata</li></ul>"
    }
  };

  const pageKey = `${category}/${slug}`;
  const pageData = mockDb[pageKey];

  if (!pageData) {
    // Se la pagina non esiste nel DB, restituiamo 404 (o renderizziamo una pagina placeholder temporanea)
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="font-poppins text-4xl font-bold text-anthropic-dark mb-4">Pagina in allestimento</h1>
        <p className="font-lora text-anthropic-mid-gray">La pagina /{category}/{slug} verrà migrata a breve nel nuovo sistema.</p>
      </div>
    );
  }

  // Rendering dinamico in base al template
  switch (pageData.template_type) {
    case "institutional":
      return <InstitutionalTemplate title={pageData.title} content={pageData.content} />;
    case "service":
      return <ServiceTemplate title={pageData.title} content={pageData.content} />;
    default:
      return <InstitutionalTemplate title={pageData.title} content={pageData.content} />;
  }
}