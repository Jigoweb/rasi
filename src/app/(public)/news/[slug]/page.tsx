import { notFound } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase-server";
import { extractArticleParagraphs } from "@/shared/lib/html-content";

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

  const paragraphs = extractArticleParagraphs(item.content || "");

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 font-schibsted md:px-6">
      <h1 className="mb-8 text-4xl font-bold leading-tight tracking-tight text-rasi-ink md:text-5xl">
        {item.title}
      </h1>

      {item.cover_image_url ? (
        <div className="mb-10 overflow-hidden rounded-md border border-rasi-line">
          <img src={item.cover_image_url} alt="" className="h-auto w-full" />
        </div>
      ) : null}

      <div className="space-y-4 text-lg leading-relaxed text-rasi-slate">
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)
        ) : (
          <p>Contenuto in fase di redazione.</p>
        )}
      </div>
    </article>
  );
}
