import { notFound } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase-server";

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: item } = await supabaseServer
    .from("bandi_news")
    .select("*")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .single();

  if (!item) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 font-schibsted md:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
            item.status === "closed" ? "bg-rasi-line text-rasi-slate" : "bg-rasi-ember/10 text-rasi-ember"
          }`}
        >
          {item.status === "closed" ? "Concluso" : "Attivo"}
        </span>
        <span className="text-sm text-rasi-slate">
          {item.published_at ? new Date(item.published_at).toLocaleDateString("it-IT") : ""}
        </span>
      </div>

      <h1 className="mb-8 text-4xl font-bold leading-tight tracking-tight text-rasi-ink md:text-5xl">
        {item.title}
      </h1>

      {item.cover_image_url ? (
        <div className="mb-10 overflow-hidden rounded-md border border-rasi-line">
          <img src={item.cover_image_url} alt="" className="h-auto w-full" />
        </div>
      ) : null}

      <div
        className="prose prose-lg max-w-none text-rasi-slate prose-headings:text-rasi-ink prose-a:text-rasi-ember"
        dangerouslySetInnerHTML={{ __html: item.content || "" }}
      />
    </article>
  );
}

