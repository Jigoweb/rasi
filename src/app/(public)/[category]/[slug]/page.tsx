import { notFound } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase-server";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
    <section className="py-16 px-4 md:px-6 bg-[#f4f2eb]">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="font-poppins text-xs tracking-[0.3em] uppercase text-anthropic-mid-gray mb-3">
            Servizi agli artisti
          </p>
          <h1 className="font-poppins text-4xl md:text-5xl font-bold text-anthropic-dark mb-4">
            {title}
          </h1>
          <p className="font-lora text-base text-anthropic-mid-gray max-w-2xl">
            Scopri i servizi dedicati agli artisti e alle loro opere.
          </p>
        </header>
        <div className="rounded-3xl bg-anthropic-light p-8 md:p-10 shadow-sm border border-anthropic-light-gray/70">
          <div
            className="prose prose-lg prose-anthropic font-lora text-anthropic-dark/80"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </section>
  );
}

type FaqItem = {
  question: string;
  answer: string;
};

function FaqTemplate({ title, items }: { title: string; items: FaqItem[] }) {
  return (
    <section className="max-w-3xl mx-auto py-16 px-4 md:px-6">
      <h1 className="font-poppins text-4xl md:text-5xl font-bold text-anthropic-dark mb-8">{title}</h1>
      <Accordion type="single" collapsible className="w-full">
        {items.map((item, idx) => (
          <AccordionItem key={idx} value={`item-${idx}`}>
            <AccordionTrigger className="font-poppins text-base">{item.question}</AccordionTrigger>
            <AccordionContent>
              <div
                className="prose prose-lg prose-anthropic font-lora text-anthropic-dark/80"
                dangerouslySetInnerHTML={{ __html: item.answer }}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function DocumentListTemplate({
  title,
  content,
  documents,
}: {
  title: string;
  content: string;
  documents: { id: string; title: string; file_url: string; category: string }[];
}) {
  return (
    <section className="max-w-4xl mx-auto py-16 px-4 md:px-6">
      <h1 className="font-poppins text-4xl md:text-5xl font-bold text-anthropic-dark mb-6">{title}</h1>
      {content ? (
        <div className="prose prose-lg prose-anthropic font-lora text-anthropic-dark/80 mb-10" dangerouslySetInnerHTML={{ __html: content }} />
      ) : null}
      <div className="rounded-3xl border border-anthropic-light-gray bg-anthropic-light-gray/10 overflow-hidden">
        <ul className="divide-y divide-anthropic-light-gray">
          {documents.length > 0 ? (
            documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <div className="font-poppins font-semibold text-anthropic-dark truncate">{doc.title}</div>
                  <div className="text-sm text-anthropic-mid-gray">{doc.category}</div>
                </div>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-poppins text-sm text-anthropic-orange hover:underline whitespace-nowrap"
                >
                  Apri
                </a>
              </li>
            ))
          ) : (
            <li className="px-6 py-10 text-center text-anthropic-mid-gray">Nessun documento disponibile.</li>
          )}
        </ul>
      </div>
    </section>
  );
}

function BandoTemplate({
  title,
  content,
  attachments,
}: {
  title: string;
  content: string;
  attachments: { id: string; title: string; file_url: string }[];
}) {
  return (
    <section className="max-w-4xl mx-auto py-16 px-4 md:px-6">
      <div className="mb-8">
        <span className="inline-flex items-center rounded-full bg-anthropic-orange/10 px-3 py-1 text-xs font-poppins font-semibold uppercase tracking-wider text-anthropic-orange mb-4">
          Bando
        </span>
        <h1 className="font-poppins text-4xl md:text-5xl font-bold text-anthropic-dark mb-4">
          {title}
        </h1>
      </div>
      <div
        className="prose prose-lg prose-anthropic font-lora text-anthropic-dark/80 mb-10"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <div className="rounded-3xl border border-anthropic-light-gray bg-anthropic-light-gray/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-anthropic-light-gray bg-anthropic-light-gray/40">
          <h2 className="font-poppins text-sm font-semibold text-anthropic-dark tracking-wide uppercase">
            Allegati al bando
          </h2>
        </div>
        <ul className="divide-y divide-anthropic-light-gray">
          {attachments.length > 0 ? (
            attachments.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <div className="font-poppins text-sm font-semibold text-anthropic-dark truncate">
                    {doc.title}
                  </div>
                </div>
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-poppins text-xs text-anthropic-orange hover:underline whitespace-nowrap"
                >
                  Scarica
                </a>
              </li>
            ))
          ) : (
            <li className="px-6 py-6 text-sm text-center text-anthropic-mid-gray">
              Nessun allegato disponibile per questo bando.
            </li>
          )}
        </ul>
      </div>
    </section>
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
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="font-poppins text-4xl font-bold text-anthropic-dark mb-4">Pagina in allestimento</h1>
        <p className="font-lora text-anthropic-mid-gray">La pagina /{category}/{slug} verrà migrata a breve nel nuovo sistema.</p>
        <p className="text-xs text-red-500 mt-4">Nota tecnica: {error?.message || 'Record non trovato'}</p>
      </div>
    );
  }

  switch (pageData.template_type) {
    case "institutional":
      return <InstitutionalTemplate title={pageData.title} content={pageData.content || ''} />;
    case "service":
      return <ServiceTemplate title={pageData.title} content={pageData.content || ''} />;
    case "faq": {
      let items: FaqItem[] = [];
      try {
        const parsed = JSON.parse(pageData.content || "[]");
        if (Array.isArray(parsed)) {
          items = parsed
            .filter((x) => typeof x?.question === "string" && typeof x?.answer === "string")
            .map((x) => ({ question: x.question, answer: x.answer }));
        }
      } catch {}

      if (items.length === 0) {
        return <InstitutionalTemplate title={pageData.title} content={pageData.content || ''} />;
      }

      return <FaqTemplate title={pageData.title} items={items} />;
    }
    case "document_list": {
      const { data: documents } = await supabaseServer
        .from("documents")
        .select("id,title,file_url,category")
        .eq("page_id", pageData.id)
        .order("created_at", { ascending: false });

      return (
        <DocumentListTemplate
          title={pageData.title}
          content={pageData.content || ""}
          documents={documents || []}
        />
      );
    }
    case "bando": {
      const { data: attachments } = await supabaseServer
        .from("documents")
        .select("id,title,file_url,category,page_id")
        .eq("page_id", pageData.id)
        .eq("category", "allegati_bando")
        .order("created_at", { ascending: false });

      return (
        <BandoTemplate
          title={pageData.title}
          content={pageData.content || ""}
          attachments={(attachments || []).map((d) => ({
            id: d.id,
            title: d.title,
            file_url: d.file_url,
          }))}
        />
      );
    }
    default:
      return <InstitutionalTemplate title={pageData.title} content={pageData.content || ''} />;
  }
}
