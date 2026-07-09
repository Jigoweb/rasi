import { notFound } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase-server";
import { extractArticleHtml } from "@/shared/lib/html-content";

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

  const bodyHtml = extractArticleHtml(item.content || "");

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

      {bodyHtml ? (
        <div
          className="space-y-4 text-lg leading-relaxed text-rasi-slate [&_a]:text-rasi-ember [&_a]:underline [&_a]:underline-offset-2 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-rasi-ink [&_h2]:mt-8 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-rasi-ink [&_h3]:mt-6 [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:text-rasi-ink [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      ) : (
        <p className="text-lg text-rasi-slate">Contenuto in fase di redazione.</p>
      )}
    </article>
  );
}
