import { supabaseServer } from "@/shared/lib/supabase-server";
import { InstitutionalPageView } from "@/features/cms/components/InstitutionalPageView";
import { PublicDocumentLayout } from "@/features/cms/components/PublicDocumentLayout";
import { resolvePublicDocuments } from "@/shared/lib/cms-content";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { extractInstitutionalHtml } from "@/shared/lib/cms-content";

type FaqItem = {
  question: string;
  answer: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  "chi-siamo": "Chi siamo",
  norme: "Norme e riferimenti",
  accordi: "Accordi",
  servizi: "Servizi",
};

export default async function DynamicPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = await params;

  const { data: pageData, error } = await supabaseServer
    .from("pages")
    .select("*")
    .eq("category", category)
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !pageData) {
    return (
      <PublicDocumentLayout
        title="Pagina in allestimento"
        eyebrow={CATEGORY_LABELS[category] ?? category}
        intro={`La pagina /${category}/${slug} verrà pubblicata a breve.`}
        backHref={category === "chi-siamo" ? "/chi-siamo" : `/${category}`}
        backLabel={category === "chi-siamo" ? "Chi siamo" : "Indietro"}
      />
    );
  }

  const eyebrow = CATEGORY_LABELS[category] ?? category.replaceAll("-", " ");
  const backHref = category === "chi-siamo" ? "/chi-siamo" : `/${category}`;
  const backLabel = category === "chi-siamo" ? "Chi siamo" : CATEGORY_LABELS[category] ?? "Indietro";

  switch (pageData.template_type) {
    case "institutional":
      return (
        <InstitutionalPageView
          category={category}
          slug={slug}
          title={pageData.title}
          content={pageData.content || ""}
          eyebrow={eyebrow}
          backHref={backHref}
          backLabel={backLabel}
          documentsHeading={category === "norme" ? "Testo normativo" : "Documenti"}
        />
      );

    case "service": {
      const bodyHtml = extractInstitutionalHtml(pageData.content || "");
      return (
        <PublicDocumentLayout
          title={pageData.title}
          eyebrow="Servizi agli artisti"
          intro="Scopri i servizi dedicati agli artisti e alle loro opere."
          backHref="/servizi"
          backLabel="Servizi"
        >
          {bodyHtml ? <div dangerouslySetInnerHTML={{ __html: bodyHtml }} /> : null}
        </PublicDocumentLayout>
      );
    }

    case "faq": {
      let items: FaqItem[] = [];
      try {
        const parsed = JSON.parse(pageData.content || "[]");
        if (Array.isArray(parsed)) {
          items = parsed
            .filter((x) => typeof x?.question === "string" && typeof x?.answer === "string")
            .map((x) => ({ question: x.question, answer: x.answer }));
        }
      } catch {
        // fallback sotto
      }

      if (items.length === 0) {
        return (
          <InstitutionalPageView
            category={category}
            slug={slug}
            title={pageData.title}
            content={pageData.content || ""}
            eyebrow={eyebrow}
            backHref={backHref}
            backLabel={backLabel}
          />
        );
      }

      return (
        <PublicDocumentLayout title={pageData.title} eyebrow={eyebrow} backHref={backHref} backLabel={backLabel}>
          <Accordion type="single" collapsible className="w-full not-prose">
            {items.map((item, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="border-rasi-line">
                <AccordionTrigger className="text-left font-semibold text-rasi-ink hover:text-rasi-ember">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>
                  <div
                    className="prose prose-sm max-w-none text-rasi-slate"
                    dangerouslySetInnerHTML={{ __html: extractInstitutionalHtml(item.answer) }}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </PublicDocumentLayout>
      );
    }

    case "document_list": {
      const { data: documents } = await supabaseServer
        .from("documents")
        .select("id,title,file_url,category")
        .eq("page_id", pageData.id)
        .order("created_at", { ascending: false });

      const resolved = resolvePublicDocuments({
        category,
        slug,
        content: pageData.content || "",
        linkedDocuments: (documents || []).map((d) => ({ title: d.title, file_url: d.file_url })),
      });

      const bodyHtml = extractInstitutionalHtml(pageData.content || "");

      return (
        <PublicDocumentLayout
          title={pageData.title}
          eyebrow={eyebrow}
          documents={resolved}
          backHref={backHref}
          backLabel={backLabel}
        >
          {bodyHtml ? <div dangerouslySetInnerHTML={{ __html: bodyHtml }} /> : null}
        </PublicDocumentLayout>
      );
    }

    case "bando": {
      const { data: attachments } = await supabaseServer
        .from("documents")
        .select("id,title,file_url,category,page_id")
        .eq("page_id", pageData.id)
        .eq("category", "allegati_bando")
        .order("created_at", { ascending: false });

      const resolved = resolvePublicDocuments({
        category,
        slug,
        content: pageData.content || "",
        linkedDocuments: (attachments || []).map((d) => ({ title: d.title, file_url: d.file_url })),
      });

      const bodyHtml = extractInstitutionalHtml(pageData.content || "");

      return (
        <PublicDocumentLayout
          title={pageData.title}
          eyebrow="Bando"
          documents={resolved}
          documentsHeading="Allegati al bando"
          backHref="/news"
          backLabel="Bandi e news"
        >
          {bodyHtml ? <div dangerouslySetInnerHTML={{ __html: bodyHtml }} /> : null}
        </PublicDocumentLayout>
      );
    }

    default:
      return (
        <InstitutionalPageView
          category={category}
          slug={slug}
          title={pageData.title}
          content={pageData.content || ""}
          eyebrow={eyebrow}
          backHref={backHref}
          backLabel={backLabel}
        />
      );
  }
}
