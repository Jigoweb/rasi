import Link from "next/link";
import { supabaseServer } from "@/shared/lib/supabase-server";

const documentCategories = new Set(["modulistica", "contratti", "norme", "allegati_bando"]);

export default async function CategoryIndexPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;

  const { data: pages } = await supabaseServer
    .from("pages")
    .select("id,title,slug,template_type")
    .eq("category", category)
    .eq("is_published", true)
    .order("title", { ascending: true });

  if (pages && pages.length > 0) {
    return (
      <section className="max-w-5xl mx-auto py-16 px-4 md:px-6">
        <div className="mb-10">
          <h1 className="font-poppins text-4xl md:text-5xl font-bold text-anthropic-dark mb-4 capitalize">{category.replaceAll("-", " ")}</h1>
          <p className="font-lora text-anthropic-mid-gray">Seleziona una pagina.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {pages.map((p) => (
            <Link
              key={p.id}
              href={`/${category}/${p.slug}`}
              className="rounded-3xl border border-anthropic-light-gray bg-anthropic-light-gray/10 p-8 hover:border-anthropic-orange transition-colors"
            >
              <div className="font-poppins text-xl font-semibold text-anthropic-dark mb-2">{p.title}</div>
              <div className="text-sm text-anthropic-mid-gray">{p.template_type}</div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  if (documentCategories.has(category)) {
    const { data: documents } = await supabaseServer
      .from("documents")
      .select("id,title,file_url,category,created_at")
      .eq("category", category)
      .order("created_at", { ascending: false });

    return (
      <section className="max-w-4xl mx-auto py-16 px-4 md:px-6">
        <div className="mb-10">
          <h1 className="font-poppins text-4xl md:text-5xl font-bold text-anthropic-dark mb-4 capitalize">{category.replaceAll("-", " ")}</h1>
          <p className="font-lora text-anthropic-mid-gray">Documenti disponibili per download.</p>
        </div>
        <div className="rounded-3xl border border-anthropic-light-gray bg-anthropic-light-gray/10 overflow-hidden">
          <ul className="divide-y divide-anthropic-light-gray">
            {documents && documents.length > 0 ? (
              documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <div className="font-poppins font-semibold text-anthropic-dark truncate">{doc.title}</div>
                    <div className="text-sm text-anthropic-mid-gray">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString("it-IT") : ""}
                    </div>
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

  return (
    <section className="max-w-3xl mx-auto py-16 px-4 md:px-6 text-center">
      <h1 className="font-poppins text-4xl font-bold text-anthropic-dark mb-4">Sezione in allestimento</h1>
      <p className="font-lora text-anthropic-mid-gray">La sezione “{category}” verrà popolata a breve.</p>
    </section>
  );
}

